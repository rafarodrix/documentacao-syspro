type HeaderReader = {
  get(name: string): string | null
}

export function resolveServerOrigin(headers: HeaderReader): string {
  const forwardedProto = headers.get("x-forwarded-proto")
  const forwardedHost = headers.get("x-forwarded-host")
  const host = forwardedHost || headers.get("host")

  if (host) {
    const protocol = forwardedProto || "http"
    return `${protocol}://${host}`.replace(/\/+$/, "")
  }

  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_WEB_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, "")

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`

  return "http://localhost:3000"
}

