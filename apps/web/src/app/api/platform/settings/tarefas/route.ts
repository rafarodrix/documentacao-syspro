import { createStaticProxyHandler } from "@/app/api/_shared/backend-proxy";

export const GET = createStaticProxyHandler("/settings/tarefas");
export const PUT = createStaticProxyHandler("/settings/tarefas");
