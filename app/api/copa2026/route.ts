import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Cache em memória (reinicia a cada deploy no Vercel)
let cachedFixtures: any[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 1000 * 60 * 60 // 1 hora de cache

// Cache de placares do TheSportsDB
let cachedScores: Record<string, { home: number | null, away: number | null, status: string }> = {}
let scoresCacheTimestamp = 0
const SCORES_CACHE_DURATION = 1000 * 60 * 15 // 15 minutos

// Mapa de nomes em inglês (TheSportsDB) para português (nossos dados)
const NOMES_EN_PT: Record<string, string> = {
  'Mexico': 'México',
  'South Africa': 'África do Sul',
  'South Korea': 'Coreia do Sul',
  'USA': 'Estados Unidos',
  'United States': 'Estados Unidos',
  'Paraguay': 'Paraguai',
  'Canada': 'Canadá',
  'Qatar': 'Qatar',
  'Switzerland': 'Suíça',
  'Brazil': 'Brasil',
  'Morocco': 'Marrocos',
  'Haiti': 'Haiti',
  'Scotland': 'Escócia',
  'Germany': 'Alemanha',
  'Curacao': 'Curaçao',
  'Curaçao': 'Curaçao',
  'Ivory Coast': 'Costa do Marfim',
  'Ecuador': 'Equador',
  'Netherlands': 'Holanda',
  'Japan': 'Japão',
  'Tunisia': 'Tunísia',
  'Belgium': 'Bélgica',
  'Egypt': 'Egito',
  'Iran': 'Irã',
  'New Zealand': 'Nova Zelândia',
  'Spain': 'Espanha',
  'Cape Verde': 'Cabo Verde',
  'Saudi Arabia': 'Arábia Saudita',
  'Uruguay': 'Uruguai',
  'France': 'França',
  'Senegal': 'Senegal',
  'Norway': 'Noruega',
  'Argentina': 'Argentina',
  'Algeria': 'Argélia',
  'Austria': 'Áustria',
  'Jordan': 'Jordânia',
  'Portugal': 'Portugal',
  'Uzbekistan': 'Uzbequistão',
  'Colombia': 'Colômbia',
  'England': 'Inglaterra',
  'Croatia': 'Croácia',
  'Panama': 'Panamá',
  'Ghana': 'Gana',
  'Australia': 'Austrália',
}

// Buscar placares do TheSportsDB (gratuito)
async function buscarPlacaresSportsDB(): Promise<Record<string, { home: number | null, away: number | null, status: string }>> {
  const agora = Date.now()
  if (agora - scoresCacheTimestamp < SCORES_CACHE_DURATION && Object.keys(cachedScores).length > 0) {
    return cachedScores
  }

  try {
    const res = await fetch('https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4429&s=2026', {
      next: { revalidate: 900 } // 15 minutos
    })
    if (!res.ok) return cachedScores

    const data = await res.json()
    const events = data.events || []

    const scores: Record<string, { home: number | null, away: number | null, status: string }> = {}

    for (const event of events) {
      const homeEN = event.strHomeTeam
      const awayEN = event.strAwayTeam
      const homePT = NOMES_EN_PT[homeEN] || homeEN
      const awayPT = NOMES_EN_PT[awayEN] || awayEN
      // Chave: "TimeCasa x TimeVisitante"
      const chave = `${homePT} x ${awayPT}`
      scores[chave] = {
        home: event.intHomeScore !== null ? Number(event.intHomeScore) : null,
        away: event.intAwayScore !== null ? Number(event.intAwayScore) : null,
        status: event.strStatus || 'Not Started',
      }
    }

    cachedScores = scores
    scoresCacheTimestamp = agora
    return scores
  } catch {
    return cachedScores
  }
}

// Dados estáticos da Copa 2026 - Fase de Grupos
// Fonte: FIFA / ESPN (horários de Brasília, convertidos para UTC)
const JOGOS_COPA_2026: any[] = [
  // ========== GRUPO A ==========
  { grupo: 'A', rodada: 1, date: '2026-06-11T19:00:00Z', home: 'México', away: 'África do Sul', city: 'Cidade do México', stadium: 'Estádio Azteca' },
  { grupo: 'A', rodada: 1, date: '2026-06-12T02:00:00Z', home: 'Coreia do Sul', away: 'A definir (Europa D)', city: 'Guadalajara', stadium: 'Estádio Akron' },
  { grupo: 'A', rodada: 2, date: '2026-06-19T01:00:00Z', home: 'México', away: 'Coreia do Sul', city: 'Guadalajara', stadium: 'Estádio Akron' },
  { grupo: 'A', rodada: 2, date: '2026-06-18T16:00:00Z', home: 'A definir (Europa D)', away: 'África do Sul', city: 'Atlanta', stadium: 'Mercedes-Benz Stadium' },
  { grupo: 'A', rodada: 3, date: '2026-06-25T01:00:00Z', home: 'A definir (Europa D)', away: 'México', city: 'Cidade do México', stadium: 'Estádio Azteca' },
  { grupo: 'A', rodada: 3, date: '2026-06-25T01:00:00Z', home: 'África do Sul', away: 'Coreia do Sul', city: 'Monterrey', stadium: 'Estádio BBVA' },

  // ========== GRUPO B ==========
  { grupo: 'B', rodada: 1, date: '2026-06-12T19:00:00Z', home: 'Canadá', away: 'A definir (Europa A)', city: 'Toronto', stadium: 'BMO Field' },
  { grupo: 'B', rodada: 1, date: '2026-06-12T19:00:00Z', home: 'Qatar', away: 'Suíça', city: 'San Francisco', stadium: "Levi's Stadium" },
  { grupo: 'B', rodada: 2, date: '2026-06-18T19:00:00Z', home: 'Suíça', away: 'A definir (Europa A)', city: 'Los Angeles', stadium: 'SoFi Stadium' },
  { grupo: 'B', rodada: 2, date: '2026-06-18T22:00:00Z', home: 'Canadá', away: 'Qatar', city: 'Vancouver', stadium: 'BC Place' },
  { grupo: 'B', rodada: 3, date: '2026-06-24T19:00:00Z', home: 'Suíça', away: 'Canadá', city: 'Vancouver', stadium: 'BC Place' },
  { grupo: 'B', rodada: 3, date: '2026-06-24T19:00:00Z', home: 'A definir (Europa A)', away: 'Qatar', city: 'Seattle', stadium: 'Lumen Field' },

  // ========== GRUPO C (BRASIL!) ==========
  { grupo: 'C', rodada: 1, date: '2026-06-13T22:00:00Z', home: 'Brasil', away: 'Marrocos', city: 'Nova York', stadium: 'MetLife Stadium', destaque: true },
  { grupo: 'C', rodada: 1, date: '2026-06-14T01:00:00Z', home: 'Haiti', away: 'Escócia', city: 'Boston', stadium: 'Gillette Stadium' },
  { grupo: 'C', rodada: 2, date: '2026-06-19T22:00:00Z', home: 'Escócia', away: 'Marrocos', city: 'Boston', stadium: 'Gillette Stadium' },
  { grupo: 'C', rodada: 2, date: '2026-06-20T01:00:00Z', home: 'Brasil', away: 'Haiti', city: 'Filadélfia', stadium: 'Lincoln Financial Field', destaque: true },
  { grupo: 'C', rodada: 3, date: '2026-06-24T22:00:00Z', home: 'Escócia', away: 'Brasil', city: 'Miami', stadium: 'Hard Rock Stadium', destaque: true },
  { grupo: 'C', rodada: 3, date: '2026-06-24T22:00:00Z', home: 'Marrocos', away: 'Haiti', city: 'Atlanta', stadium: 'Mercedes-Benz Stadium' },

  // ========== GRUPO D ==========
  { grupo: 'D', rodada: 1, date: '2026-06-13T01:00:00Z', home: 'Estados Unidos', away: 'Paraguai', city: 'Los Angeles', stadium: 'SoFi Stadium' },
  { grupo: 'D', rodada: 1, date: '2026-06-13T04:00:00Z', home: 'Austrália', away: 'A definir (Europa C)', city: 'Vancouver', stadium: 'BC Place' },
  { grupo: 'D', rodada: 2, date: '2026-06-19T19:00:00Z', home: 'Estados Unidos', away: 'Austrália', city: 'Seattle', stadium: 'Lumen Field' },
  { grupo: 'D', rodada: 2, date: '2026-06-20T04:00:00Z', home: 'A definir (Europa C)', away: 'Paraguai', city: 'San Francisco', stadium: "Levi's Stadium" },
  { grupo: 'D', rodada: 3, date: '2026-06-26T02:00:00Z', home: 'A definir (Europa C)', away: 'Estados Unidos', city: 'Los Angeles', stadium: 'SoFi Stadium' },
  { grupo: 'D', rodada: 3, date: '2026-06-26T02:00:00Z', home: 'Paraguai', away: 'Austrália', city: 'San Francisco', stadium: "Levi's Stadium" },

  // ========== GRUPO E ==========
  { grupo: 'E', rodada: 1, date: '2026-06-14T17:00:00Z', home: 'Alemanha', away: 'Curaçao', city: 'Houston', stadium: 'NRG Stadium' },
  { grupo: 'E', rodada: 1, date: '2026-06-14T23:00:00Z', home: 'Costa do Marfim', away: 'Equador', city: 'Filadélfia', stadium: 'Lincoln Financial Field' },
  { grupo: 'E', rodada: 2, date: '2026-06-20T20:00:00Z', home: 'Alemanha', away: 'Costa do Marfim', city: 'Toronto', stadium: 'BMO Field' },
  { grupo: 'E', rodada: 2, date: '2026-06-21T00:00:00Z', home: 'Equador', away: 'Curaçao', city: 'Kansas City', stadium: 'Arrowhead Stadium' },
  { grupo: 'E', rodada: 3, date: '2026-06-25T20:00:00Z', home: 'Equador', away: 'Alemanha', city: 'Nova York', stadium: 'MetLife Stadium' },
  { grupo: 'E', rodada: 3, date: '2026-06-25T20:00:00Z', home: 'Curaçao', away: 'Costa do Marfim', city: 'Filadélfia', stadium: 'Lincoln Financial Field' },

  // ========== GRUPO F ==========
  { grupo: 'F', rodada: 1, date: '2026-06-14T20:00:00Z', home: 'Holanda', away: 'Japão', city: 'Dallas', stadium: 'AT&T Stadium' },
  { grupo: 'F', rodada: 1, date: '2026-06-15T02:00:00Z', home: 'A definir (Europa B)', away: 'Tunísia', city: 'Monterrey', stadium: 'Estádio BBVA' },
  { grupo: 'F', rodada: 2, date: '2026-06-20T17:00:00Z', home: 'Holanda', away: 'A definir (Europa B)', city: 'Houston', stadium: 'NRG Stadium' },
  { grupo: 'F', rodada: 2, date: '2026-06-21T04:00:00Z', home: 'Tunísia', away: 'Japão', city: 'Monterrey', stadium: 'Estádio BBVA' },
  { grupo: 'F', rodada: 3, date: '2026-06-25T23:00:00Z', home: 'Tunísia', away: 'Holanda', city: 'Kansas City', stadium: 'Arrowhead Stadium' },
  { grupo: 'F', rodada: 3, date: '2026-06-25T23:00:00Z', home: 'Japão', away: 'A definir (Europa B)', city: 'Dallas', stadium: 'AT&T Stadium' },

  // ========== GRUPO G ==========
  { grupo: 'G', rodada: 1, date: '2026-06-15T19:00:00Z', home: 'Bélgica', away: 'Egito', city: 'Seattle', stadium: 'Lumen Field' },
  { grupo: 'G', rodada: 1, date: '2026-06-16T01:00:00Z', home: 'Irã', away: 'Nova Zelândia', city: 'Los Angeles', stadium: 'SoFi Stadium' },
  { grupo: 'G', rodada: 2, date: '2026-06-21T19:00:00Z', home: 'Bélgica', away: 'Irã', city: 'Los Angeles', stadium: 'SoFi Stadium' },
  { grupo: 'G', rodada: 2, date: '2026-06-22T01:00:00Z', home: 'Nova Zelândia', away: 'Egito', city: 'Vancouver', stadium: 'BC Place' },
  { grupo: 'G', rodada: 3, date: '2026-06-26T03:00:00Z', home: 'Egito', away: 'Irã', city: 'Seattle', stadium: 'Lumen Field' },
  { grupo: 'G', rodada: 3, date: '2026-06-26T03:00:00Z', home: 'Nova Zelândia', away: 'Bélgica', city: 'Vancouver', stadium: 'BC Place' },

  // ========== GRUPO H ==========
  { grupo: 'H', rodada: 1, date: '2026-06-15T16:00:00Z', home: 'Espanha', away: 'Cabo Verde', city: 'Atlanta', stadium: 'Mercedes-Benz Stadium' },
  { grupo: 'H', rodada: 1, date: '2026-06-15T22:00:00Z', home: 'Arábia Saudita', away: 'Uruguai', city: 'Miami', stadium: 'Hard Rock Stadium' },
  { grupo: 'H', rodada: 2, date: '2026-06-21T16:00:00Z', home: 'Espanha', away: 'Arábia Saudita', city: 'Atlanta', stadium: 'Mercedes-Benz Stadium' },
  { grupo: 'H', rodada: 2, date: '2026-06-21T22:00:00Z', home: 'Uruguai', away: 'Cabo Verde', city: 'Miami', stadium: 'Hard Rock Stadium' },
  { grupo: 'H', rodada: 3, date: '2026-06-27T00:00:00Z', home: 'Uruguai', away: 'Espanha', city: 'Guadalajara', stadium: 'Estádio Akron' },
  { grupo: 'H', rodada: 3, date: '2026-06-27T00:00:00Z', home: 'Cabo Verde', away: 'Arábia Saudita', city: 'Houston', stadium: 'NRG Stadium' },

  // ========== GRUPO I ==========
  { grupo: 'I', rodada: 1, date: '2026-06-16T19:00:00Z', home: 'França', away: 'Senegal', city: 'Nova York', stadium: 'MetLife Stadium' },
  { grupo: 'I', rodada: 1, date: '2026-06-16T22:00:00Z', home: 'A definir (Interc. 2)', away: 'Noruega', city: 'Boston', stadium: 'Gillette Stadium' },
  { grupo: 'I', rodada: 2, date: '2026-06-22T21:00:00Z', home: 'França', away: 'A definir (Interc. 2)', city: 'Filadélfia', stadium: 'Lincoln Financial Field' },
  { grupo: 'I', rodada: 2, date: '2026-06-23T00:00:00Z', home: 'Noruega', away: 'Senegal', city: 'Nova York', stadium: 'MetLife Stadium' },
  { grupo: 'I', rodada: 3, date: '2026-06-26T19:00:00Z', home: 'Noruega', away: 'França', city: 'Boston', stadium: 'Gillette Stadium' },
  { grupo: 'I', rodada: 3, date: '2026-06-26T19:00:00Z', home: 'Senegal', away: 'A definir (Interc. 2)', city: 'Toronto', stadium: 'BMO Field' },

  // ========== GRUPO J ==========
  { grupo: 'J', rodada: 1, date: '2026-06-17T01:00:00Z', home: 'Argentina', away: 'Argélia', city: 'Kansas City', stadium: 'Arrowhead Stadium' },
  { grupo: 'J', rodada: 1, date: '2026-06-17T04:00:00Z', home: 'Áustria', away: 'Jordânia', city: 'San Francisco', stadium: "Levi's Stadium" },
  { grupo: 'J', rodada: 2, date: '2026-06-22T17:00:00Z', home: 'Argentina', away: 'Áustria', city: 'Dallas', stadium: 'AT&T Stadium' },
  { grupo: 'J', rodada: 2, date: '2026-06-23T04:00:00Z', home: 'Jordânia', away: 'Argélia', city: 'San Francisco', stadium: "Levi's Stadium" },
  { grupo: 'J', rodada: 3, date: '2026-06-28T02:00:00Z', home: 'Jordânia', away: 'Argentina', city: 'Dallas', stadium: 'AT&T Stadium' },
  { grupo: 'J', rodada: 3, date: '2026-06-28T02:00:00Z', home: 'Argélia', away: 'Áustria', city: 'Kansas City', stadium: 'Arrowhead Stadium' },

  // ========== GRUPO K ==========
  { grupo: 'K', rodada: 1, date: '2026-06-17T17:00:00Z', home: 'Portugal', away: 'A definir (Interc. 1)', city: 'Houston', stadium: 'NRG Stadium' },
  { grupo: 'K', rodada: 1, date: '2026-06-18T02:00:00Z', home: 'Uzbequistão', away: 'Colômbia', city: 'Cidade do México', stadium: 'Estádio Azteca' },
  { grupo: 'K', rodada: 2, date: '2026-06-23T17:00:00Z', home: 'Portugal', away: 'Uzbequistão', city: 'Houston', stadium: 'NRG Stadium' },
  { grupo: 'K', rodada: 2, date: '2026-06-24T02:00:00Z', home: 'Colômbia', away: 'A definir (Interc. 1)', city: 'Guadalajara', stadium: 'Estádio Akron' },
  { grupo: 'K', rodada: 3, date: '2026-06-27T23:30:00Z', home: 'Colômbia', away: 'Portugal', city: 'Miami', stadium: 'Hard Rock Stadium' },
  { grupo: 'K', rodada: 3, date: '2026-06-27T23:30:00Z', home: 'A definir (Interc. 1)', away: 'Uzbequistão', city: 'Atlanta', stadium: 'Mercedes-Benz Stadium' },

  // ========== GRUPO L ==========
  { grupo: 'L', rodada: 1, date: '2026-06-17T20:00:00Z', home: 'Inglaterra', away: 'Croácia', city: 'Dallas', stadium: 'AT&T Stadium' },
  { grupo: 'L', rodada: 1, date: '2026-06-17T23:00:00Z', home: 'Gana', away: 'Panamá', city: 'Toronto', stadium: 'BMO Field' },
  { grupo: 'L', rodada: 2, date: '2026-06-23T20:00:00Z', home: 'Inglaterra', away: 'Gana', city: 'Boston', stadium: 'Gillette Stadium' },
  { grupo: 'L', rodada: 2, date: '2026-06-23T23:00:00Z', home: 'Panamá', away: 'Croácia', city: 'Toronto', stadium: 'BMO Field' },
  { grupo: 'L', rodada: 3, date: '2026-06-27T21:00:00Z', home: 'Panamá', away: 'Inglaterra', city: 'Nova York', stadium: 'MetLife Stadium' },
  { grupo: 'L', rodada: 3, date: '2026-06-27T21:00:00Z', home: 'Croácia', away: 'Gana', city: 'Filadélfia', stadium: 'Lincoln Financial Field' },
]

// Códigos ISO-2 para flagcdn.com (ex: 'br' → https://flagcdn.com/br.svg)
const BANDEIRAS: Record<string, string> = {
  'México': 'mx', 'África do Sul': 'za', 'Coreia do Sul': 'kr',
  'Canadá': 'ca', 'Qatar': 'qa', 'Suíça': 'ch',
  'Brasil': 'br', 'Marrocos': 'ma', 'Haiti': 'ht', 'Escócia': 'gb-sct',
  'Estados Unidos': 'us', 'Paraguai': 'py', 'Austrália': 'au',
  'Alemanha': 'de', 'Curaçao': 'cw', 'Costa do Marfim': 'ci', 'Equador': 'ec',
  'Holanda': 'nl', 'Japão': 'jp', 'Tunísia': 'tn',
  'Bélgica': 'be', 'Egito': 'eg', 'Irã': 'ir', 'Nova Zelândia': 'nz',
  'Espanha': 'es', 'Cabo Verde': 'cv', 'Arábia Saudita': 'sa', 'Uruguai': 'uy',
  'França': 'fr', 'Senegal': 'sn', 'Noruega': 'no',
  'Argentina': 'ar', 'Argélia': 'dz', 'Áustria': 'at', 'Jordânia': 'jo',
  'Portugal': 'pt', 'Uzbequistão': 'uz', 'Colômbia': 'co',
  'Inglaterra': 'gb-eng', 'Croácia': 'hr', 'Gana': 'gh', 'Panamá': 'pa',
  // Vagas a definir
  'A definir (Europa A)': '', 'A definir (Europa B)': '',
  'A definir (Europa C)': '', 'A definir (Europa D)': '',
  'A definir (Interc. 1)': '', 'A definir (Interc. 2)': '',
}

// Nomes curtos para times "A definir" (exibição mais limpa nos cards)
const NOMES_CURTOS: Record<string, string> = {
  'A definir (Europa A)': 'A Definir (UEFA)',
  'A definir (Europa B)': 'A Definir (UEFA)',
  'A definir (Europa C)': 'A Definir (UEFA)',
  'A definir (Europa D)': 'A Definir (UEFA)',
  'A definir (Interc. 1)': 'A Definir (Repesc.)',
  'A definir (Interc. 2)': 'A Definir (Repesc.)',
}

// Helper: autenticar via cookie (web) ou Bearer token (mobile)
async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    return { user, error }
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// GET: Retorna lista de jogos da Copa 2026
export async function GET(req: Request) {
  // Autenticação
  const { user, error: authError } = await getAuthenticatedUser(req)
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const supabaseAdmin = createSupabaseAdmin()

  // Buscar agenda do usuário
  const { data: agenda } = await supabaseAdmin
    .from('AGENDA')
    .select('ID_AGENDA')
    .eq('ID_USUARIO', user.id)
    .single()

  // Buscar compromissos da Copa que o usuário já importou
  let jogosImportados: string[] = []
  if (agenda) {
    const { data: compromissosCopa } = await supabaseAdmin
      .from('COMPROMISSO')
      .select('TITULO, DATA_INICIO')
      .eq('ID_AGENDA', agenda.ID_AGENDA)
      .eq('ORIGEM', 'COPA2026')

    if (compromissosCopa) {
      jogosImportados = compromissosCopa.map(c =>
        `${c.TITULO}|${c.DATA_INICIO}`
      )
    }
  }

  // Helper para verificar se é um time "a definir"
  const isADefinir = (nome: string) => nome.startsWith('A definir')

  // Buscar placares do TheSportsDB
  const placares = await buscarPlacaresSportsDB()

  // Preparar dados com bandeiras e status de importação
  const jogos = JOGOS_COPA_2026.map((jogo, index) => {
    const titulo = `${jogo.home} x ${jogo.away}`
    const chaveJogo = `⚽ ${titulo}|${jogo.date}`

    // Buscar placar pelo nome dos times
    const chavePlacar = `${jogo.home} x ${jogo.away}`
    const placar = placares[chavePlacar] || null

    return {
      id: index + 1,
      grupo: jogo.grupo,
      rodada: jogo.rodada,
      home: NOMES_CURTOS[jogo.home] || jogo.home,
      away: NOMES_CURTOS[jogo.away] || jogo.away,
      homeOriginal: jogo.home,
      awayOriginal: jogo.away,
      homeBandeira: BANDEIRAS[jogo.home] || '🏳️',
      awayBandeira: BANDEIRAS[jogo.away] || '🏳️',
      homeADefinir: isADefinir(jogo.home),
      awayADefinir: isADefinir(jogo.away),
      date: jogo.date,
      city: jogo.city,
      stadium: jogo.stadium,
      destaque: jogo.destaque || false,
      importado: jogosImportados.some(j => j.includes(titulo)),
      // Placar (null se ainda não jogou)
      golsHome: placar?.home ?? null,
      golsAway: placar?.away ?? null,
      statusJogo: placar?.status ?? 'Not Started',
    }
  })

  // Agrupar por grupo
  const grupos: Record<string, any[]> = {}
  for (const jogo of jogos) {
    if (!grupos[jogo.grupo]) grupos[jogo.grupo] = []
    grupos[jogo.grupo].push(jogo)
  }

  return NextResponse.json({
    total: jogos.length,
    jogos,
    grupos,
    totalImportados: jogos.filter(j => j.importado).length,
  })
}

// POST: Importar jogos da Copa para a agenda do usuário
export async function POST(req: Request) {
  const supabaseAdmin = createSupabaseAdmin()

  const { user, error: authError } = await getAuthenticatedUser(req)
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { acao, jogosIds } = body
  // acao: 'importar_todos', 'importar_selecionados', 'remover_todos', 'remover_selecionados'

  // Buscar agenda do usuário
  const { data: agenda, error: agendaError } = await supabaseAdmin
    .from('AGENDA')
    .select('ID_AGENDA')
    .eq('ID_USUARIO', user.id)
    .single()

  if (agendaError || !agenda) {
    return NextResponse.json({ message: 'Agenda não encontrada' }, { status: 404 })
  }

  if (acao === 'importar_todos' || acao === 'importar_selecionados') {
    // Filtrar jogos a importar
    let jogosParaImportar = JOGOS_COPA_2026
    if (acao === 'importar_selecionados' && jogosIds?.length) {
      jogosParaImportar = JOGOS_COPA_2026.filter((_, i) => jogosIds.includes(i + 1))
    }

    // Buscar compromissos da Copa já existentes para não duplicar
    const { data: existentes } = await supabaseAdmin
      .from('COMPROMISSO')
      .select('TITULO, DATA_INICIO')
      .eq('ID_AGENDA', agenda.ID_AGENDA)
      .eq('ORIGEM', 'COPA2026')

    const existentesSet = new Set(
      (existentes || []).map(c => `${c.TITULO}|${c.DATA_INICIO}`)
    )

    // Preparar inserções (só jogos que ainda não foram importados)
    const novos = jogosParaImportar
      .map(jogo => {
        const titulo = `⚽ ${jogo.home} x ${jogo.away}`
        const dataInicio = jogo.date
        const chave = `${titulo}|${dataInicio}`

        if (existentesSet.has(chave)) return null

        // Duração de 2 horas para cada jogo
        const dataFim = new Date(new Date(dataInicio).getTime() + 2 * 60 * 60 * 1000).toISOString()

        return {
          ID_AGENDA: agenda.ID_AGENDA,
          TITULO: titulo,
          DESCRICAO: `Copa do Mundo 2026 - Grupo ${jogo.grupo} - Rodada ${jogo.rodada}\n📍 ${jogo.stadium}, ${jogo.city}`,
          LOCAL: `${jogo.stadium}, ${jogo.city}`,
          DATA_INICIO: dataInicio,
          DATA_FIM: dataFim,
          ORIGEM: 'COPA2026',
          CRIADO_POR: user.id,
          STATUS: 'ATIVO',
        }
      })
      .filter(Boolean)

    if (novos.length === 0) {
      return NextResponse.json({
        message: 'Todos os jogos já foram importados!',
        importados: 0,
      })
    }

    // Inserir em lote
    const { data: inseridos, error: insertError } = await supabaseAdmin
      .from('COMPROMISSO')
      .insert(novos)
      .select()

    if (insertError) {
      return NextResponse.json({ message: insertError.message }, { status: 400 })
    }

    return NextResponse.json({
      message: `${inseridos?.length || 0} jogos importados para sua agenda!`,
      importados: inseridos?.length || 0,
    })
  }

  if (acao === 'remover_todos' || acao === 'remover_selecionados') {
    if (acao === 'remover_todos') {
      // Remover TODOS os compromissos da Copa
      const { error: deleteError } = await supabaseAdmin
        .from('COMPROMISSO')
        .delete()
        .eq('ID_AGENDA', agenda.ID_AGENDA)
        .eq('ORIGEM', 'COPA2026')

      if (deleteError) {
        return NextResponse.json({ message: deleteError.message }, { status: 400 })
      }

      return NextResponse.json({
        message: 'Todos os jogos da Copa foram removidos da sua agenda.',
        removidos: 'todos',
      })
    }

    // Remover selecionados
    if (jogosIds?.length) {
      const jogosParaRemover = JOGOS_COPA_2026.filter((_, i) => jogosIds.includes(i + 1))
      let removidos = 0

      for (const jogo of jogosParaRemover) {
        const titulo = `⚽ ${jogo.home} x ${jogo.away}`
        const { error } = await supabaseAdmin
          .from('COMPROMISSO')
          .delete()
          .eq('ID_AGENDA', agenda.ID_AGENDA)
          .eq('TITULO', titulo)
          .eq('ORIGEM', 'COPA2026')

        if (!error) removidos++
      }

      return NextResponse.json({
        message: `${removidos} jogos removidos da sua agenda.`,
        removidos,
      })
    }
  }

  return NextResponse.json({ message: 'Ação inválida' }, { status: 400 })
}
