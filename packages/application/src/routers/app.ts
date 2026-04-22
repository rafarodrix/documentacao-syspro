import { mergeRouters } from "../router";
import { contractsRouter } from "./contracts";
import { remoteRouter } from "./remote";
import { settingsRouter } from "./settings";
import { taxRouter } from "./tax";
import { ticketsRouter } from "./tickets";

export const appRouter = mergeRouters({
  tickets: ticketsRouter,
  settings: settingsRouter,
  contracts: contractsRouter,
  tax: taxRouter,
  remote: remoteRouter,
});

export type AppRouter = typeof appRouter;
