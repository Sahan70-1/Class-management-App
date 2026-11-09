import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { Icon } from "./Icon";
export function Stat({
  icon,
  label,
  value,
  foot,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  foot: string;
  tone: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={"stat-icon " + tone}>
          <Icon icon={icon} size={19} />
        </span>
      </div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-foot">{foot}</span>
    </div>
  );
}
