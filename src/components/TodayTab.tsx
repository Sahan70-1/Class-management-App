import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Ellipsis,
  GraduationCap,
  MapPin,
  Plus,
  ScanLine,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import React from "react";
import {
  addDays,
  dateObject,
  monthText,
  sessionsFor,
  shortDate,
  timeText,
  weekday,
  type Attendance,
  type ClassGroup,
  type Entity,
  type Issue,
  type Override,
  type Role,
  type Schedule,
  type Session,
  type Student,
  type Tute,
} from "../model";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { ClassIllustration } from "./ClassIllustration";
import { Icon } from "./Icon";
import { MiniCalendar } from "./MiniCalendar";
import { Stat } from "./Stat";
export function TodayTab({
  sessions,
  date,
  today,
  activeSession,
  openClass,
  setModal,
  month,
  present,
  collected,
  students,
  calendar,
  setCalendar,
  setDate,
  schedules,
  overrides,
  classes,
  attendance,
  role,
  scheduleEditor,
  setEditing,
  recent,
  tutes,
  issues,
}: {
  sessions: Session[];
  date: string;
  today: string;
  activeSession: Session | null;
  openClass: (session: Session) => void;
  setModal: React.Dispatch<React.SetStateAction<string | null>>;
  month: string;
  present: number;
  collected: number;
  students: Student[];
  calendar: boolean;
  setCalendar: React.Dispatch<React.SetStateAction<boolean>>;
  setDate: React.Dispatch<React.SetStateAction<string>>;
  schedules: Schedule[];
  overrides: Override[];
  classes: ClassGroup[];
  attendance: Attendance[];
  role: Role;
  scheduleEditor: (session: Session) => void;
  setEditing: React.Dispatch<React.SetStateAction<Session | null>>;
  recent: {
    id: string;
    at: string;
    actor: string;
    description: string;
    key: string;
    entity: Entity;
    pending: boolean;
  }[];
  tutes: Tute[];
  issues: Issue[];
}) {
  return (
    <>
      <section className="welcome-banner">
        <div className="welcome-content">
          <span className="welcome-label">
            <Sun size={15} /> A GOOD DAY TO MAKE A DIFFERENCE
          </span>
          <h2>
            Small steps.
            <br />
            Brighter futures.
          </h2>
          <p>
            {sessions.filter((s) => !s.cancelled).length ? (
              <>
                You have{" "}
                <strong>
                  {sessions.filter((s) => !s.cancelled).length} classes
                </strong>{" "}
                lined up {date === today ? "today" : "on " + shortDate(date)}.
                <br className="mobile-only" /> Let’s make them count.
              </>
            ) : (
              <>
                A little breathing room in your schedule.
                <br />
                Plan your next great class.
              </>
            )}
          </p>
          <button
            className="button primary"
            onClick={() => {
              if (activeSession) openClass(activeSession);
              else setModal("free");
            }}
          >
            <ScanLine size={17} />
            {activeSession ? "Start student check-in" : "Find a free time"}
            <ArrowRight size={16} />
          </button>
        </div>
        <ClassIllustration />
        <div className="welcome-date">
          <span>
            {dateObject(date).toLocaleDateString("en-GB", {
              weekday: "long",
              timeZone: "Asia/Colombo",
            })}
          </span>
          <strong>{dateObject(date).getDate()}</strong>
          <span>{monthText(month)}</span>
        </div>
      </section>
      <div className="stats-grid">
        <Stat
          icon={GraduationCap}
          label="Classes today"
          value={sessions.filter((s) => !s.cancelled).length}
          foot="Let’s make every lesson count"
          tone="mint"
        />
        <Stat
          icon={CheckCheck}
          label="Attendance marked"
          value={present}
          foot={
            present
              ? "Students checked in today"
              : "Ready for your first check-in"
          }
          tone="blue"
        />
        <Stat
          icon={Coins}
          label="Fees collected"
          value={
            <>
              <small>LKR</small> {collected.toLocaleString()}
            </>
          }
          foot="Payments recorded today"
          tone="peach"
        />
        <Stat
          icon={Users}
          label="Total students"
          value={students.length}
          foot="Growing, one student at a time"
          tone="lilac"
        />
      </div>
      <div className="today-grid">
        <div className="today-main">
          <div className="section-heading">
            <div className="section-title">
              <h2>Your classes</h2>
              <span className="count-pill">{sessions.length}</span>
            </div>
            <div className="segmented">
              <button
                className={!calendar ? "active" : ""}
                onClick={() => {
                  setCalendar(false);
                  setDate(today);
                }}
              >
                Today
              </button>
              <button
                className={calendar ? "active" : ""}
                onClick={() => setCalendar(true)}
              >
                <CalendarDays size={14} />
                Calendar
              </button>
            </div>
          </div>
          {calendar && (
            <div className="week-strip">
              <button
                className="icon-button"
                aria-label="Previous week"
                onClick={() => setDate(addDays(date, -7))}
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: 7 }, (_, i) =>
                addDays(date, -((weekday(date) + 6) % 7) + i),
              ).map((d) => (
                <button
                  className={d === date ? "active" : ""}
                  key={d}
                  onClick={() => setDate(d)}
                >
                  <span>
                    {dateObject(d).toLocaleDateString("en-GB", {
                      weekday: "short",
                      timeZone: "Asia/Colombo",
                    })}
                  </span>
                  <strong>{dateObject(d).getDate()}</strong>
                  <i
                    className={
                      sessionsFor(d, schedules, overrides).length
                        ? "has-class"
                        : ""
                    }
                  />
                </button>
              ))}
              <button
                className="icon-button"
                aria-label="Next week"
                onClick={() => setDate(addDays(date, 7))}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
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
                                ? "Up next"
                                : "Scheduled"}
                        </Badge>
                      </div>
                      <p>
                        {c.subject} <span>·</span>{" "}
                        {session.extra ? "One-time class" : "Weekly class"}
                      </p>
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
                      {timeText(session.start)}{" "}
                      <span className="time-dash">—</span>{" "}
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
                        <strong>{count}</strong> students{" "}
                        {marked > 0 && <small>· {marked} present</small>}
                      </span>
                    </div>
                    <button
                      className={"button " + (i === 0 ? "primary" : "subtle")}
                      onClick={() => openClass(session)}
                    >
                      Open class
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
                <p>
                  A fresh space for learning. Add an extra class or choose
                  another day.
                </p>
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
              Find free times
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="section-heading activity-title">
            <h2>Recent activity</h2>
            <button
              className="text-button"
              onClick={() => setModal("activity")}
            >
              View all
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="activity-list">
            {recent.length ? (
              recent.slice(0, 3).map((r) => (
                <div key={r.id} className="activity-row">
                  <span
                    className={
                      "activity-icon " +
                      (r.entity === "fees" ? "peach" : "mint")
                    }
                  >
                    <Icon
                      icon={
                        r.entity === "fees"
                          ? Coins
                          : r.entity === "issues"
                            ? BookOpen
                            : Check
                      }
                      size={16}
                    />
                  </span>
                  <div>
                    <strong>{r.description}</strong>
                    <p>
                      {students.find(
                        (s) => r.key.startsWith(s.id + "@") || r.key === s.id,
                      )?.name || "Class timetable"}{" "}
                      <span>·</span> {r.pending ? "Saved locally" : "Synced"}
                    </p>
                  </div>
                  <time>
                    {new Date(r.at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "Asia/Colombo",
                    })}
                  </time>
                </div>
              ))
            ) : (
              <div className="activity-empty">
                <span className="activity-icon mint">
                  <Check size={16} />
                </span>
                <p>
                  You’re all set. New activity will appear here as you teach.
                </p>
              </div>
            )}
          </div>
        </div>
        <aside className="today-aside">
          <MiniCalendar
            date={date}
            onDate={(d) => {
              setDate(d);
              setCalendar(d !== today);
            }}
            schedules={schedules}
            overrides={overrides}
          />
          <div className="quick-actions">
            <div className="section-heading">
              <h3>Make room for learning</h3>
              <CalendarClock size={19} />
            </div>
            <p>
              An extra lesson? A timetable change?
              <br />
              We’ll find the time.
            </p>
            <button className="button white" onClick={() => setModal("free")}>
              Find a free time
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="tute-preview">
            <div className="section-heading">
              <h3>This month’s tutes</h3>
              <span className="book-icon">
                <BookOpen size={19} />
              </span>
            </div>
            {classes.slice(0, 2).map((c) => {
              const t = tutes.find(
                (t) => t.classId === c.id && t.month === month,
              );
              const total = students.filter((s) => s.classId === c.id).length;
              const count = issues.filter(
                (i) =>
                  i.tuteId === t?.id &&
                  students.some((s) => s.id === i.studentId),
              ).length;
              return (
                <div className="tute-mini" key={c.id}>
                  <div>
                    <strong>{c.name}</strong>
                    <span>
                      {count} / {total} issued
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
            <button className="text-button" onClick={() => setModal("tutes")}>
              Manage tutes
              <ArrowRight size={14} />
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
