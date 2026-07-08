export const DUE_SOON_DAYS = 7;
export const STALE_LEAD_DAYS = 7;

export type LeadAttentionState = {
  isClosed: boolean;
  isOverdue: boolean;
  isDueSoon: boolean;
  hasNextStep: boolean;
  isStale: boolean;
  daysWithoutUpdate: number;
  expectedDiffDays: number | null;
};

export function getLeadAttentionState(lead: {
  stage: string;
  expectedCloseAt?: Date | string | null;
  updatedAt: Date | string;
  nextStep?: string | null;
}): LeadAttentionState {
  const now = new Date();
  
  // Set start of day for comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const expectedCloseAt = lead.expectedCloseAt ? new Date(lead.expectedCloseAt) : null;
  const expectedCloseDate = expectedCloseAt 
    ? new Date(expectedCloseAt.getFullYear(), expectedCloseAt.getMonth(), expectedCloseAt.getDate())
    : null;
    
  const updatedAt = new Date(lead.updatedAt);
  const updatedDate = new Date(updatedAt.getFullYear(), updatedAt.getMonth(), updatedAt.getDate());

  const daysWithoutUpdate = Math.floor((today.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const expectedDiffDays = expectedCloseDate 
    ? Math.ceil((expectedCloseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isClosed = lead.stage === 'WON' || lead.stage === 'LOST';

  return {
    isClosed,
    isOverdue: Boolean(expectedCloseDate && expectedCloseDate < today && !isClosed),
    isDueSoon: Boolean(
      expectedDiffDays !== null &&
        expectedDiffDays >= 0 &&
        expectedDiffDays <= DUE_SOON_DAYS &&
        !isClosed,
    ),
    hasNextStep: Boolean(lead.nextStep?.trim()),
    isStale: daysWithoutUpdate >= STALE_LEAD_DAYS && !isClosed,
    daysWithoutUpdate,
    expectedDiffDays,
  };
}
