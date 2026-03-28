import { cn } from "@/lib/utils";

const personColors = [
  { bg: "bg-person-claudia-bg", text: "text-person-claudia", border: "border-person-claudia/30" },
  { bg: "bg-person-pedro-bg", text: "text-person-pedro", border: "border-person-pedro/30" },
  { bg: "bg-person-costa-bg", text: "text-person-costa", border: "border-person-costa/30" },
];

interface PersonSelectorProps {
  value: string | null;
  onChange: (person: string | null) => void;
  people: string[];
}

export const PersonSelector = ({ value, onChange, people }: PersonSelectorProps) => {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {people.map((p, i) => {
        const colors = personColors[i % personColors.length];
        const isActive = value === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(isActive ? null : p)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
              isActive
                ? `${colors.bg} ${colors.text} ${colors.border}`
                : "bg-surface text-text-muted border-border-subtle hover:bg-surface-hover"
            )}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
};
