export default function EmailConfirmado() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F3F4F6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        padding: '48px 32px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {/* Ícone de sucesso */}
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: '#EFF6FF',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '40px',
        }}>
          ✅
        </div>

        {/* Logo */}
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#111827',
          margin: '0 0 8px',
        }}>
          Agend<span style={{ color: '#2563EB' }}>AI</span>
        </h1>

        {/* Título */}
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 12px',
        }}>
          Email confirmado com sucesso!
        </h2>

        {/* Mensagem */}
        <p style={{
          fontSize: '15px',
          color: '#6B7280',
          lineHeight: '1.6',
          margin: '0 0 32px',
        }}>
          Sua conta foi ativada. Volte para o aplicativo AgendAI e faça login para começar a organizar sua agenda de forma inteligente.
        </p>

        {/* Instrução */}
        <div style={{
          backgroundColor: '#EFF6FF',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{
            fontSize: '14px',
            color: '#2563EB',
            fontWeight: '600',
            margin: '0 0 4px',
          }}>
            📱 Volte para o aplicativo
          </p>
          <p style={{
            fontSize: '13px',
            color: '#3B82F6',
            margin: '0',
          }}>
            Abra o AgendAI no seu celular e faça login com seu email e senha.
          </p>
        </div>

        {/* Rodapé */}
        <p style={{
          fontSize: '12px',
          color: '#9CA3AF',
          margin: '0',
        }}>
          © 2026 AgendAI · GrupHub · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
