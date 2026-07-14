package remote

import (
	"errors"
	"strings"
	"time"

	infrahttp "trilink/agent/internal/infra/http"
)

const remoteRetryInterval = 45 * time.Second

var localStructuredErrorMessages = map[string]string{
	"DISCOVERY_TOKEN_NOT_CONFIGURED":         "remote discovery token not configured locally",
	"REMOTE_DISCOVER_CONTRACT_INCOMPLETE":    "portal returned an incomplete discover response",
	"REMOTE_DISCOVER_INSTALL_TOKEN_REQUIRED": "portal omitted installToken for bootstrap-required discover flow",
	"REMOTE_BOOTSTRAP_CONTRACT_INCOMPLETE":   "portal returned an incomplete bootstrap response",
	"REMOTE_SYNC_CONTRACT_INCOMPLETE":        "portal returned an incomplete sync response",
}

type remoteFailureInfo struct {
	Code       string
	Message    string
	HTTPStatus int
}

func classifyRemoteFailure(err error) remoteFailureInfo {
	if err == nil {
		return remoteFailureInfo{}
	}

	var contractErr *infrahttp.RemoteContractError
	if errors.As(err, &contractErr) {
		return remoteFailureInfo{
			Code:    strings.TrimSpace(contractErr.Code),
			Message: strings.TrimSpace(contractErr.Message),
		}
	}

	var statusErr *infrahttp.HTTPStatusError
	if errors.As(err, &statusErr) {
		return remoteFailureInfo{
			Code:       strings.TrimSpace(statusErr.Code),
			Message:    firstNonEmpty(strings.TrimSpace(statusErr.Message), err.Error()),
			HTTPStatus: statusErr.StatusCode,
		}
	}

	if message := strings.TrimSpace(err.Error()); message != "" {
		if mapped, ok := localStructuredErrorMessages[message]; ok {
			return remoteFailureInfo{
				Code:    message,
				Message: mapped,
			}
		}
	}

	return remoteFailureInfo{
		Code:    "REMOTE_UNEXPECTED_ERROR",
		Message: strings.TrimSpace(err.Error()),
	}
}

func shouldForceRebootstrap(info remoteFailureInfo) bool {
	switch strings.TrimSpace(info.Code) {
	case "AGENT_TOKEN_INVALID", "AGENT_TOKEN_EXPIRED", "HOST_AGENT_TOKEN_NOT_ACTIVE":
		return true
	}
	return info.HTTPStatus == 401
}
