package uiwails

import (
	"context"
	"io/fs"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"golang.org/x/sync/errgroup"
)

type serviceRunner interface {
	Run(ctx context.Context) error
}

func RunApp(ctx context.Context, service serviceRunner, host *Host, assets fs.FS, icon []byte) error {
	api := NewAPI(host.logger, host, host.ipc, host.supportProvider)
	_ = icon

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	g, ctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		defer host.Quit()
		return service.Run(ctx)
	})

	hostErr := wails.Run(&options.App{
		Title:             "Trilink Agent Setup",
		Width:             430,
		Height:            640,
		MinWidth:          400,
		MinHeight:         540,
		StartHidden:       true,
		HideWindowOnClose: true,
		DisableResize:     true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 242, G: 246, B: 250, A: 1},
		OnStartup: func(runtimeCtx context.Context) {
			host.Startup(runtimeCtx, api)
		},
		OnShutdown: func(runtimeCtx context.Context) {
			_ = runtimeCtx
			host.Shutdown()
			cancel()
		},
		Bind: []any{api},
	})
	cancel()

	if err := g.Wait(); err != nil {
		return err
	}
	if hostErr != nil {
		return hostErr
	}
	return nil
}
