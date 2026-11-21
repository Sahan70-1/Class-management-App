import type { SetDialog } from "../navigation";
import {
  CalendarClock,
  CalendarDays,
  Clock,
  Ellipsis,
  GraduationCap,
  MapPin,
  Plus,
  Settings,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import {
  shortDate,
  timeText,
  type Attendance,
  type ClassGroup,
  type Role,
  type Session,
  type Student,
} from "../model";
import { plural } from "../utils";
import { Badge } from "./Badge";
import { Avatar } from "./Avatar";
import { Modal } from "./Modal";

export function ClassSessions({
  sessions,
  date,
  classes,
  students,
  attendance,
  role,
  openClass,
  scheduleEditor,
  setModal,
  setEditing,
}: {
  sessions: Session[];
  date: string;
  classes: ClassGroup[];
  students: Student[];
  attendance: Attendance[];
  role: Role;
  openClass: (session: Session) => void;
  scheduleEditor: (session: Session) => void;
  setModal: SetDialog;
  setEditing: React.Dispatch<React.SetStateAction<Session | null>>;
}) {
  return (
    <Modal
      title="Your classes"
      subtitle={shortDate(date)}
      wide
      onClose={() => setModal(null)}
    >
      <button className="button white" onClick={() => setModal("calendar")}>
        <CalendarDays size={16} />
        Choose date
      </button>
      <div className="class-list">
        {sessions.map((session, i) => {
          const c = classes.find((c) => c.id === session.classId)!;
          if (!c) return null;
          const count = students.filter((s) => s.classId === c.id).length;
          const marked = attendance.filter(
            (a) =>
              a.sessionId === session.id &&
              students.some((s) => s.id === a.studentId),
          ).length;
          return (
            <article
              key={session.id}
              className={
                "class-card " +
                c.color +
                (session.cancelled ? " cancelled" : "")
              }
            >
              <div className="class-card-top">
                <div className={"class-icon " + c.color}>
                  <GraduationCap size={25} />
                </div>
                <div className="class-name">
                  <div>
                    <h3>{c.name}</h3>
                    <Badge
                      tone={
                        session.cancelled
                          ? "neutral"
                          : session.extra
                            ? "violet"
                            : i === 0
                              ? "mint"
                              : "neutral"
                      }
                      dot
                    >
                      {session.cancelled
                        ? "Cancelled"
                        : session.extra
                          ? "Extra class"
                          : i === 0
                            ? "Weekly class"
                            : "Weekly class"}
                    </Badge>
                  </div>
                  <p>{c.subject}</p>
                </div>
                {role !== "viewer" && (
                  <button
                    className="icon-button class-options"
                    aria-label={"Manage " + c.name}
                    onClick={() => scheduleEditor(session)}
                  >
                    <Ellipsis size={20} />
                  </button>
                )}
              </div>
              <div className="class-meta">
                <span>
                  <Clock size={15} />
                  {timeText(session.start)} <span className="time-dash">–</span>{" "}
                  {timeText(session.end)}
                </span>
                <span>
                  <MapPin size={15} />
                  {c.room}
                </span>
              </div>
              <div className="class-footer">
                <div className="class-students">
                  <div className="avatar-stack">
                    {students
                      .filter((s) => s.classId === c.id)
                      .slice(0, 3)
                      .map((s) => (
                        <Avatar key={s.id} student={s} size="tiny" />
                      ))}
                  </div>
                  <span>
                    <strong>{plural(count, "student")}</strong>{" "}
                    {marked > 0 && <small>· {marked} present</small>}
                  </span>
                </div>
                <button
                  className={"button " + (i === 0 ? "primary" : "subtle")}
                  onClick={() => openClass(session)}
                >
                  Open
                  <ArrowRight size={16} />
                </button>
              </div>
            </article>
          );
        })}
        {sessions.length === 0 && (
          <div className="empty-state">
            <CalendarDays size={35} />
            <h3>No classes scheduled</h3>
            <p>Add an extra class or choose another day.</p>
            {role !== "viewer" && (
              <button
                className="button primary"
                onClick={() => {
                  setEditing(null);
                  setModal("extra");
                }}
              >
                <Plus size={16} />
                Add a class
              </button>
            )}
          </div>
        )}
      </div>
      <div className="class-tools">
        <button onClick={() => setModal("manage")}>
          <Settings size={17} />
          Manage classes
          <ArrowUpRight size={15} />
        </button>
        <span />
        <button onClick={() => setModal("free")}>
          <CalendarClock size={17} />
          Find free slot
          <ArrowUpRight size={15} />
        </button>
      </div>
    </Modal>
  );
}
