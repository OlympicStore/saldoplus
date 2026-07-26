import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileText, Shield, Receipt, Paperclip, Trash2, Download, X, Calendar, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type DocCategory = "garantia" | "fatura" | "recibo" | "contrato" | "outro";

interface OtherDoc {
  id: string;
  title: string;
  description: string | null;
  category: DocCategory;
  doc_date: string | null;
  expires_at: string | null;
  amount: number | null;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

const CATEGORIES: { id: DocCategory; label: string; icon: typeof FileText; color: string }[] = [
  { id: "garantia", label: "Garantia", icon: Shield, color: "text-blue-600 bg-blue-500/10" },
  { id: "fatura", label: "Fatura", icon: Receipt, color: "text-emerald-600 bg-emerald-500/10" },
  { id: "recibo", label: "Recibo", icon: FileText, color: "text-amber-600 bg-amber-500/10" },
  { id: "contrato", label: "Contrato", icon: FileText, color: "text-violet-600 bg-violet-500/10" },
  { id: "outro", label: "Outro", icon: Tag, color: "text-slate-600 bg-slate-500/10" },
];

const fmtEuro = (v: number | null) =>
  v == null ? null : `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

const fmtDate = (v: string | null) => {
  if (!v) return null;
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
};

export const OtherDocuments = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<OtherDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DocCategory>("garantia");
  const [docDate, setDocDate] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("other_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar documentos");
    else setDocs((data as OtherDoc[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setCategory("garantia");
    setDocDate(""); setExpiresAt(""); setAmount(""); setFile(null);
  };

  const handleAdd = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    try {
      let attachment_url: string | null = null;
      let attachment_name: string | null = null;

      if (file) {
        const path = `${user.id}/other/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("bill-attachments").upload(path, file);
        if (upErr) throw upErr;
        attachment_url = path;
        attachment_name = file.name;
      }

      const amountNum = amount.trim() ? Number(amount.replace(",", ".")) : null;

      const { error } = await supabase.from("other_documents").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        doc_date: docDate || null,
        expires_at: expiresAt || null,
        amount: amountNum && !isNaN(amountNum) ? amountNum : null,
        attachment_url,
        attachment_name,
      });
      if (error) throw error;

      toast.success("Documento adicionado");
      resetForm();
      setShowAdd(false);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (doc: OtherDoc) => {
    if (!confirm(`Eliminar "${doc.title}"?`)) return;
    if (doc.attachment_url) {
      await supabase.storage.from("bill-attachments").remove([doc.attachment_url]);
    }
    const { error } = await supabase.from("other_documents").delete().eq("id", doc.id);
    if (error) toast.error("Erro ao eliminar");
    else {
      toast.success("Documento removido");
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    }
  };

  const handleDownload = async (doc: OtherDoc) => {
    if (!doc.attachment_url) return;
    const { data, error } = await supabase.storage.from("bill-attachments").createSignedUrl(doc.attachment_url, 60);
    if (error || !data) { toast.error("Erro ao abrir ficheiro"); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <section className="mt-10">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Outros documentos
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Guarda garantias, faturas avulsas, recibos, contratos e outros documentos importantes.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15 transition"
        >
          <Plus className="h-4 w-4" /> Adicionar documento
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface rounded-3xl border border-border-subtle/60 shadow-card p-5 mt-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">Novo documento</h3>

              <div className="mb-4">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block mb-2">Categoria</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => {
                    const Icon = c.icon;
                    const active = category === c.id;
                    return (
                      <button
                        key={c.id} type="button" onClick={() => setCategory(c.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition ${
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border-subtle bg-background text-foreground hover:bg-surface-hover"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" /> {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block mb-1.5">Título</label>
                  <input value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="Ex: Garantia frigorífico Bosch"
                    className="w-full text-sm bg-background border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block mb-1.5">Descrição (opcional)</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Notas adicionais, loja onde comprou, número de série..."
                    className="w-full text-sm bg-background border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block mb-1.5">Data do documento</label>
                  <input type="date" value={docDate} onChange={e => setDocDate(e.target.value)}
                    className="w-full text-sm bg-background border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block mb-1.5">Data de expiração / validade</label>
                  <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                    className="w-full text-sm bg-background border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block mb-1.5">Valor (opcional)</label>
                  <input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full text-sm bg-background border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block mb-1.5">Anexo (opcional)</label>
                  <label className="w-full text-sm bg-background border border-dashed border-border-subtle rounded-xl px-3 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-surface-hover transition text-text-muted">
                    <Paperclip className="h-4 w-4" />
                    <span className="truncate">{file ? file.name : "Escolher ficheiro..."}</span>
                    <input type="file" className="hidden"
                      accept="image/*,application/pdf"
                      onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => { setShowAdd(false); resetForm(); }}
                  className="px-4 py-2 rounded-full text-sm text-text-muted hover:bg-surface-hover transition-colors">Cancelar</button>
                <button onClick={handleAdd} disabled={!title.trim() || saving}
                  className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-60">
                  {saving ? "A guardar..." : "Guardar documento"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      <div className="mt-4">
        {loading ? (
          <div className="text-center text-sm text-text-muted py-8">A carregar...</div>
        ) : docs.length === 0 ? (
          <div className="bg-surface rounded-3xl border border-dashed border-border-subtle/70 p-8 text-center">
            <span className="inline-flex h-12 w-12 rounded-2xl bg-primary/10 items-center justify-center text-primary mb-3">
              <FileText className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-foreground">Ainda não tens documentos guardados</p>
            <p className="text-xs text-text-muted mt-1">Adiciona garantias, faturas avulsas ou outros documentos importantes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {docs.map(doc => {
              const cat = CATEGORIES.find(c => c.id === doc.category) ?? CATEGORIES[4];
              const Icon = cat.icon;
              return (
                <div key={doc.id}
                  className="bg-surface rounded-2xl border border-border-subtle/60 shadow-card p-4 flex gap-3 group">
                  <span className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${cat.color}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{doc.title}</p>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mt-0.5">{cat.label}</p>
                      </div>
                      {doc.amount != null && (
                        <span className="text-sm font-bold text-foreground font-mono tabular-nums shrink-0">
                          {fmtEuro(doc.amount)}
                        </span>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-xs text-text-muted mt-1 line-clamp-2">{doc.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-text-muted">
                      {doc.doc_date && (
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmtDate(doc.doc_date)}</span>
                      )}
                      {doc.expires_at && (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <Calendar className="h-3 w-3" /> Val. {fmtDate(doc.expires_at)}
                        </span>
                      )}
                      {doc.attachment_name && (
                        <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" /> {doc.attachment_name}</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      {doc.attachment_url && (
                        <button onClick={() => handleDownload(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/15 transition">
                          <Download className="h-3 w-3" /> Ver anexo
                        </button>
                      )}
                      <button onClick={() => handleDelete(doc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 text-[11px] font-semibold hover:bg-red-500/15 transition">
                        <Trash2 className="h-3 w-3" /> Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
