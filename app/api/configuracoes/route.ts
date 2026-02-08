import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { normalizePhone, isValidWhatsAppPhone } from '@/lib/whatsapp/phone'

export const dynamic = 'force-dynamic'

/**
 * GET - Buscar configurações do usuário
 */
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const supabaseAdmin = createSupabaseAdmin()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  // Buscar dados do usuário
  const { data: usuario } = await supabaseAdmin
    .from('USUARIO')
    .select('ID_USUARIO, NOME, EMAIL, TELEFONE, PLANO')
    .eq('ID_USUARIO', user.id)
    .single()

  if (!usuario) {
    return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
  }

  // Verificar se WhatsApp está ativado
  const { data: dispositivo } = await supabaseAdmin
    .from('DISPOSITIVO_PUSH')
    .select('ID_DISPOSITIVO, ATIVO, TOKEN_PUSH')
    .eq('ID_USUARIO', user.id)
    .eq('PROVIDER', 'WHATSAPP')
    .single()

  return NextResponse.json({
    usuario,
    whatsapp: {
      ativado: dispositivo?.ATIVO || false,
      telefone: dispositivo?.TOKEN_PUSH || usuario.TELEFONE || '',
    },
  })
}

/**
 * PUT - Atualizar configurações do usuário
 */
export async function PUT(req: Request) {
  const supabase = await createSupabaseServerClient()
  const supabaseAdmin = createSupabaseAdmin()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { nome, telefone, whatsappAtivado } = body

  // Atualizar USUARIO
  const updateUsuario: any = {}
  if (nome !== undefined) updateUsuario.NOME = nome
  if (telefone !== undefined) {
    const phoneNorm = telefone ? normalizePhone(telefone) : null
    updateUsuario.TELEFONE = phoneNorm
  }

  if (Object.keys(updateUsuario).length > 0) {
    await supabaseAdmin
      .from('USUARIO')
      .update(updateUsuario)
      .eq('ID_USUARIO', user.id)
  }

  // Gerenciar notificações WhatsApp
  if (whatsappAtivado !== undefined) {
    const phoneToUse = telefone
      ? normalizePhone(telefone)
      : (await supabaseAdmin
          .from('USUARIO')
          .select('TELEFONE')
          .eq('ID_USUARIO', user.id)
          .single()
        ).data?.TELEFONE

    if (whatsappAtivado && phoneToUse) {
      if (!isValidWhatsAppPhone(phoneToUse)) {
        return NextResponse.json(
          { message: 'Telefone inválido para WhatsApp. Use o formato: +55 11 99999-9999' },
          { status: 400 }
        )
      }

      // Verificar se já existe registro
      const { data: existente } = await supabaseAdmin
        .from('DISPOSITIVO_PUSH')
        .select('ID_DISPOSITIVO')
        .eq('ID_USUARIO', user.id)
        .eq('PROVIDER', 'WHATSAPP')
        .single()

      if (existente) {
        await supabaseAdmin
          .from('DISPOSITIVO_PUSH')
          .update({ ATIVO: true, TOKEN_PUSH: phoneToUse })
          .eq('ID_DISPOSITIVO', existente.ID_DISPOSITIVO)
      } else {
        await supabaseAdmin.from('DISPOSITIVO_PUSH').insert({
          ID_USUARIO: user.id,
          PROVIDER: 'WHATSAPP',
          TOKEN_PUSH: phoneToUse,
          ATIVO: true,
        })
      }
    } else if (!whatsappAtivado) {
      // Desativar
      await supabaseAdmin
        .from('DISPOSITIVO_PUSH')
        .update({ ATIVO: false })
        .eq('ID_USUARIO', user.id)
        .eq('PROVIDER', 'WHATSAPP')
    }
  }

  return NextResponse.json({ message: 'Configurações salvas com sucesso' })
}
