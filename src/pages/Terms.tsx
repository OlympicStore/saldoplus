import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import saldoLogo from "@/assets/saldo-plus-logo.png";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border-subtle/60 bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-text-muted hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img src={saldoLogo} alt="Saldo+" className="h-9 w-auto" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Termos de Serviço</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-text-secondary">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Aceitação dos Termos</h2>
            <p>Ao aceder e utilizar o Saldo+, concorda com estes Termos de Serviço. Se não concordar, não deve utilizar o serviço.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Descrição do Serviço</h2>
            <p>O Saldo+ é uma aplicação de gestão financeira pessoal que permite aos utilizadores acompanhar despesas, rendimentos, investimentos e metas financeiras.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Planos e Pagamento</h2>
            <p>Os planos disponíveis (Essencial, Casa e Pro) são oferecidos mediante pagamento único com acesso por 1 ano. Após o período de 1 ano, é necessário renovar o plano para continuar a aceder às funcionalidades.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Garantia de Devolução</h2>
            <p>Oferecemos uma garantia de reembolso de 7 dias. Se não ficar satisfeito, contacte-nos dentro de 7 dias após a compra para solicitar o reembolso total.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Conta do Utilizador</h2>
            <p>É responsável por manter a confidencialidade da sua conta e password. Deve notificar-nos imediatamente caso suspeite de uso não autorizado.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Dados e Privacidade</h2>
            <p>Os seus dados financeiros são privados e encriptados. Consulte a nossa Política de Privacidade para mais detalhes sobre como protegemos os seus dados.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Limitação de Responsabilidade</h2>
            <p>O Saldo+ é uma ferramenta de organização financeira e não constitui aconselhamento financeiro. Não nos responsabilizamos por decisões financeiras tomadas com base nas informações apresentadas na aplicação.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Alterações aos Termos</h2>
            <p>Reservamo-nos o direito de alterar estes termos a qualquer momento. Os utilizadores serão notificados de alterações significativas por email.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Contacto</h2>
            <p>Para questões sobre estes termos, contacte-nos através do email: suporte@saldoplus.pt</p>
          </section>
        </div>

        <p className="text-xs text-text-muted mt-12">Última atualização: Abril 2026</p>
      </main>
    </div>
  );
};

export default Terms;