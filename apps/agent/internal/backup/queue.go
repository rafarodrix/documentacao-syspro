package backup

import (
	"context"
	"errors"
	"log"
	"sync"
	"time"
)

type JobType string

const (
	JobTypeScheduled JobType = "scheduled"
	JobTypeManual    JobType = "manual"
	JobTypeRetry     JobType = "retry"
	JobTypeBoot      JobType = "boot"
)

type JobStatus string

const (
	JobStatusQueued    JobStatus = "queued"
	JobStatusRunning   JobStatus = "running"
	JobStatusSuccess   JobStatus = "success"
	JobStatusFailed    JobStatus = "failed"
	JobStatusRetryWait JobStatus = "retry_wait"
	JobStatusCanceled  JobStatus = "canceled"
)

type Job struct {
	ID          string
	Type        JobType
	Policy      BackupPolicy
	Status      JobStatus
	Attempts    int
	MaxAttempts int
	NextRunAt   time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
	LastError   string
}

type Queue struct {
	mu        sync.Mutex
	jobs      []*Job
	manager   *Manager
	reporter  *Reporter
	instance  string
	running   map[string]bool // chave por DatabasePath para evitar concorrência na mesma base
	stopCh    chan struct{}
	started   bool
	pollEvery time.Duration
}

func NewQueue(manager *Manager, reporter *Reporter, instanceID string) *Queue {
	return &Queue{
		manager:   manager,
		reporter:  reporter,
		instance:  instanceID,
		running:   make(map[string]bool),
		stopCh:    make(chan struct{}),
		pollEvery: 5 * time.Second,
	}
}

func (q *Queue) Enqueue(job *Job) error {
	if job == nil {
		return errors.New("job nil")
	}
	if job.Policy.ID == "" {
		return errors.New("policy id vazio")
	}
	if job.Policy.DatabasePath == "" {
		return errors.New("database path vazio")
	}

	q.mu.Lock()
	defer q.mu.Unlock()

	now := time.Now()
	if job.CreatedAt.IsZero() {
		job.CreatedAt = now
	}
	job.UpdatedAt = now
	if job.MaxAttempts <= 0 {
		job.MaxAttempts = 3
	}
	if job.Status == "" {
		job.Status = JobStatusQueued
	}
	if job.NextRunAt.IsZero() {
		job.NextRunAt = now
	}

	q.jobs = append(q.jobs, job)
	return nil
}

func (q *Queue) Start(ctx context.Context) {
	q.mu.Lock()
	if q.started {
		q.mu.Unlock()
		return
	}
	q.started = true
	q.mu.Unlock()

	ticker := time.NewTicker(q.pollEvery)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-q.stopCh:
			return
		case <-ticker.C:
			q.processAvailable(ctx)
		}
	}
}

func (q *Queue) Stop() {
	close(q.stopCh)
}

func (q *Queue) processAvailable(ctx context.Context) {
	q.mu.Lock()
	defer q.mu.Unlock()

	now := time.Now()

	for _, job := range q.jobs {
		if job == nil {
			continue
		}
		if job.Status == JobStatusSuccess || job.Status == JobStatusCanceled {
			continue
		}
		if now.Before(job.NextRunAt) {
			continue
		}

		dbKey := job.Policy.DatabasePath
		if q.running[dbKey] {
			continue
		}

		job.Status = JobStatusRunning
		job.UpdatedAt = now
		q.running[dbKey] = true

		go q.runJob(ctx, job, dbKey)
	}
}

func (q *Queue) runJob(ctx context.Context, job *Job, dbKey string) {
	defer func() {
		q.mu.Lock()
		delete(q.running, dbKey)
		q.mu.Unlock()
	}()

	result, err := q.manager.Run(ctx, job.Policy)

	q.mu.Lock()
	defer q.mu.Unlock()

	job.Attempts++
	job.UpdatedAt = time.Now()

	if err == nil {
		job.Status = JobStatusSuccess
		job.LastError = ""
	} else {
		job.LastError = err.Error()

		if job.Attempts >= job.MaxAttempts {
			job.Status = JobStatusFailed
		} else {
			job.Status = JobStatusRetryWait
			job.NextRunAt = time.Now().Add(backoff(job.Attempts))
		}
	}

	if q.reporter != nil {
		go func(res Result) {
			reportCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()

			if reportErr := q.reporter.SendBackupResult(reportCtx, q.instance, res); reportErr != nil {
				log.Printf("falha ao reportar backup task=%s: %v", res.TaskID, reportErr)
			}
		}(result)
	}
}

func backoff(attempt int) time.Duration {
	if attempt < 1 {
		return 10 * time.Second
	}

	d := 10 * time.Second
	for i := 1; i < attempt; i++ {
		d *= 2
		if d >= 10*time.Minute {
			return 10 * time.Minute
		}
	}
	return d
}