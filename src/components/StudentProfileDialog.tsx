import { ScanLine, UserRound } from "lucide-react";
import React from "react";
import {
  money,
  monthText,
  type Attendance,
  type ClassGroup,
  type Fee,
  type Issue,
  type Role,
  type Student,
} from "../model";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Modal } from "./Modal";
export function StudentProfileDialog({
  setModal,
  student,
  classes,
  attendance,
  fees,
  issues,
  role,
}: {
  setModal: React.Dispatch<React.SetStateAction<string | null>>;
  student: Student;
  classes: ClassGroup[];
  attendance: Attendance[];
  fees: Fee[];
  issues: Issue[];
  role: Role;
}) {
  return (
    <Modal
      title="Student profile"
      subtitle="Details, attendance, fees and tutes"
      onClose={() => setModal(null)}
    >
      <div className="profile-header">
        <Avatar student={student} size="large" />
        <div>
          <h2>{student.name}</h2>
          <p>
            {student.id} · {classes.find((c) => c.id === student.classId)?.name}
          </p>
          <small>Class roll {student.roll}</small>
        </div>
      </div>
      <div className="profile-details">
        {[
          ["Student phone", student.phone],
          ["Parent phone", student.parentPhone],
          ["WhatsApp", student.whatsapp],
          ["Address", student.address],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value || "Not provided"}</strong>
          </div>
        ))}
      </div>
      <div className="profile-stats">
        <div>
          <strong>
            {attendance.filter((a) => a.studentId === student.id).length}
          </strong>
          <span>Classes attended</span>
        </div>
        <div>
          <strong>
            {money(
              fees
                .filter((f) => f.studentId === student.id)
                .reduce((n, f) => n + f.amount, 0),
            )}
          </strong>
          <span>Total fees recorded</span>
        </div>
        <div>
          <strong>
            {issues.filter((i) => i.studentId === student.id).length}
          </strong>
          <span>Tutes issued</span>
        </div>
      </div>
      <div className="modal-action-row">
        <button className="button primary" onClick={() => setModal("qr")}>
          <ScanLine size={17} />
          View student QR
        </button>
        {role === "admin" && (
          <button className="button white" onClick={() => setModal("register")}>
            <UserRound size={17} />
            Edit student
          </button>
        )}
      </div>
      <h3 className="spaced-title">Recent payments</h3>
      {fees
        .filter((f) => f.studentId === student.id)
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 6)
        .map((f) => (
          <div className="detail-row" key={f.id}>
            <span>{monthText(f.month)}</span>
            <strong>{money(f.amount)}</strong>
            <Badge tone="mint">Paid</Badge>
          </div>
        ))}
      {!fees.some((f) => f.studentId === student.id) && (
        <p className="muted">No payments recorded yet.</p>
      )}
    </Modal>
  );
}
