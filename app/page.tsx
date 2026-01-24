import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-screen py-12">
          {/* Logo/Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-4">
              Agend<span className="text-blue-600">AI</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-2">
              Sua Agenda Inteligente
            </p>
            <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto">
              Sistema completo de agendamento com compartilhamento, lembretes automáticos e integração com WhatsApp
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 w-full max-w-5xl">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl mb-3">📅</div>
              <h3 className="font-semibold text-gray-900 mb-2">Agenda Completa</h3>
              <p className="text-sm text-gray-600">Organize todos seus compromissos em um só lugar</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl mb-3">🔗</div>
              <h3 className="font-semibold text-gray-900 mb-2">Compartilhamento</h3>
              <p className="text-sm text-gray-600">Compartilhe agendas e compromissos facilmente</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl mb-3">🔔</div>
              <h3 className="font-semibold text-gray-900 mb-2">Lembretes</h3>
              <p className="text-sm text-gray-600">Notificações automáticas para nunca esquecer</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="font-semibold text-gray-900 mb-2">WhatsApp</h3>
              <p className="text-sm text-gray-600">Receba e crie compromissos via WhatsApp</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/login"
              className="px-8 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors text-center"
            >
              Entrar
            </Link>
            <Link 
              href="/cadastro"
              className="px-8 py-3 rounded-lg bg-white text-gray-900 font-medium border border-gray-300 hover:bg-gray-50 transition-colors text-center"
            >
              Criar Conta Grátis
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center text-sm text-gray-500">
            <p>© 2026 AgendAI - Todos os direitos reservados</p>
          </div>
        </div>
      </div>
    </div>
  )
}