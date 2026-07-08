export {
  CRM_ACTIVE_STAGE_ORDER,
  CRM_CLOSED_STAGE_ORDER,
  CRM_STAGE_ORDER,
  CRM_STAGE_LABELS,
  CRM_STAGE_DESCRIPTIONS,
  CRM_SOURCE_LABELS,
} from './crm-stage';
export { leadInclude, serializeLead, normalizeContactsArray } from './crm-contract.mapper';
export { getLeadAttentionState, DUE_SOON_DAYS, STALE_LEAD_DAYS, type LeadAttentionState } from './crm-attention';

