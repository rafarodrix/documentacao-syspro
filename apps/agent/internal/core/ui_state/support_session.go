package uistate

import "trilink/agent/internal/domain"

type ChatwootConfig struct {
	BaseURL      string
	WebsiteToken string
}

type SupportContext = domain.SupportContext
