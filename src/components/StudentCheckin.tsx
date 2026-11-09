import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  Coins,
  Info,
} from "lucide-react";
import {
  monthOf,
  monthText,
  sessionsFor,
  shortDate,
  timeText,
  type EntityMap,
  type Override,
  type Role,
  type Schedule,
  type Session,
  type Student,
} from "../model";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
export function StudentCheckin({
  student,
  status,
  session,
  className,
  tuteTitle,
  date,
  role,
  attendance,
  schedules,
  overrides,
  onBack,
  onAttendance,
  onPayment,
  onIssue,
  onDetails,
}: {
  student: Student;
  status: { present: boolean; paid: boolean; issued: boolean };
  session: Session | null;
  className: string;
  tuteTitle?: string;
  date: string;
  role: Role;
  attendance: EntityMap["attendance"][];
  schedules: Schedule[];
  overrides: Override[];
  onBack: () => void;
  onAttendance: () => void;
  onPayment: () => void;
  onIssue: () => void;
  onDetails: () => void;
}) {
  const days = Array.from(
    {
      length: new Date(
        Number(date.slice(0, 4)),
        Number(date.slice(5, 7)),
        0,
      ).getDate(),
    },
    (_, i) => date.slice(0, 7) + "-" + String(i + 1).padStart(2, "0"),
  ).filter((d) =>
    sessionsFor(d, schedules, overrides).some(
      (s) => s.classId === student.classId,
    ),
  );
  return (
    <div className="panel checkin-card">
      <button className="text-button muted" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to scanner
      </button>
      <div className="checkin-person">
        <Avatar student={student} size="large" />
        <div>
          <Badge tone="mint">{className}</Badge>
          <h2>{student.name}</h2>
          <p>
            {student.id} <span>·</span> Roll {student.roll}
          </p>
          <button className="text-button" onClick={onDetails}>
            View student details
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
      <div className="checkin-status">
        <div className={status.present ? "done" : ""}>
          <CalendarDays size={21} />
          <span>
            <strong>Attendance</strong>
            <small>
              {shortDate(date)} · {session ? timeText(session.start) : ""}
            </small>
          </span>
          <Badge tone={status.present ? "mint" : "amber"}>
            {status.present ? "Present" : "Not marked"}
          </Badge>
        </div>
        <div className={status.paid ? "done" : ""}>
          <Coins size={21} />
          <span>
            <strong>{monthText(monthOf(date)).split(" ")[0]} fees</strong>
            <small>Monthly class payment</small>
          </span>
          <Badge tone={status.paid ? "mint" : "amber"}>
            {status.paid ? "Paid" : "Unpaid"}
          </Badge>
        </div>
        <div className={status.issued ? "done" : ""}>
          <BookOpen size={21} />
          <span>
            <strong>{monthText(monthOf(date)).split(" ")[0]} tute</strong>
            <small>{tuteTitle || "No lesson title set"}</small>
          </span>
          <Badge tone={status.issued ? "mint" : "amber"}>
            {status.issued ? "Issued" : "Not issued"}
          </Badge>
        </div>
      </div>
      {role !== "viewer" && (
        <div className="checkin-actions">
          <button
            className="button primary full"
            onClick={onAttendance}
            disabled={status.present || session?.cancelled}
          >
            <CheckCheck size={18} />
            {status.present ? "Attendance marked" : "Mark attendance"}
          </button>
          <div>
            <button
              className="button white"
              onClick={onPayment}
              disabled={status.paid}
            >
              <Coins size={17} />
              {status.paid ? "Payment recorded" : "Record payment"}
            </button>
            <button
              className="button white"
              onClick={onIssue}
              disabled={status.issued || !tuteTitle}
            >
              <BookOpen size={17} />
              {status.issued ? "Tute issued" : "Issue tute"}
            </button>
          </div>
          <p>
            <Info size={13} />
            Each action saves separately.
          </p>
        </div>
      )}
      <h3 className="spaced-title">
        Monthly attendance <span>{monthText(monthOf(date))}</span>
      </h3>
      <div className="attendance-days">
        {days.map((d) => {
          const marked = attendance.some(
            (a) => a.studentId === student.id && a.date === d,
          );
          return (
            <div
              className={marked ? "present" : d === date ? "current" : ""}
              key={d}
            >
              <strong>{shortDate(d)}</strong>
              <span>
                {marked ? (
                  <Check size={18} />
                ) : d === date ? (
                  "Today"
                ) : d > date ? (
                  "Scheduled"
                ) : (
                  "Not marked"
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
