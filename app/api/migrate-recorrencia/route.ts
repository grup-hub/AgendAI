import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = createSupabaseAdmin()

  const sqls = [
    // Lembrete configurável na tabela COMPROMISSO
    `ALTER TABLE "COMPROMISSO" ADD COLUMN IF NOT EXISTS "ANTECEDENCIA_LEMBRETE_MINUTOS" INTEGER DEFAULT 30;`,

    // Recorrência
    `ALTER TABLE "COMPROMISSO" ADD COLUMN IF NOT EXISTS "RECORRENCIA_TIPO" TEXT DEFAULT NULL;`,
    `ALTER TABLE "COMPROMISSO" ADD COLUMN IF NOT EXISTS "RECORRENCIA_INTERVALO" INTEGER DEFAULT NULL;`,
    `ALTER TABLE "COMPROMISSO" ADD COLUMN IF NOT EXISTS "RECORRENCIA_DIAS_SEMANA" TEXT DEFAULT NULL;`,
    `ALTER TABLE "COMPROMISSO" ADD COLUMN IF NOT EXISTS "RECORRENCIA_FIM" DATE DEFAULT NULL;`,
    `ALTER TABLE "COMPROMISSO" ADD COLUMN IF NOT EXISTS "ID_COMPROMISSO_ORIGEM" UUID DEFAULT NULL;`,
  ]

  const resultados: string[] = []

  for (const sql of sqls) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        resultados.push(`ERRO: ${sql.substring(0, 60)}... — ${error.message}`)
      } else {
        resultados.push(`OK: ${sql.substring(0, 60)}...`)
      }
    } catch (err: any) {
      resultados.push(`EXCEÇÃO: ${sql.substring(0, 60)}... — ${err.message}`)
    }
  }

  return NextResponse.json({ resultados })
}
