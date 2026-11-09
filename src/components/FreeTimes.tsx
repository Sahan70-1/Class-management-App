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
import {Modal} from './Modal';
export function FreeTimes({
  date,
  classes,
  schedules,
  overrides,
  role,
  onClose,
  onChoose,
}: {
  date: string;
  classes: EntityMap["classes"][];
  schedules: Schedule[];
  overrides: Override[];
  role: Role;
  onClose: () => void;
  onChoose: (
    classId: string,
    date: string,
    start: string,
    end: string,
  ) => Promise<void>;
}) {
  const [day, setDay] = useState(date),
    [classId, setClassId] = useState(classes[0]?.id || ""),
    [duration, setDuration] = useState(120),
    [choice, setChoice] = useState(""),
    [busy, setBusy] = useState(false);
  const busySessions = sessionsFor(day, schedules, overrides).filter(
    (s) => !s.cancelled,
  );
  const slots = freeSlots(day, duration, schedules, overrides);
  return (
    <Modal
      title="Find a little breathing room"
      subtitle="Available times across your full teaching timetable"
      onClose={onClose}
    >
      <div className="form">
        <label>
          Class
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Date
            <input
              type="date"
              value={day}
              onChange={(e) => {
                if (e.target.value) {
                  setDay(e.target.value);
                  setChoice("");
                }
              }}
            />
          </label>
          <label>
            Lesson duration
            <select
              value={duration}
              onChange={(e) => {
                setDuration(Number(e.target.value));
                setChoice("");
              }}
            >
              <option value="60">1 hour</option>
              <option value="90">1½ hours</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
            </select>
          </label>
        </div>
        <div className="callout">
          <Clock size={18} />
          <span>
            Teaching hours: 8:00 AM – 8:00 PM
            {busySessions.length > 0 && (
              <>
                <br />
                {busySessions
                  .map((s) => timeText(s.start) + "–" + timeText(s.end))
                  .join(", ")}{" "}
                already scheduled.
              </>
            )}
          </span>
        </div>
        <h3>
          Available times <small className="muted">· {shortDate(day)}</small>
        </h3>
        <div className="slot-list">
          {slots.map((s) => (
            <button
              className={choice === s.start ? "selected" : ""}
              key={s.start}
              onClick={() => setChoice(s.start)}
            >
              <span className="radio-dot" />
              {timeText(s.start)} – {timeText(s.end)}
              {choice === s.start && <Check size={16} />}
            </button>
          ))}
          {!slots.length && (
            <p className="muted">
              No free {duration / 60}-hour slot. Choose another date or a
              shorter lesson.
            </p>
          )}
        </div>
        {role === "admin" && (
          <button
            className="button primary full"
            disabled={!choice || busy}
            onClick={async () => {
              const slot = slots.find((s) => s.start === choice);
              if (!slot) return;
              setBusy(true);
              try {
                await onChoose(classId, day, slot.start, slot.end);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Plus size={18} />
            {busy ? "Adding…" : "Use time for extra class"}
          </button>
        )}
        <span className="form-hint">
          <ShieldCheck size={15} />
          Overlaps are checked again when your change syncs.
        </span>
      </div>
    </Modal>
  );
}
