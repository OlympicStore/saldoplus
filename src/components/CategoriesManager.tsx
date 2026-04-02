import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2, Tag } from "lucide-react";
import type { Category } from "@/types/category";

interface CategoriesManagerProps {
  categories: Category[];
  onAdd: (category: Omit<Category, "id">) => void;
  onUpdate: (id: string, updates: Partial<Category>) => void;
  onDelete: (id: string) => void;
}

export const CategoriesManager = ({ categories, onAdd, onUpdate, onDelete }: CategoriesManagerProps) => {
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"fixo" | "variavel">("variavel");

  const handleAdd = () => {
    if (!newName.trim()) return;
    if (categories.some(c => c.name.toLowerCase() === newName.trim().toLowerCase())) return;
    onAdd({ name: newName.trim(), type: newType });
    setNewName("");
  };

  const fixedCats = categories.filter(c => c.type === "fixo");
  const variableCats = categories.filter(c => c.type === "variavel");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Categorias</h3>
          <p className="text-xs text-text-muted mt-0.5">Define o tipo (Fixo/Variável) para cada categoria. Isto controla automaticamente relatórios e gráficos.</p>
        </div>
      </div>

      {/* Add form */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Nova categoria (ex: Netflix, Gasolina)"
            className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <select value={newType} onChange={(e) => setNewType(e.target.value as "fixo" | "variavel")}
          className="text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="fixo">Fixo</option>
          <option value="variavel">Variável</option>
        </select>
        <button onClick={handleAdd} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Fixed categories */}
      <div>
        <span className="label-caps mb-2 block">Fixos</span>
        <div className="flex flex-wrap gap-2">
          {fixedCats.length === 0 && <p className="text-xs text-text-muted">Nenhuma categoria fixa</p>}
          {fixedCats.map(cat => (
            <span key={cat.id} className="inline-flex items-center gap-1.5 text-xs bg-blue-500/10 text-blue-600 px-2.5 py-1.5 rounded-lg border border-blue-500/20">
              <Tag className="h-3 w-3" />
              {cat.name}
              <button onClick={() => onUpdate(cat.id, { type: "variavel" })}
                className="text-blue-400 hover:text-amber-500 transition-colors text-[10px] font-bold ml-1" title="Mudar para variável">⇄</button>
              <button onClick={() => onDelete(cat.id)} className="text-blue-400 hover:text-status-negative transition-colors">×</button>
            </span>
          ))}
        </div>
      </div>

      {/* Variable categories */}
      <div>
        <span className="label-caps mb-2 block">Variáveis</span>
        <div className="flex flex-wrap gap-2">
          {variableCats.length === 0 && <p className="text-xs text-text-muted">Nenhuma categoria variável</p>}
          {variableCats.map(cat => (
            <span key={cat.id} className="inline-flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-600 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
              <Tag className="h-3 w-3" />
              {cat.name}
              <button onClick={() => onUpdate(cat.id, { type: "fixo" })}
                className="text-amber-400 hover:text-blue-500 transition-colors text-[10px] font-bold ml-1" title="Mudar para fixo">⇄</button>
              <button onClick={() => onDelete(cat.id)} className="text-amber-400 hover:text-status-negative transition-colors">×</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
