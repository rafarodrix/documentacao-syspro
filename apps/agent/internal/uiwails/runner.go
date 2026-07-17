package uiwails

import (
	"context"
	"io/fs"
	"sync"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"golang.org/x/sync/errgroup"
)

type serviceRunner interface {
	Run(ctx context.Context) error
}

const singleInstanceID = "6dc3f510-a231-4b92-962a-983791b161ed"

func RunApp(ctx context.Context, service serviceRunner, host *Host, assets fs.FS, icon []byte) error {
	api := NewAPI(host.logger, host, host.ipc, host.localState)
	_ = icon

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	g, ctx := errgroup.WithContext(ctx)
	var serviceStartOnce sync.Once
	startService := func() {
		serviceStartOnce.Do(func() {
			g.Go(func() error {
				defer host.Quit()
				return service.Run(ctx)
			})
		})
	}

	hostErr := wails.Run(buildAppOptions(host, api, assets, startService, cancel))
	cancel()

	if err := g.Wait(); err != nil {
		return err
	}
	if hostErr != nil {
		return hostErr
	}
	return nil
}

func buildAppOptions(
	host *Host,
	api *API,
	assets fs.FS,
	startService func(),
	cancel func(),
) *options.App {
	return &options.App{
		Title:             "Trilink Agent",
		Width:             430,
		Height:            640,
		MinWidth:          400,
		MinHeight:         540,
		StartHidden:       true,
		HideWindowOnClose: true,
		DisableResize:     true,
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId: singleInstanceID,
			OnSecondInstanceLaunch: func(secondInstanceData options.SecondInstanceData) {
				host.HandleSecondInstanceLaunch(secondInstanceData.Args, secondInstanceData.WorkingDirectory)
			},
		},
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 242, G: 246, B: 250, A: 1},
		OnStartup: func(runtimeCtx context.Context) {
			host.Startup(runtimeCtx, api)
			startService()
		},
		OnShutdown: func(runtimeCtx context.Context) {
			_ = runtimeCtx
			host.Shutdown()
			cancel()
		},
		Bind: []any{api},
	}
}
