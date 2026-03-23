export const MOBILE_ROUTES = {
  home: "Home",
  tickets: "Tickets",
  ticketDetails: "TicketDetails",
  releases: "Releases",
  settings: "Settings",
} as const;

export type MobileRouteName = (typeof MOBILE_ROUTES)[keyof typeof MOBILE_ROUTES];

export type MobileRouteParams = {
  Home: undefined;
  Tickets: { queue?: string; status?: string } | undefined;
  TicketDetails: { ticketId: string };
  Releases: { year?: string; month?: string } | undefined;
  Settings: undefined;
};