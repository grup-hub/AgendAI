import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Rota temporária para adicionar coluna URGENTE à tabela COMPROMISSO
export async function POST() {
  const supabase = createSupabaseAdmin()

  try {
    // Adicionar coluna URGENTE (boolean, default false)
    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE "COMPROMISSO" ADD COLUMN IF NOT EXISTS "URGENTE" BOOLEAN DEFAULT FALSE;`
    })

    if (error) {
      // Tentar via query direta
      const { error: error2 } = await supabase.from('COMPROMISSO').select('URGENTE').limit(1)
      if (error2?.message?.includes('URGENTE')) {
        return NextResponse.json({ message: 'Coluna URGENTE não existe e não foi possível criar automaticamente. Execute no Supabase SQL Editor: ALTER TABLE "COMPROMISSO" ADD COLUMN IF NOT EXISTS "URGENTE" BOOLEAN DEFAULT FALSE;', error: error.message }, { status: 500 })
      }
      return NextResponse.json({ message: 'Coluna URGENTE já existe ou foi criada com sucesso' })
    }

    return NextResponse.json({ message: 'Coluna URGENTE adicionada com sucesso!' })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 })
  }
}
