import {
  ChartNoAxesCombined,
  LayoutDashboard,
  ScanLine,
  Users,
  type LucideIcon,
} from "lucide-react";

export type Tab = "Today" | "Scan" | "Students" | "Reports";

export const nav: { name: Tab; icon: LucideIcon; description: string }[] = [
  { name: "Today", icon: LayoutDashboard, description: "Your teaching day" },
  { name: "Scan", icon: ScanLine, description: "Check in a student" },
  { name: "Students", icon: Users, description: "Your student directory" },
  {
    name: "Reports",
    icon: ChartNoAxesCombined,
    description: "A clearer picture",
  },
];

export type DialogName =
  | "classes"
  | "calendar"
  | "manage"
  | "overview"
  | "free"
  | "weekly"
  | "extra"
  | "schedule"
  | "history"
  | "activity"
  | "settings"
  | "sync"
  | "register"
  | "qr"
  | "profile"
  | "payment"
  | "tutes";
export type SetDialog = (dialog: DialogName | null) => void;

export function nextDialogPath(
  path: readonly DialogName[],
  next: DialogName | null,
  replace = false,
): readonly DialogName[] {
  if (next === null) return path.slice(0, -1);
  const previous = replace ? path.slice(0, -1) : path;
  const index = previous.indexOf(next);
  // Selecting a date can revisit Your classes from Calendar, or vice versa.
  return index < 0 ? [...previous, next] : previous.slice(0, index + 1);
}
