import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, User, Check, X } from "lucide-react";
import { useSubAccount } from "@/contexts/SubAccountContext";
import { toast } from "sonner";

const AVATAR_COLORS = ["#10B981", "#6366F1", "#F59E0B", "#EC4899", "#8B5CF6", "#14B8A6"];

export const SubAccountSwitcher = () => {
  const {
    subAccounts, activeSubAccount, currentSubAccountId,
    switchSubAccount, addSubAccount, updateSubAccount, deleteSubAccount,
  } = useSubAccount();

  const [showManager, setShowManager] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(AVATAR_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await addSubAccount(newName.trim(), newColor);
      setNewName("");
      setAdding(false);
      toast.success("Perfil criado!");
    } catch (e: any) {
      toast.error(e.message?.includes("Maximum") ? "Máximo de 3 perfis atingido" : "Erro ao criar perfil");
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return;
    await updateSubAccount(editingId, editName.trim(), editColor);
    setEditingId(null);
    toast.success("Perfil atualizado!");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apagar este perfil? Todos os dados associados serão eliminados.")) return;
    await deleteSubAccount(id);
    toast.success("Perfil eliminado!");
  };

  return (
    <div className="relative">
      {/* Profile switcher button */}
      <button
        onClick={() => setShowManager(!showManager)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
      >
        <div
          className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: activeSubAccount?.avatar_color || "#6B7280" }}
        >
          {activeSubAccount ? activeSubAccount.name[0].toUpperCase() : <User className="h-3.5 w-3.5" />}
        </div>
        <span className="hidden sm:inline">
          {activeSubAccount?.name || "Principal"}
        </span>
      </button>

      {showManager && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowManager(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-surface rounded-xl shadow-card border border-border-subtle/60 p-3 w-[260px]">
            <p className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">Perfis</p>

            {/* Main account */}
            <button
              onClick={() => { switchSubAccount(null); setShowManager(false); }}
              className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-sm transition-colors ${
                !currentSubAccountId ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-surface-hover"
              }`}
            >
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4 text-text-muted" />
              </div>
              Principal
            </button>

            {/* Sub-accounts */}
            {subAccounts.map((sub) => (
              <div key={sub.id} className="flex items-center gap-1">
                {editingId === sub.id ? (
                  <div className="flex-1 flex items-center gap-1 p-1">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 text-sm bg-background border border-border-subtle rounded px-2 py-1"
                      autoFocus
                    />
                    <div className="flex gap-0.5">
                      {AVATAR_COLORS.map((c) => (
                        <button key={c} onClick={() => setEditColor(c)}
                          className={`h-4 w-4 rounded-full border-2 ${editColor === c ? "border-foreground" : "border-transparent"}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <button onClick={handleUpdate} className="p-1 text-primary"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-text-muted"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => { switchSubAccount(sub.id); setShowManager(false); }}
                      className={`flex-1 flex items-center gap-2.5 p-2 rounded-lg text-sm transition-colors ${
                        currentSubAccountId === sub.id ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-surface-hover"
                      }`}
                    >
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: sub.avatar_color }}>
                        {sub.name[0].toUpperCase()}
                      </div>
                      {sub.name}
                    </button>
                    <button onClick={() => { setEditingId(sub.id); setEditName(sub.name); setEditColor(sub.avatar_color); }}
                      className="p-1 text-text-muted hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => handleDelete(sub.id)}
                      className="p-1 text-text-muted hover:text-status-negative"><Trash2 className="h-3 w-3" /></button>
                  </>
                )}
              </div>
            ))}

            {/* Add new */}
            {subAccounts.length < 3 && (
              adding ? (
                <div className="mt-2 p-2 bg-background rounded-lg border border-border-subtle">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nome do perfil"
                    className="w-full text-sm bg-transparent border-none outline-none mb-2"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {AVATAR_COLORS.map((c) => (
                        <button key={c} onClick={() => setNewColor(c)}
                          className={`h-5 w-5 rounded-full border-2 ${newColor === c ? "border-foreground" : "border-transparent"}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setAdding(false)} className="text-xs text-text-muted px-2 py-1">Cancelar</button>
                      <button onClick={handleAdd} className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded font-medium">Criar</button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAdding(true)}
                  className="w-full flex items-center gap-2 p-2 mt-1 rounded-lg text-sm text-text-muted hover:text-primary hover:bg-surface-hover transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar perfil
                </button>
              )
            )}

            {subAccounts.length >= 3 && (
              <p className="text-xs text-text-muted mt-2 text-center">Máximo de 3 perfis atingido</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
