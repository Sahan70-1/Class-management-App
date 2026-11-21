import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const catalogRef = useRef<HTMLDetailsElement>(null);
  const issuedTo = new Set(
    issues.filter((i) => i.tuteId === current?.id).map((i) => i.studentId),
  );
  const issuedCount = roster.filter((student) =>
    issuedTo.has(student.id),
  ).length;
  return (
    <Modal
      title="Manage tutes"
      onClose={confirmDelete ? () => setConfirmDelete(false) : onClose}
    >
      <form
        className="form tute-manager"
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
        <details className="tute-catalog" ref={catalogRef}>
          <summary>
            Saved tutes <span>({catalog.length})</span>
          </summary>
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
                      const details = catalogRef.current;
                      if (details) {
                        details.open = false;
                        details
                          .querySelector("summary")
                          ?.focus({ preventScroll: true });
                      }
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
        </details>
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
          <div className="tute-actions">
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
            {current && !current.deleted && !confirmDelete && (
              <button
                type="button"
                className="button white"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
              >
                Delete tute
              </button>
            )}
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        {current?.deleted && (
          <p className="form-hint">
            This tute was deleted. Restoring it keeps its issue history.
          </p>
        )}
        {role !== "viewer" && current && !current.deleted && confirmDelete && (
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
        )}
        <details className="tute-distribution">
          <summary>
            Distribution{" "}
            <span>
              ({issuedCount}/{roster.length} given)
            </span>
          </summary>
          <p className="form-hint">Issue each tute at student check-in.</p>
          <div className="tute-roster">
            {roster.map((s) => (
              <div key={s.id}>
                <Avatar student={s} size="small" />
                <strong>{s.name}</strong>
                <Badge tone={issuedTo.has(s.id) ? "mint" : "amber"}>
                  {issuedTo.has(s.id) ? "Given" : "Not given"}
                </Badge>
              </div>
            ))}
          </div>
        </details>
      </form>
    </Modal>
  );
}
