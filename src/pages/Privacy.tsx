import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border-subtle/60 bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-text-muted hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-2xl font-bold text-foreground">Saldo<span className="text-primary text-3xl font-black">+</span></span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Política de Privacidade</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-text-secondary">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Dados que Recolhemos</h2>
            <p>Recolhemos apenas os dados necessários para o funcionamento do serviço:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nome e email (para autenticação)</li>
              <li>Dados financeiros introduzidos por si (despesas, rendimentos, metas)</li>
              <li>Informações de pagamento (processadas pelo Stripe, nunca armazenadas por nós)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Como Usamos os Seus Dados</h2>
            <p>Os seus dados são utilizados exclusivamente para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fornecer as funcionalidades da aplicação</li>
              <li>Gerar análises e sugestões personalizadas (plano Pro)</li>
              <li>Comunicações relacionadas com o serviço</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Segurança dos Dados</h2>
            <p>Utilizamos encriptação de ponta a ponta e os dados são armazenados em servidores seguros. Os seus dados financeiros são privados — apenas você tem acesso a eles.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Partilha de Dados</h2>
            <p>Nunca vendemos ou partilhamos os seus dados pessoais com terceiros. Os únicos serviços externos que processam dados são:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Stripe (processamento de pagamentos)</li>
              <li>Serviço de autenticação (login seguro)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Os Seus Direitos (RGPD)</h2>
            <p>Tem direito a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Aceder aos seus dados pessoais</li>
              <li>Retificar dados incorretos</li>
              <li>Solicitar a eliminação dos seus dados</li>
              <li>Exportar os seus dados</li>
              <li>Retirar o consentimento a qualquer momento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Cookies</h2>
            <p>Utilizamos apenas cookies essenciais para o funcionamento da autenticação. Não utilizamos cookies de rastreamento ou publicidade.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Contacto</h2>
            <p>Para exercer os seus direitos ou esclarecer dúvidas sobre privacidade, contacte-nos: suporte@saldoplus.pt</p>
          </section>
        </div>

        <p className="text-xs text-text-muted mt-12">Última atualização: Abril 2026</p>
      </main>
    </div>
  );
};

export default Privacy;