type DocsFeedbackInput = {
  slug: string;
  title: string;
  helpful: boolean;
  reason: string | null;
  votedAt: string;
};

function normalizeDocsFeedback(body: unknown): DocsFeedbackInput {
  if (!body || typeof body !== "object") {
    throw new Error("Payload invalido.");
  }

  const payload = body as {
    slug?: unknown;
    title?: unknown;
    helpful?: unknown;
    reason?: unknown;
    votedAt?: unknown;
  };

  return {
    slug: typeof payload.slug === "string" ? payload.slug : "",
    title: typeof payload.title === "string" ? payload.title : "",
    helpful: Boolean(payload.helpful),
    reason: typeof payload.reason === "string" ? payload.reason : null,
    votedAt: typeof payload.votedAt === "string" ? payload.votedAt : new Date().toISOString(),
  };
}

import { trpc } from "@/lib/api/trpc-client";

export async function submitDocsFeedback(request: Request) {
  const body = await request.json();
  const feedback = normalizeDocsFeedback(body);

  await trpc.docs.submitFeedback.mutate(feedback);
  return { ok: true as const };
}
