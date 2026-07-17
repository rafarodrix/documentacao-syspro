package agentui

const (
	ProtocolVersion       = "agent-ui.v1"
	ProtocolVersionHeader = "X-Trilink-Agent-IPC-Version"
)

type ProtocolInfo struct {
	Version string `json:"version"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

type SupportContextSyncRequest struct {
	ConversationID string `json:"conversationId"`
}
