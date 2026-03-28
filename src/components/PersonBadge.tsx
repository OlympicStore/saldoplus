import { cn } from "@/lib/utils";

const personColors = [
  { bg: "bg-person-claudia-bg", text: "text-person-claudia" },
  { bg: "bg-person-pedro-bg", text: "text-person-pedro" },
  { bg: "bg-person-costa-bg", text: "text-person-costa" },
];

interface PersonBadgeProps {
  person: string | null;
  people: string[];
  className?: string;
}

export const PersonBadge = ({ person, people, className }: PersonBadgeProps) => {
  if (!person) return <span className="text-sm text-text-muted">—</span>;
  const idx = people.indexOf(person);
  const colors = personColors[idx >= 0 ? idx % personColors.length : 0];
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", colors.bg, colors.text, className)}>
      {person}
    </span>
  );
};
