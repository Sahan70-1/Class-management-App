import { Coins, Info } from "lucide-react";
import { useState } from "react";
import { money, monthText, type Student } from "../model";
import { Avatar } from "./Avatar";
import { Modal } from "./Modal";
export function PaymentModal({
  student,
  amount,
  month,
  onClose,
  onSave,
}: {
  student: Student;
  amount: number;
  month: string;
  onClose: () => void;
  onSave: (method: string) => Promise<void>;
}) {
  const [method, setMethod] = useState("Cash"),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title="Record a monthly payment"
      subtitle="This records the fee only. Attendance and tutes have separate actions."
      onClose={onClose}
    >
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave(method);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="payment-student">
          <Avatar student={student} />
          <div>
            <strong>{student.name}</strong>
            <span>{student.id}</span>
          </div>
        </div>
        <div className="payment-amount">
          <span>{monthText(month)} class fee</span>
          <strong>{money(amount)}</strong>
          <small>Full monthly payment · LKR</small>
        </div>
        <label>
          Payment method
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>Cash</option>
            <option>Bank transfer</option>
          </select>
        </label>
        <div className="callout">
          <Info size={17} />
          <span>
            Only record money you have received. A student’s monthly fee can be
            recorded once.
          </span>
        </div>
        <button className="button primary full" disabled={busy}>
          <Coins size={18} />
          {busy ? "Recording…" : "Confirm payment received"}
        </button>
      </form>
    </Modal>
  );
}
