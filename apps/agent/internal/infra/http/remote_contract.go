package http

import (
	"fmt"
	"strings"

	"trilink/agent/internal/domain"
)

type RemoteContractError struct {
	Procedure string
	Code      string
	Message   string
	Expected  string
	Received  string
}

func (e *RemoteContractError) Error() string {
	return e.Message
}

func validateDiscoverResponse(resp *domain.RemoteDiscoverResponse) error {
	if resp == nil {
		return &RemoteContractError{
			Procedure: "discover",
			Code:      "REMOTE_DISCOVER_CONTRACT_INCOMPLETE",
			Message:   "portal returned an empty discover response",
		}
	}

	if strings.TrimSpace(resp.ContractVersion) != domain.RemoteDiscoverContractVersion {
		return &RemoteContractError{
			Procedure: "discover",
			Code:      "REMOTE_DISCOVER_CONTRACT_VERSION_INVALID",
			Message:   fmt.Sprintf("portal returned unsupported discover contract version %q", strings.TrimSpace(resp.ContractVersion)),
			Expected:  domain.RemoteDiscoverContractVersion,
			Received:  strings.TrimSpace(resp.ContractVersion),
		}
	}

	switch resp.BootstrapFlow {
	case domain.RemoteBootstrapFlowPendingLink, domain.RemoteBootstrapFlowLinkedHostDetected:
		if strings.TrimSpace(resp.InstallToken) != "" {
			return &RemoteContractError{
				Procedure: "discover",
				Code:      "REMOTE_DISCOVER_INSTALL_TOKEN_UNEXPECTED",
				Message:   fmt.Sprintf("portal returned installToken for discover flow %q that must not expose bootstrap credentials", resp.BootstrapFlow),
			}
		}
	case domain.RemoteBootstrapFlowHostBootstrapRequired, domain.RemoteBootstrapFlowTokenInvalid:
		if strings.TrimSpace(resp.InstallToken) == "" {
			return &RemoteContractError{
				Procedure: "discover",
				Code:      "REMOTE_DISCOVER_INSTALL_TOKEN_REQUIRED",
				Message:   fmt.Sprintf("portal omitted installToken for discover flow %q that requires authenticated bootstrap", resp.BootstrapFlow),
			}
		}
	default:
		return &RemoteContractError{
			Procedure: "discover",
			Code:      "REMOTE_DISCOVER_BOOTSTRAP_FLOW_INVALID",
			Message:   fmt.Sprintf("portal returned unsupported discover bootstrap flow %q", strings.TrimSpace(string(resp.BootstrapFlow))),
			Received:  strings.TrimSpace(string(resp.BootstrapFlow)),
		}
	}

	return nil
}

func validateBootstrapResponse(resp *domain.RemoteBootstrapResponse) error {
	if resp == nil {
		return &RemoteContractError{
			Procedure: "bootstrap",
			Code:      "REMOTE_BOOTSTRAP_CONTRACT_INCOMPLETE",
			Message:   "portal returned an empty bootstrap response",
		}
	}

	if strings.TrimSpace(resp.ContractVersion) != domain.RemoteBootstrapContractVersion {
		return &RemoteContractError{
			Procedure: "bootstrap",
			Code:      "REMOTE_BOOTSTRAP_CONTRACT_VERSION_INVALID",
			Message:   fmt.Sprintf("portal returned unsupported bootstrap contract version %q", strings.TrimSpace(resp.ContractVersion)),
			Expected:  domain.RemoteBootstrapContractVersion,
			Received:  strings.TrimSpace(resp.ContractVersion),
		}
	}

	if strings.TrimSpace(resp.AgentToken) == "" || strings.TrimSpace(resp.HostID) == "" {
		return &RemoteContractError{
			Procedure: "bootstrap",
			Code:      "REMOTE_BOOTSTRAP_CONTRACT_INCOMPLETE",
			Message:   "portal returned an incomplete bootstrap response",
		}
	}

	return nil
}

func validateSyncResponse(resp *domain.RemoteSyncResponse) error {
	if resp == nil {
		return &RemoteContractError{
			Procedure: "sync",
			Code:      "REMOTE_SYNC_CONTRACT_INCOMPLETE",
			Message:   "portal returned an empty sync response",
		}
	}

	if strings.TrimSpace(resp.ContractVersion) != domain.RemoteSyncContractVersion {
		return &RemoteContractError{
			Procedure: "sync",
			Code:      "REMOTE_SYNC_CONTRACT_VERSION_INVALID",
			Message:   fmt.Sprintf("portal returned unsupported sync contract version %q", strings.TrimSpace(resp.ContractVersion)),
			Expected:  domain.RemoteSyncContractVersion,
			Received:  strings.TrimSpace(resp.ContractVersion),
		}
	}

	if strings.TrimSpace(resp.HostID) == "" {
		return &RemoteContractError{
			Procedure: "sync",
			Code:      "REMOTE_SYNC_CONTRACT_INCOMPLETE",
			Message:   "portal returned an incomplete sync response",
		}
	}

	return nil
}
