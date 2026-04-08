export {
  zammadTicketAPISchema as ticketApiSchema,
  zammadOperationalTicketSchema as operationalTicketSchema,
  zammadTicketDetailsSchema as ticketDetailsSchema,
  zammadTicketArticleSchema as ticketArticleSchema,
  zammadUserSearchSchema as ticketUserSearchSchema,
  zammadUserSchema as ticketUserSchema,
} from "./zammad-api";

export type {
  ZammadTicketAPI as TicketApi,
  ZammadOperationalTicket as OperationalTicket,
  ZammadTicketDetails as TicketDetails,
  ZammadTicketArticle as TicketArticle,
  ZammadUserSearch as TicketUserSearch,
  ZammadUser as TicketUser,
} from "./zammad-api";
