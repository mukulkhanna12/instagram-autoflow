import { BarChart3, Rocket, ShieldCheck, Workflow, Wrench } from "lucide-react";
import type { Category } from "@/lib/help/articles";

const ICONS = { rocket: Rocket, workflow: Workflow, chart: BarChart3, wrench: Wrench, shield: ShieldCheck };

export function CategoryIcon({ icon, className }: { icon: Category["icon"]; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon className={className} />;
}
