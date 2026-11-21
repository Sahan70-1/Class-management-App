import { Check, Clock, Plus, ShieldCheck } from "lucide-react";
import { useId, useState } from "react";
import {
  freeSlots,
  sessionsFor,
  shortDate,
  timeText,
  type EntityMap,
  type Override,
  type Role,
  type Schedule,
} from "../model";
import { Modal } from "./Modal";
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
  const headingId = useId();
  const selectedSlot = slots.find((slot) => slot.start === choice);
  return (
    <Modal
      title="Find free slot"
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
          <span id={headingId}>Available times</span>{" "}
          <small className="muted">· {shortDate(day)}</small>
        </h3>
        {slots.length > 0 && (
          <select
            className="slot-picker"
            aria-labelledby={headingId}
            value={selectedSlot?.start || ""}
            onChange={(e) => setChoice(e.target.value)}
          >
            <option value="" disabled>
              Choose a time
            </option>
            {slots.map((s) => (
              <option value={s.start} key={s.start}>
                {timeText(s.start)} – {timeText(s.end)}
              </option>
            ))}
          </select>
        )}
        {slots.length > 0 && (
          <div className="slot-list">
            {slots.map((s) => (
              <button
                className={choice === s.start ? "selected" : ""}
                aria-pressed={choice === s.start}
                key={s.start}
                onClick={() => setChoice(s.start)}
              >
                <span className="radio-dot" />
                {timeText(s.start)} – {timeText(s.end)}
                {choice === s.start && <Check size={16} />}
              </button>
            ))}
          </div>
        )}
        {!slots.length && (
          <p className="muted">
            No free {duration / 60}-hour slot. Choose another date or a shorter
            lesson.
          </p>
        )}
        {role !== "viewer" && (
          <button
            className="button primary full"
            disabled={!selectedSlot || !classId || busy}
            onClick={async () => {
              if (!selectedSlot) return;
              setBusy(true);
              try {
                await onChoose(
                  classId,
                  day,
                  selectedSlot.start,
                  selectedSlot.end,
                );
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
