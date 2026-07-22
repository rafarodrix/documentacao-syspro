import { describe, expect, it } from 'vitest';
import { serializeLead } from '@dosc-syspro/crm-domain';

describe('serializeLead', () => {
  it('keeps the lead response compatible with the CRM contract when details are loaded separately', () => {
    const lead = serializeLead({
      id: 'lead-1',
      title: 'Empresa exemplo',
      stage: 'LEAD',
      source: 'MANUAL',
      companyName: 'Empresa exemplo LTDA',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(lead.activities).toEqual([]);
    expect(lead.tasks).toEqual([]);
  });
});
