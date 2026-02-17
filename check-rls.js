import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function check() {
  const policies = await sql`
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'COMPARTILHAMENTO_AGENDA'
  `;

  console.log('=== Policies COMPARTILHAMENTO_AGENDA ===');
  policies.forEach(p => {
    console.log('---');
    console.log('Policy:', p.policyname);
    console.log('Cmd:', p.cmd);
    console.log('USING:', p.qual);
  });

  const rls = await sql`
    SELECT relname, relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE relname IN ('AGENDA', 'COMPROMISSO', 'COMPARTILHAMENTO_AGENDA', 'USUARIO')
  `;

  console.log('\n=== RLS Status ===');
  rls.forEach(r => console.log(r.relname, '| RLS:', r.relrowsecurity, '| Force:', r.relforcerowsecurity));

  await sql.end();
  process.exit(0);
}
check();
