import {
  classGrade,
  money,
  timeText,
  sessionRoster,
  type Session,
  type ClassGroup,
  type Student,
  type Attendance,
  type Role,
} from "../model";

export function SessionOverview({
  session,
  group,
  students,
  attendance,
  role,
  onStart,
}: {
  session: Session;
  group: ClassGroup;
  students: Student[];
  attendance: Attendance[];
  role: Role;
  onStart: () => void;
}) {
  const summary = sessionRoster(session, students, attendance);
  return (
    <section aria-label="Class session overview">
      <h2>{group.name}</h2>
      <p className="overview-details">
        Grade {classGrade(group) || "not set"} · {group.subject} · {group.room}
      </p>
      <p className="overview-details">
        {timeText(session.start)} – {timeText(session.end)} · {money(group.fee)}{" "}
        / month ·{" "}
        {session.cancelled
          ? "Cancelled"
          : session.extra
            ? "Extra class"
            : "Weekly class"}
      </p>
      <div className="summary-numbers overview-counts">
        <div>
          <strong>{summary.total}</strong>
          <span>Students</span>
        </div>
        <div>
          <strong>{summary.present}</strong>
          <span>Present</span>
        </div>
        <div>
          <strong>{summary.notMarked}</strong>
          <span>Not marked</span>
        </div>
      </div>
      <h3 className="spaced-title">Attendance list</h3>
      <div className="overview-roster">
        {summary.rows.map(({ student, present }) => (
          <div className="detail-row" key={student.id}>
            <div>
              <strong>{student.name}</strong>
              <small className="cell-sub">
                {student.id} · Roll {student.roll}
              </small>
            </div>
            <span className={"badge " + (present ? "mint" : "amber")}>
              {present ? "Present" : "Not marked"}
            </span>
          </div>
        ))}
        {summary.total === 0 && (
          <p className="muted padded">
            No students registered in this class yet.
          </p>
        )}
      </div>
      {role !== "viewer" && (
        <button
          className="button primary full overview-start"
          onClick={onStart}
          disabled={session.cancelled}
        >
          Start scanning
        </button>
      )}
    </section>
  );
}
