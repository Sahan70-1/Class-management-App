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
