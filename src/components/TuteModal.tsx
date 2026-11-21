import { Check, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { monthText, type EntityMap, type Role, type Student } from "../model";
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
    [busy, setBusy] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false),
    [error, setError] = useState("");
  const catalog = tutes
    .filter((t) => !t.deleted)
    .sort(
      (a, b) =>
        b.month.localeCompare(a.month) || a.title.localeCompare(b.title),
    );
  async function persist(tute: EntityMap["tutes"]) {
    setBusy(true);
    setError("");
    try {
      await onSave(tute);
      setConfirmDelete(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save tute.");
    } finally {
      setBusy(false);
    }
  }
  const current = tutes.find(
    (t) => t.classId === classId && t.month === period,
  );
  useEffect(() => {
    setTitle(current?.title || "");
    setConfirmDelete(false);
    setError("");
  }, [classId, period, current?.title, current?.deleted]);
  const roster = students.filter((s) => s.classId === classId);
  return (
    <Modal
      title="Manage tutes"
      subtitle="Manage tute titles and monthly distribution"
      onClose={onClose}
    >
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (role === "viewer" || busy || confirmDelete) return;
          await persist({
            id: classId + "@" + period,
            classId,
            month: period,
            title: title.trim(),
          });
        }}
      >
        <section aria-label="Saved tutes" className="tute-catalog">
          <h3>Saved tutes</h3>
          {catalog.length ? (
            <ul>
              {catalog.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    aria-pressed={current?.id === t.id}
                    disabled={busy}
                    onClick={() => {
                      setClassId(t.classId);
                      setPeriod(t.month);
                    }}
                  >
                    <strong>{t.title}</strong>
                    <small>
                      {classes.find((c) => c.id === t.classId)?.name} ·{" "}
                      {monthText(t.month)}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No saved tutes yet.</p>
          )}
        </section>
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
          <button
            className="button primary"
            disabled={busy || !title.trim() || confirmDelete || !classId}
          >
            <Check size={17} />
            {busy
              ? "Saving…"
              : current?.deleted
                ? "Restore tute"
                : "Save lesson title"}
          </button>
        )}
        {error && <p role="alert">{error}</p>}
        {current?.deleted && (
          <p className="form-hint">
            This tute was deleted. Restoring it keeps its issue history.
          </p>
        )}
        {role !== "viewer" &&
          current &&
          !current.deleted &&
          (confirmDelete ? (
            <div className="callout warning tute-confirm">
              <strong>Delete “{current.title}”?</strong>
              <p>
                It will be removed from check-in. Past issue records stay in
                reports.
              </p>
              <div>
                <button
                  type="button"
                  className="button white"
                  disabled={busy}
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep tute
                </button>
                <button
                  type="button"
                  className="button danger"
                  disabled={busy}
                  onClick={() => persist({ ...current, deleted: true })}
                >
                  Confirm delete
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="button white"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              Delete tute
            </button>
          ))}
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
                  ? "Given"
                  : "Not given"}
              </Badge>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
}
