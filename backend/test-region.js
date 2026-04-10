const { Client } = require('pg');
const dns = require('dns');

// Force IPv4 resolution
dns.setDefaultResultOrder('ipv4first');

const urls = [
  { label: 'direct-5432', url: 'postgresql://postgres:MinhaSenha123456789999@db.aobwawbezgggqcmfqopk.supabase.co:5432/postgres' },
  { label: 'direct-6543', url: 'postgresql://postgres:MinhaSenha123456789999@db.aobwawbezgggqcmfqopk.supabase.co:6543/postgres' },
];

async function test() {
  for (const { label, url } of urls) {
    console.log(`Testing ${label}...`);
    const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
    try {
      await client.connect();
      const res = await client.query('SELECT current_database() as db, current_user as usr');
      console.log(`  SUCCESS! db=${res.rows[0].db} user=${res.rows[0].usr}`);
      await client.end();
      return;
    } catch (e) {
      console.log(`  FAIL: ${e.message}`);
      try { await client.end(); } catch {}
    }
  }
}

test();
