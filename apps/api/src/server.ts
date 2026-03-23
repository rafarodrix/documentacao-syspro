import { createServer } from "node:http";
import { handleApiRequest } from "./http.ts";

const port = Number(process.env.PORT || 4001);
const host = process.env.HOST || "0.0.0.0";

const server = createServer(async (req, res) => {
  const origin = `http://${host}:${port}`;
  const request = new Request(new URL(req.url || "/", origin), {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
    duplex: "half",
  });

  const response = await handleApiRequest(request);

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  const reader = response.body.getReader();
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    res.write(Buffer.from(chunk.value));
  }
  res.end();
});

server.listen(port, host, () => {
  console.log(`[apps/api] listening on http://${host}:${port}`);
});