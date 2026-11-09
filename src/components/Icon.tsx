import { type LucideIcon } from "lucide-react";

export function Icon({
  icon: I,
  size = 20,
  ...props
}: {
  icon: LucideIcon;
  size?: number;
  className?: string;
}) {
  return <I size={size} strokeWidth={1.8} {...props} />;
}
