package assets

import _ "embed"

//go:embed icon.ico
var IconICO []byte

//go:embed img/logo-clara.png
var LogoLightPNG []byte

//go:embed img/logo-escura.png
var LogoDarkPNG []byte

//go:embed ui/agent-setup.html
var AgentSetupHTML string

//go:embed ui/support-chatwoot.html
var SupportChatwootHTML string
