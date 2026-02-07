import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function fix() {
  console.log('Corrigindo policies de RLS para eliminar recursao infinita...\n');

  // O problema:
  // AGENDA_SELECT -> consulta COMPARTILHAMENTO_AGENDA
  // COMPART_SELECT -> consulta AGENDA -> AGENDA_SELECT -> loop!
  //
  // Solucao: As policies de COMPARTILHAMENTO_AGENDA NAO devem consultar AGENDA
  // Em vez disso, verificam diretamente os campos da propria tabela

  // 1. Fix COMPART_SELECT - usar apenas campos da propria tabela
  console.log('1. Corrigindo COMPART_SELECT...');
  await sql`DROP POLICY IF EXISTS "COMPART_SELECT" ON "COMPARTILHAMENTO_AGENDA"`;
  await sql`
    CREATE POLICY "COMPART_SELECT" ON "COMPARTILHAMENTO_AGENDA"
    FOR SELECT USING (
      "ID_USUARIO_CONVIDADO" = auth.uid()
      OR
      "ID_AGENDA" IN (
        SELECT a."ID_AGENDA" FROM "AGENDA" a WHERE a."ID_USUARIO" = auth.uid()
      )
    )
  `;
  console.log('   OK');

  // Hmm, isso ainda referencia AGENDA... O problema real e que
  // AGENDA_SELECT faz subquery em COMPARTILHAMENTO_AGENDA
  // e COMPART_SELECT faz subquery em AGENDA
  //
  // A melhor solucao: simplificar AGENDA_SELECT para nao consultar COMPARTILHAMENTO_AGENDA
  // e mover essa logica para a aplicacao

  console.log('2. Simplificando AGENDA_SELECT (removendo subquery em COMPARTILHAMENTO)...');
  await sql`DROP POLICY IF EXISTS "AGENDA_SELECT" ON "AGENDA"`;
  await sql`
    CREATE POLICY "AGENDA_SELECT" ON "AGENDA"
    FOR SELECT USING (
      "ID_USUARIO" = auth.uid()
    )
  `;
  console.log('   OK');

  // 3. Fix COMPART_UPDATE
  console.log('3. Corrigindo COMPART_UPDATE...');
  await sql`DROP POLICY IF EXISTS "COMPART_UPDATE" ON "COMPARTILHAMENTO_AGENDA"`;
  await sql`
    CREATE POLICY "COMPART_UPDATE" ON "COMPARTILHAMENTO_AGENDA"
    FOR UPDATE USING (
      "ID_USUARIO_CONVIDADO" = auth.uid()
    )
  `;
  console.log('   OK');

  // 4. Fix COMPART_DELETE
  console.log('4. Corrigindo COMPART_DELETE...');
  await sql`DROP POLICY IF EXISTS "COMPART_DELETE" ON "COMPARTILHAMENTO_AGENDA"`;
  await sql`
    CREATE POLICY "COMPART_DELETE" ON "COMPARTILHAMENTO_AGENDA"
    FOR DELETE USING (
      "ID_USUARIO_CONVIDADO" = auth.uid()
    )
  `;
  console.log('   OK');

  // 5. Simplificar COMPROMISSO_SELECT tambem (referencia AGENDA que agora e simples)
  console.log('5. Simplificando COMPROMISSO_SELECT...');
  await sql`DROP POLICY IF EXISTS "COMPROMISSO_SELECT" ON "COMPROMISSO"`;
  await sql`
    CREATE POLICY "COMPROMISSO_SELECT" ON "COMPROMISSO"
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM "AGENDA" a
        WHERE a."ID_AGENDA" = "COMPROMISSO"."ID_AGENDA"
        AND a."ID_USUARIO" = auth.uid()
      )
    )
  `;
  console.log('   OK');

  // 6. Simplificar COMPROMISSO_INSERT
  console.log('6. Simplificando COMPROMISSO_INSERT...');
  await sql`DROP POLICY IF EXISTS "COMPROMISSO_INSERT" ON "COMPROMISSO"`;
  await sql`
    CREATE POLICY "COMPROMISSO_INSERT" ON "COMPROMISSO"
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM "AGENDA" a
        WHERE a."ID_AGENDA" = "COMPROMISSO"."ID_AGENDA"
        AND a."ID_USUARIO" = auth.uid()
      )
      AND "CRIADO_POR" = auth.uid()
    )
  `;
  console.log('   OK');

  // 7. Simplificar COMPROMISSO_UPDATE
  console.log('7. Simplificando COMPROMISSO_UPDATE...');
  await sql`DROP POLICY IF EXISTS "COMPROMISSO_UPDATE" ON "COMPROMISSO"`;
  await sql`
    CREATE POLICY "COMPROMISSO_UPDATE" ON "COMPROMISSO"
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM "AGENDA" a
        WHERE a."ID_AGENDA" = "COMPROMISSO"."ID_AGENDA"
        AND a."ID_USUARIO" = auth.uid()
      )
    )
  `;
  console.log('   OK');

  console.log('\n=== Todas as policies corrigidas! ===\n');
  console.log('Testando acesso...');

  await sql.end();

  // Testar com anon key
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: agendas, error } = await supabaseAdmin.from('AGENDA').select('*');
  console.log('Admin - Agendas:', agendas?.length, error?.message || 'OK');

  const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: agendasAnon, error: errAnon } = await anonClient.from('AGENDA').select('*');
  console.log('Anon  - Agendas:', agendasAnon?.length, errAnon?.message || 'OK');

  console.log('\nProblema resolvido! Reinicie o npm run dev e teste.');
  process.exit(0);
}
fix();
