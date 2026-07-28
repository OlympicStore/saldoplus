import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "invalid" | "already" | "success" | "error" | "submitting";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      setMessage("Link inválido — falta o token de cancelamento.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.valid) setState("valid");
        else if (json.reason === "already_unsubscribed") setState("already");
        else {
          setState("invalid");
          setMessage(json.error || "Link inválido ou expirado.");
        }
      } catch {
        setState("error");
        setMessage("Não foi possível validar o link. Tente novamente.");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) setState("success");
      else if (json.reason === "already_unsubscribed") setState("already");
      else {
        setState("error");
        setMessage(json.error || "Não foi possível concluir o cancelamento.");
      }
    } catch {
      setState("error");
      setMessage("Erro de ligação. Tente novamente.");
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface border border-border-subtle/60 rounded-2xl shadow-sm p-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl font-bold tracking-tight text-foreground">Saldo</span>
          <span className="text-3xl font-black text-primary">+</span>
        </div>

        {state === "loading" && (
          <div className="flex flex-col items-center py-8 text-text-muted">
            <Loader2 className="h-6 w-6 animate-spin mb-3" />
            <p className="text-sm">A validar o seu pedido…</p>
          </div>
        )}

        {state === "valid" && (
          <>
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">
              Confirmar cancelamento de emails
            </h1>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              Ao confirmar, deixará de receber emails do Saldo+ neste endereço.
              Emails essenciais da conta (segurança, faturas) podem continuar a
              ser enviados.
            </p>
            <button
              onClick={confirm}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold hover:opacity-90 transition-opacity"
            >
              Confirmar cancelamento
            </button>
          </>
        )}

        {state === "submitting" && (
          <div className="flex flex-col items-center py-8 text-text-muted">
            <Loader2 className="h-6 w-6 animate-spin mb-3" />
            <p className="text-sm">A processar…</p>
          </div>
        )}

        {state === "success" && (
          <>
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Cancelamento confirmado</h1>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              Pronto! Não vai receber mais emails deste tipo. Se mudar de ideias,
              basta contactar-nos em <a className="text-primary underline" href="mailto:contactosaldoplus@gmail.com">contactosaldoplus@gmail.com</a>.
            </p>
            <Link to="/" className="text-sm text-primary underline">Voltar ao Saldo+</Link>
          </>
        )}

        {state === "already" && (
          <>
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Já estava cancelado</h1>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              Este endereço já tinha cancelado a receção de emails. Não precisa de fazer nada.
            </p>
            <Link to="/" className="text-sm text-primary underline">Voltar ao Saldo+</Link>
          </>
        )}

        {(state === "invalid" || state === "error") && (
          <>
            <div className="h-12 w-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Não foi possível continuar</h1>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              {message || "Link inválido ou expirado."}
            </p>
            <Link to="/" className="text-sm text-primary underline">Voltar ao Saldo+</Link>
          </>
        )}
      </div>
    </main>
  );
};

export default Unsubscribe;
