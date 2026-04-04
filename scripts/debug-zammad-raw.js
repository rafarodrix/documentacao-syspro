require('dotenv').config();
const { z } = require('zod');

async function debugZammad() {
  const headers = { Authorization: `Token token=${process.env.ZAMMAD_TOKEN}` };
  const baseUrl = process.env.ZAMMAD_URL + '/api/v1';

  try {
    const fetchZ = async (path) => {
      console.log('Fetching', path);
      const res = await fetch(`${baseUrl}/${path}`, { headers });
      if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
      return res.json();
    };

    const users = await fetchZ("users?per_page=200");
    
    // Simulate what normalizeCatalogOwners does
    const owners = users.map(row => {
      const id = typeof row.id === "number" ? row.id : Number(row.id);
      const firstname = typeof row.firstname === "string" ? row.firstname.trim() : "";
      const lastname = typeof row.lastname === "string" ? row.lastname.trim() : "";
      const fullname = typeof row.fullname === "string" ? row.fullname.trim() : "";
      const name = fullname || `${firstname} ${lastname}`.trim();
      const email = typeof row.email === "string" && row.email.trim() ? row.email.trim().toLowerCase() : null;
      const active = row.active === undefined ? true : Boolean(row.active);
      if (!active || !Number.isFinite(id) || id < 1 || !name) return null;
      return { id, name, email };
    }).filter(row => row !== null);

    const zammadCatalogOwnerSchema = z.object({
      id: z.coerce.number().int().min(1),
      name: z.string().trim().min(1),
      email: z.string().trim().email().optional().nullable(),
    });

    const ownersParsed = z.array(zammadCatalogOwnerSchema).safeParse(owners);
    if (!ownersParsed.success) {
      console.log('OWNERS FAILED:', JSON.stringify(ownersParsed.error.issues, null, 2));
      return;
    }

    console.log('ALL OK');

  } catch(e) {
    console.error(e);
  }
}

debugZammad();
