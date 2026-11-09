import React, {
  useEffect,
  useState,
  useSyncExternalStore,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  GraduationCap,
  LayoutDashboard,
  ScanLine,
  Users,
  ChartNoAxesCombined,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  Plus,
  Clock,
  Cloud as CloudCheck,
  CloudOff,
  RefreshCw,
  Settings,
  Search,
  ArrowRight,
  Check,
  CheckCheck,
  Coins,
  BookOpen,
  MapPin,
  Ellipsis,
  Download,
  X,
  Camera,
  Info,
  History as HistoryIcon,
  LogOut,
  ShieldCheck,
  WifiOff,
  CalendarClock,
  SlidersHorizontal,
  ArrowLeft,
  Printer,
  ImagePlus,
  Menu,
  Mail,
  TriangleAlert,
  Sun,
  CheckCircle2,
  FileText,
  Bell,
  Layers,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import {
  initialize,
  subscribe,
  getSnapshot,
  mutate,
  sync,
  discardConflict,
} from "../store";
import {
  todayISO,
  addDays,
  weekday,
  dateObject,
  monthOf,
  monthText,
  shortDate,
  timeText,
  money,
  values,
  sessionsFor,
  freeSlots,
  findConflict,
  overlaps,
  qrStudentId,
  type Session,
  type Student,
  type Role,
  type Schedule,
  type Override,
  type EntityMap,
  type Entity,
  type StoredRecord,
} from "../model";

export function MiniCalendar({
  date,
  onDate,
  schedules,
  overrides,
}: {
  date: string;
  onDate: (date: string) => void;
  schedules: Schedule[];
  overrides: Override[];
}) {
  const [view, setView] = useState(date.slice(0, 7));
  useEffect(() => setView(date.slice(0, 7)), [date]);
  const first = view + "-01",
    offset = (weekday(first) + 6) % 7,
    count = new Date(
      Number(view.slice(0, 4)),
      Number(view.slice(5)),
      0,
    ).getDate();
  const move = (n: number) => {
    const d = new Date(first + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + n);
    setView(d.toISOString().slice(0, 7));
  };
  return (
    <div className="mini-calendar panel">
      <div className="calendar-heading">
        <h3>{monthText(view)}</h3>
        <div>
          <button
            className="icon-button"
            aria-label="Previous month"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Next month"
            onClick={() => move(1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span className="weekday" key={i}>
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={"blank" + i} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const d = view + "-" + String(i + 1).padStart(2, "0");
          const has = sessionsFor(d, schedules, overrides).some(
            (s) => !s.cancelled,
          );
          return (
            <button
              aria-label={d}
              className={
                (date === d ? "selected " : "") +
                (d === todayISO() ? "today " : "")
              }
              key={d}
              onClick={() => onDate(d)}
            >
              {i + 1}
              <i className={has ? "has-class" : ""} />
            </button>
          );
        })}
      </div>
      <div className="calendar-legend">
        <i />
        Class scheduled
        <span>
          <i />
          Selected day
        </span>
      </div>
    </div>
  );
}
