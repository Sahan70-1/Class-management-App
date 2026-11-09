import { useState, type FormEvent } from "react";
import { classGrade, validateClass, type ClassGroup } from "../model";

export function ClassForm({
  existing,
  onSave,
}: {
  existing: ClassGroup | null;
  onSave: (value: ClassGroup) => Promise<void>;
}) {
  const [grade, setGrade] = useState(existing ? classGrade(existing) : "");
  const [name, setName] = useState(existing?.name || "");
  const [fee, setFee] = useState(existing ? String(existing.fee) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const value: ClassGroup = {
      ...existing,
      id: existing?.id || "class-" + crypto.randomUUID(),
      grade,
      name: name.trim(),
      fee: fee.trim() ? Number(fee) : NaN,
      subject: existing?.subject || "Mathematics",
      room: existing?.room || "Main classroom",
      color: existing?.color || "teal",
    };
    const problem = validateClass(value);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this class.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <label>
        Grade
        <select
          required
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        >
          <option value="">Select a grade</option>
          {Array.from({ length: 13 }, (_, i) => (
            <option value={i + 1} key={i}>
              Grade {i + 1}
            </option>
          ))}
        </select>
      </label>
      <label>
        Class name
        <input
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Saturday mathematics"
        />
      </label>
      <label>
        Monthly fee (LKR)
        <input
          required
          type="number"
          min="0.01"
          max="1000000"
          step="0.01"
          inputMode="decimal"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="callout warning">
          {error}
        </p>
      )}
      <p className="form-hint">
        Fee changes apply to new payment records. Payments already recorded keep
        their original amount. Set class times separately in the timetable.
      </p>
      <button className="button primary full" disabled={busy}>
        {busy ? "Saving…" : existing ? "Save class changes" : "Add class"}
      </button>
    </form>
  );
}
