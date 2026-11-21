import {
  ArrowRight,
  CheckCheck,
  Coins,
  GraduationCap,
  MapPin,
  Users,
} from "lucide-react";
import {
  timeText,
  type ClassGroup,
  type Session,
  type Student,
  type Tute,
  type Issue,
} from "../model";
import { Stat } from "./Stat";
export function TodayTab({
  sessions,
  activeSession,
  classes,
  openClass,
  setModal,
  present,
  collected,
  students,
  tutes,
  month,
  issues,
}: {
  sessions: Session[];
  activeSession: Session | null;
  classes: ClassGroup[];
  openClass: (session: Session) => void;
  setModal: React.Dispatch<React.SetStateAction<string | null>>;
  present: number;
  collected: number;
  students: Student[];
  tutes: Tute[];
  month: string;
  issues: Issue[];
}) {
  return (
    <>
      {activeSession && (
        <section className="welcome-banner">
          <div className="hero-top">
            <span className="welcome-label">Next class</span>
            <span>
              {timeText(activeSession.start)} – {timeText(activeSession.end)}
            </span>
          </div>
          <div className="welcome-content">
            <h2>
              {classes.find((c) => c.id === activeSession.classId)?.name}
              <br />
              <span>
                {classes.find((c) => c.id === activeSession.classId)?.subject}
              </span>
            </h2>
            <div className="hero-bottom">
              <span className="hero-location">
                <MapPin size={17} />
                {classes.find((c) => c.id === activeSession.classId)?.room}
              </span>
              <button
                className="button primary"
                onClick={() => {
                  if (activeSession) openClass(activeSession);
                  else setModal("free");
                }}
              >
                Check-in <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>
      )}
      <div className="stats-grid">
        <Stat
          icon={GraduationCap}
          label="Classes today"
          value={sessions.filter((s) => !s.cancelled).length}
          foot=""
          tone="mint"
        />
        <Stat
          icon={CheckCheck}
          label="Present today"
          value={present}
          foot=""
          tone="blue"
        />
        <Stat
          icon={Coins}
          label="Paid today"
          value={
            <>
              <small>LKR</small> {collected.toLocaleString()}
            </>
          }
          foot=""
          tone="peach"
        />
        <Stat
          icon={Users}
          label="Students"
          value={students.length}
          foot=""
          tone="lilac"
        />
      </div>
      <div className="tute-preview">
        <div className="section-heading">
          <h3>This month’s tutes</h3>
          <button
            className="text-button"
            aria-label="Manage tutes"
            onClick={() => setModal("tutes")}
          >
            Manage
            <ArrowRight size={14} />
          </button>
        </div>
        {classes.map((c) => {
          const t = tutes.find((t) => t.classId === c.id && t.month === month);
          const total = students.filter((s) => s.classId === c.id).length;
          const count = issues.filter(
            (i) =>
              i.tuteId === t?.id && students.some((s) => s.id === i.studentId),
          ).length;
          return (
            <div className="tute-mini" key={c.id}>
              <div>
                <strong>{c.name}</strong>
                <span>
                  {count}/{total}
                </span>
              </div>
              <p>{t?.title || "Lesson title not set"}</p>
              <div className="progress-track">
                <span
                  style={{
                    width: (total ? (count / total) * 100 : 0) + "%",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
