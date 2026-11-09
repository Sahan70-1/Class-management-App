import { Check, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { type EntityMap, type Role, type Student } from "../model";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Modal } from "./Modal";
export function TuteModal({
  classes,
  month,
  tutes,
  issues,
  students,
  role,
  onClose,
  onSave,
}: {
  classes: EntityMap["classes"][];
  month: string;
  tutes: EntityMap["tutes"][];
  issues: EntityMap["issues"][];
  students: Student[];
  role: Role;
  onClose: () => void;
  onSave: (t: EntityMap["tutes"]) => Promise<void>;
}) {
  const [classId, setClassId] = useState(classes[0]?.id || ""),
    [period, setPeriod] = useState(month),
    [title, setTitle] = useState(""),
    [busy, setBusy] = useState(false);
  const current = tutes.find(
    (t) => t.classId === classId && t.month === period,
  );
  useEffect(
    () => setTitle(current?.title || ""),
    [classId, period, current?.title],
  );
  const roster = students.filter((s) => s.classId === classId);
  return (
    <Modal
      title="A lesson worth keeping"
      subtitle="Manage tute titles and monthly distribution"
      onClose={onClose}
    >
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave({
              id: classId + "@" + period,
              classId,
              month: period,
              title: title.trim(),
            });
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            Class
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Month
            <input
              type="month"
              required
              value={period}
              onChange={(e) => {
                if (e.target.value) setPeriod(e.target.value);
              }}
            />
          </label>
        </div>
        <label>
          Lesson title
          <input
            required
            maxLength={150}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={role === "viewer"}
            placeholder="e.g. Perimeter & area"
          />
        </label>
        {role !== "viewer" && (
          <button className="button primary" disabled={busy || !title.trim()}>
            <Check size={17} />
            {busy ? "Saving…" : "Save lesson title"}
          </button>
        )}
        <div className="callout">
          <Info size={17} />
          <span>
            Editing a lesson title keeps existing issue records. Issue each tute
            separately at student check-in.
          </span>
        </div>
        <div className="tute-roster">
          {roster.map((s) => (
            <div key={s.id}>
              <Avatar student={s} size="small" />
              <strong>{s.name}</strong>
              <Badge
                tone={
                  issues.some(
                    (i) => i.tuteId === current?.id && i.studentId === s.id,
                  )
                    ? "mint"
                    : "amber"
                }
              >
                {issues.some(
                  (i) => i.tuteId === current?.id && i.studentId === s.id,
                )
                  ? "Issued"
                  : "Not issued"}
              </Badge>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
}
