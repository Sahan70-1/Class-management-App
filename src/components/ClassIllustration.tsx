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

export function ClassIllustration() {
  return (
    <div className="class-illustration" aria-hidden="true">
      <span className="illustration-orbit orbit-one" />
      <span className="illustration-orbit orbit-two" />
      <span className="spark spark-one">✦</span>
      <span className="spark spark-two">✧</span>
      <span className="small-circle" />
      <div className="floating-check">
        <Check size={20} />
      </div>
      <div className="illustrated-book">
        <span />
        <span />
        <span />
        <span />
        <div className="book-spine" />
      </div>
      <div className="illustrated-calendar">
        <div className="calendar-binding">
          <i />
          <i />
        </div>
        <div className="illustration-calendar-head">YOUR NEXT CHAPTER</div>
        <div className="illustration-calendar-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              className={i === 5 ? "checked" : i === 2 ? "tinted" : ""}
              key={i}
            >
              {i === 5 ? <Check size={20} /> : ""}
            </span>
          ))}
        </div>
      </div>
      <div className="floating-cap">
        <GraduationCap size={35} />
      </div>
      <span className="illustration-dot" />
    </div>
  );
}
