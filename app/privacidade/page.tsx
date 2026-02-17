export const metadata = {
  title: "Política de Privacidade - AgendAI",
  description: "Política de Privacidade do AgendAI",
};

export default function PoliticaPrivacidade() {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 800, margin: "0 auto", padding: "40px 24px", color: "#1e293b" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, background: "linear-gradient(135deg, #2563EB, #7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          📅 AgendAI
        </h1>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", marginTop: 8 }}>Política de Privacidade</h2>
        <p style={{ color: "#64748b", fontSize: 14 }}>Última atualização: fevereiro de 2025</p>
      </div>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2563EB", marginBottom: 12 }}>1. Informações que Coletamos</h3>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          O AgendAI coleta as seguintes informações para fornecer nossos serviços:
        </p>
        <ul style={{ color: "#475569", lineHeight: 2, paddingLeft: 24 }}>
          <li><strong>Dados de conta:</strong> nome, endereço de e-mail e senha (armazenada de forma criptografada).</li>
          <li><strong>Dados de agenda:</strong> compromissos, datas, horários, descrições e informações de local que você cadastra voluntariamente.</li>
          <li><strong>Dados de uso:</strong> informações sobre como você utiliza o aplicativo para melhorar a experiência.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2563EB", marginBottom: 12 }}>2. Como Usamos suas Informações</h3>
        <ul style={{ color: "#475569", lineHeight: 2, paddingLeft: 24 }}>
          <li>Fornecer e manter o serviço de agenda.</li>
          <li>Enviar notificações e lembretes de compromissos.</li>
          <li>Permitir o compartilhamento de agenda entre usuários autorizados.</li>
          <li>Melhorar e personalizar sua experiência no app.</li>
          <li>Enviar comunicações relacionadas ao serviço (ex: confirmação de cadastro, redefinição de senha).</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2563EB", marginBottom: 12 }}>3. Compartilhamento de Dados</h3>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          <strong>Não vendemos seus dados pessoais.</strong> Compartilhamos informações apenas nas seguintes situações:
        </p>
        <ul style={{ color: "#475569", lineHeight: 2, paddingLeft: 24 }}>
          <li><strong>Com sua autorização:</strong> quando você compartilha sua agenda com outros usuários.</li>
          <li><strong>Provedores de serviço:</strong> utilizamos o Supabase para autenticação e banco de dados, com padrões de segurança de nível empresarial.</li>
          <li><strong>Obrigação legal:</strong> quando exigido por lei ou autoridade competente.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2563EB", marginBottom: 12 }}>4. Segurança dos Dados</h3>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          Adotamos medidas técnicas e organizacionais para proteger suas informações, incluindo:
        </p>
        <ul style={{ color: "#475569", lineHeight: 2, paddingLeft: 24 }}>
          <li>Criptografia de senhas com algoritmos seguros (bcrypt).</li>
          <li>Comunicação via HTTPS/TLS.</li>
          <li>Autenticação segura via Supabase Auth.</li>
          <li>Controle de acesso por usuário (Row Level Security).</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2563EB", marginBottom: 12 }}>5. Seus Direitos (LGPD)</h3>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), você tem direito a:
        </p>
        <ul style={{ color: "#475569", lineHeight: 2, paddingLeft: 24 }}>
          <li>Acessar seus dados pessoais.</li>
          <li>Corrigir dados incompletos ou incorretos.</li>
          <li>Solicitar a exclusão dos seus dados.</li>
          <li>Revogar o consentimento a qualquer momento.</li>
          <li>Portabilidade dos dados.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2563EB", marginBottom: 12 }}>6. Retenção de Dados</h3>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          Mantemos seus dados enquanto sua conta estiver ativa. Ao solicitar a exclusão da conta, seus dados serão removidos em até 30 dias, exceto quando a retenção for exigida por obrigação legal.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2563EB", marginBottom: 12 }}>7. Crianças</h3>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          O AgendAI não é destinado a menores de 13 anos. Não coletamos intencionalmente dados de crianças. Se identificarmos que coletamos dados de uma criança sem consentimento parental, excluiremos essas informações imediatamente.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2563EB", marginBottom: 12 }}>8. Alterações nesta Política</h3>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças significativas por e-mail ou pelo próprio aplicativo. O uso continuado do serviço após as alterações constitui aceitação da nova política.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2563EB", marginBottom: 12 }}>9. Contato</h3>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          Para dúvidas, solicitações ou exercício dos seus direitos relacionados à privacidade, entre em contato:
        </p>
        <div style={{ background: "#f0f4ff", borderRadius: 12, padding: 20, marginTop: 12 }}>
          <p style={{ margin: 0, color: "#2563EB", fontWeight: 600 }}>📅 AgendAI - GrupHub</p>
          <p style={{ margin: "4px 0 0", color: "#475569" }}>E-mail: contato@agendai.com.br</p>
        </div>
      </section>

      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 24, textAlign: "center" }}>
        <p style={{ color: "#94a3b8", fontSize: 13 }}>© 2025 AgendAI - Todos os direitos reservados</p>
        <a href="/" style={{ color: "#2563EB", fontSize: 14, textDecoration: "none" }}>← Voltar para o AgendAI</a>
      </div>
    </div>
  );
}
