package buildinfo

import "strings"

// Version is set by the release build with -ldflags. Development builds keep
// the configured runtime value so local environments do not pretend to be a
// published release.
var Version = "dev"

func RuntimeVersion(configured string) string {
	version := strings.TrimSpace(Version)
	if version != "" && !strings.EqualFold(version, "dev") {
		return version
	}

	return strings.TrimSpace(configured)
}
