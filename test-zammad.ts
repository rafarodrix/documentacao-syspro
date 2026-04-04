import { ZammadGateway } from './apps/web/src/features/tickets/infrastructure/gateways/zammad-gateway';
import { zammadGlobalCatalogSchema } from '@dosc-syspro/contracts';

async function run() {
  try {
    const raw = await ZammadGateway.getGlobalCatalog();
    const res = zammadGlobalCatalogSchema.safeParse(raw);
    if (!res.success) {
      console.error(JSON.stringify(res.error.issues, null, 2));
    } else {
      console.log('success');
    }
  } catch(e) {
    console.error(e);
  }
}
run();
