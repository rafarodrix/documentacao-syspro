//go:build !windows

package remote

import "fmt"

type unsupportedNamedServiceController struct{}

func defaultNamedServiceController() namedServiceController {
	return unsupportedNamedServiceController{}
}

func (unsupportedNamedServiceController) Start(name string) error {
	return fmt.Errorf("service control only supported on Windows: %s", name)
}

func (unsupportedNamedServiceController) Stop(name string) error {
	return fmt.Errorf("service control only supported on Windows: %s", name)
}

func (unsupportedNamedServiceController) Restart(name string) error {
	return fmt.Errorf("service control only supported on Windows: %s", name)
}
