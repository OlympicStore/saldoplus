import { useState } from "react";
import { Plus, Tag } from "lucide-react";
import type { Category, CategoryType } from "@/types/category";
import { CATEGORY_TYPE_LABELS, CATEGORY_TYPE_COLORS } from "@/types/category";

interface CategoriesManagerProps {
  categories: Category[];
  onAdd: (category: Omit<Category, "id">) => void;
  onUpdate: (id: string, updates: Partial<Category>) => void;
  onDelete: (id: string) => void;
}

const typeOrder: CategoryType[] = ["fixo", "inevitavel", "nao_essencial"];

export const CategoriesManager = ({ categories, onAdd, onUpdate, onDelete }: CategoriesManagerProps) => {
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<CategoryType>("inevitavel");

  const handleAdd = () => {
    if (!newName.trim()) return;
    if (categories.some(c => c.name.toLowerCase() === newName.trim().toLowerCase())) return;
    onAdd({ name: newName.trim(), type: newType });
    setNewName("");
  };

  const nextType = (current: CategoryType): CategoryType => {
    const idx = typeOrder.indexOf(current);
    return typeOrder[(idx + 1) % typeOrder.length];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Categorias</h3>
          <p className="text-xs text-text-muted mt-0.5">Define o tipo para cada categoria. Isto controla automaticamente relatórios e gráficos.</p>
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
        <select value={newType} onChange={(e) => setNewType(e.target.value as CategoryType)}
          className="text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
          {typeOrder.map(t => <option key={t} value={t}>{CATEGORY_TYPE_LABELS[t]}</option>)}
        </select>
        <button onClick={handleAdd} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Categories by type */}
      {typeOrder.map(type => {
        const cats = categories.filter(c => c.type === type);
        const colors = CATEGORY_TYPE_COLORS[type];
        return (
          <div key={type}>
            <span className="label-caps mb-2 block">{CATEGORY_TYPE_LABELS[type]}</span>
            <div className="flex flex-wrap gap-2">
              {cats.length === 0 && <p className="text-xs text-text-muted">Nenhuma categoria</p>}
              {cats.map(cat => (
                <span key={cat.id} className={`inline-flex items-center gap-1.5 text-xs ${colors.bg} ${colors.text} px-2.5 py-1.5 rounded-lg border ${colors.border}`}>
                  <Tag className="h-3 w-3" />
                  {cat.name}
                  <button onClick={() => onUpdate(cat.id, { type: nextType(cat.type) })}
                    className="hover:opacity-70 transition-opacity text-[10px] font-bold ml-1" title={`Mudar para ${CATEGORY_TYPE_LABELS[nextType(cat.type)]}`}>⇄</button>
                  <button onClick={() => onDelete(cat.id)} className="hover:text-status-negative transition-colors">×</button>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
