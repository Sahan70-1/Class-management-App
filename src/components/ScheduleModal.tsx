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
export function ScheduleModal({
  mode,
  session,
  date,
  records,
  role,
  onClose,
  onSave,
}: {
  mode: string;
  session: Session | null;
  date: string;
  records: StoredRecord[];
  role: Role;
  onClose: () => void;
  onSave: (
    entity: "schedules" | "overrides",
    value: Schedule | Override,
  ) => Promise<void>;
}) {
  const classes = values(records, "classes"),
    schedules = values(records, "schedules"),
    overrides = values(records, "overrides");
  const [classId, setClassId] = useState(
      session?.classId || classes[0]?.id || "",
    ),
    [day, setDay] = useState(session?.date || date),
    [start, setStart] = useState(session?.start || "14:00"),
    [end, setEnd] = useState(session?.end || "16:00"),
    [scope, setScope] = useState<"day" | "onward">("day"),
    [cancel, setCancel] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const original = schedules.find((s) => s.id === session?.scheduleId);
  const extra = mode === "extra" || !!original?.extraDate;
  const duration = Math.max(
    30,
    Number(end.slice(0, 2)) * 60 +
      Number(end.slice(3)) -
      Number(start.slice(0, 2)) * 60 -
      Number(start.slice(3)),
  );
  const free = freeSlots(day, duration, schedules, overrides, original?.id);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (role !== "admin") return;
    if (start >= end) {
      setError("End time must be later than the start time.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "schedule" && original && scope === "day") {
        const change: Override = {
          id: original.id + "@" + day,
          scheduleId: original.id,
          date: day,
          start,
          end,
          cancelled: cancel,
        };
        const conflict =
          !cancel &&
          sessionsFor(day, schedules, overrides).some(
            (s) =>
              s.scheduleId !== original.id &&
              !s.cancelled &&
              overlaps(s, change),
          );
        if (conflict) {
          setError(
            "This time overlaps another class. Choose a free time below.",
          );
          return;
        }
        await onSave("overrides", change);
      } else {
        const next: Schedule = original
          ? {
              ...original,
              versions: [
                ...original.versions
                  .filter((v) => v.from < day)
                  .map((v) => ({
                    ...v,
                    until:
                      v.until && v.until < day ? v.until : addDays(day, -1),
                  })),
                {
                  from: day,
                  weekday: weekday(day),
                  start,
                  end,
                  cancelled: cancel,
                },
              ],
            }
          : {
              id: (extra ? "extra-" : "weekly-") + crypto.randomUUID(),
              classId,
              extraDate: extra ? day : undefined,
              versions: [{ from: day, weekday: weekday(day), start, end }],
            };
        const conflict = findConflict(next, schedules, overrides);
        if (conflict) {
          setError(
            "This overlaps " +
              (classes.find((c) => c.id === conflict.session.classId)?.name ||
                "another class") +
              " on " +
              shortDate(conflict.date) +
              ". Choose a free time.",
          );
          return;
        }
        await onSave("schedules", next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save schedule.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        mode === "schedule"
          ? "Edit class session"
          : extra
            ? "Add an extra class"
            : "Add a weekly class"
      }
      subtitle={
        mode === "schedule"
          ? "Choose how this change applies. Past records stay intact."
          : "One tutor, one timetable. We check for overlaps."
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="form">
        <label>
          Class
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            disabled={!!original}
          >
            {classes.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name} · {c.subject}
              </option>
            ))}
          </select>
        </label>
        <label>
          {extra
            ? "Class date"
            : mode === "schedule"
              ? "Session / effective date"
              : "First class date (repeats weekly)"}
          <input
            type="date"
            required
            value={day}
            disabled={mode === "schedule"}
            onChange={(e) => {
              if (e.target.value) setDay(e.target.value);
            }}
          />
        </label>
        <div className="form-grid">
          <label>
            Start time
            <input
              type="time"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
              disabled={cancel}
            />
          </label>
          <label>
            End time
            <input
              type="time"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              disabled={cancel}
            />
          </label>
        </div>
        {mode === "schedule" && (
          <>
            <fieldset>
              <legend>Apply this change to</legend>
              <label className="radio-card">
                <input
                  type="radio"
                  checked={scope === "day"}
                  onChange={() => setScope("day")}
                />
                <div>
                  <strong>This day only</strong>
                  <small>Other class dates stay as scheduled.</small>
                </div>
              </label>
              {!extra && (
                <label className="radio-card">
                  <input
                    type="radio"
                    checked={scope === "onward"}
                    onChange={() => setScope("onward")}
                  />
                  <div>
                    <strong>From this day onward</strong>
                    <small>
                      Update the weekly timetable from {shortDate(day)}.
                    </small>
                  </div>
                </label>
              )}
            </fieldset>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={cancel}
                onChange={(e) => setCancel(e.target.checked)}
              />
              Cancel{" "}
              {scope === "day"
                ? "this session"
                : "classes from this day onward"}
            </label>
          </>
        )}
        {error && (
          <div role="alert" className="callout warning">
            <TriangleAlert size={18} />
            {error}
          </div>
        )}
        {error && free.length > 0 && (
          <div className="free-suggestions">
            <strong>Available on {shortDate(day)}</strong>
            {free.slice(0, 4).map((slot) => (
              <button
                type="button"
                className="button white"
                key={slot.start}
                onClick={() => {
                  setStart(slot.start);
                  setEnd(slot.end);
                  setError("");
                }}
              >
                {timeText(slot.start)} – {timeText(slot.end)}
              </button>
            ))}
          </div>
        )}
        <div className="callout">
          <HistoryIcon size={17} />
          <span>
            Every schedule change is recorded with its date and author. Weekly
            overlaps are checked up to a year ahead.
          </span>
        </div>
        <button
          type="submit"
          className={"button full " + (cancel ? "danger" : "primary")}
          disabled={busy || role !== "admin"}
        >
          {cancel
            ? "Save cancellation"
            : busy
              ? "Saving…"
              : "Save class schedule"}
          <Check size={17} />
        </button>
      </form>
    </Modal>
  );
}
