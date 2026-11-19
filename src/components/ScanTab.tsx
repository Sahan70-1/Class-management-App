import {
  BookOpen,
  CheckCheck,
  ChevronRight,
  Cloud as CloudCheck,
  Coins,
  GraduationCap,
  Search,
  ShieldCheck,
} from "lucide-react";
import React from "react";
import {
  addDays,
  sessionsFor,
  shortDate,
  timeText,
  type Attendance,
  type ClassGroup,
  type Override,
  type Role,
  type Schedule,
  type Session,
  type Student,
  type Tute,
} from "../model";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { Scanner } from "./Scanner";
import { StudentCheckin } from "./StudentCheckin";
export function ScanTab({
  activeSession,
  setSelected,
  setStudent,
  sessions,
  classes,
  date,
  setDate,
  student,
  studentStatus,
  currentClass,
  currentTute,
  role,
  attendance,
  schedules,
  overrides,
  markAttendance,
  setModal,
  issueTute,
  scanResult,
  setToast,
  query,
  setQuery,
  students,
  activeStudents,
}: {
  activeSession: Session | null;
  setSelected: React.Dispatch<React.SetStateAction<string>>;
  setStudent: React.Dispatch<React.SetStateAction<Student | null>>;
  sessions: Session[];
  classes: ClassGroup[];
  date: string;
  setDate: React.Dispatch<React.SetStateAction<string>>;
  student: Student | null;
  studentStatus: (s: Student) => {
    present: boolean;
    paid: boolean;
    issued: boolean;
  };
  currentClass: ClassGroup | undefined;
  currentTute: Tute | undefined;
  role: Role;
  attendance: Attendance[];
  schedules: Schedule[];
  overrides: Override[];
  markAttendance: () => Promise<void>;
  setModal: React.Dispatch<React.SetStateAction<string | null>>;
  issueTute: () => Promise<void>;
  scanResult: (raw: string) => void;
  setToast: React.Dispatch<React.SetStateAction<string>>;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  students: Student[];
  activeStudents: Student[];
}) {
  const canScan =
    role !== "viewer" && !!activeSession && !activeSession.cancelled;
  let suggested: Session | undefined;
  if (!canScan && role !== "viewer") {
    // Include other sessions on the same day and one full weekly timetable.
    for (let offset = 0; offset <= 7 && !suggested; offset++) {
      suggested = sessionsFor(addDays(date, offset), schedules, overrides).find(
        (session) => !session.cancelled,
      );
    }
  }
  return (
    <div className="scan-layout">
      <div>
        <div className="scan-class-select">
          <GraduationCap size={21} />
          <select
            aria-label="Select class session"
            value={activeSession?.id || ""}
            onChange={(e) => {
              setSelected(e.target.value);
              setStudent(null);
            }}
          >
            {sessions
              .filter((s) => !s.cancelled)
              .map((s) => (
                <option value={s.id} key={s.id}>
                  {classes.find((c) => c.id === s.classId)?.name} ·{" "}
                  {timeText(s.start)} – {timeText(s.end)}
                </option>
              ))}
            {!activeSession && <option value="">No class scheduled</option>}
            {activeSession?.cancelled && (
              <option value={activeSession.id} disabled>
                Selected class cancelled
              </option>
            )}
          </select>
          <input
            aria-label="Class date"
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) {
                setDate(e.target.value);
                setStudent(null);
              }
            }}
          />
        </div>
        {!canScan && (
          <div className="panel scan-guidance">
            <p>
              {role === "viewer"
                ? "Scanning requires tutor or attendance staff access."
                : activeSession?.cancelled
                  ? "This session was cancelled. Choose another class or date to scan."
                  : "No class is scheduled for this date. Choose a class date to scan."}
            </p>
            {suggested && (
              <button
                className="button white"
                onClick={() => {
                  if (!suggested) return;
                  setDate(suggested.date);
                  setSelected(suggested.id);
                  setStudent(null);
                  setQuery("");
                }}
              >
                Select{" "}
                {classes.find((c) => c.id === suggested.classId)?.name ||
                  "class"}
                {" · "}
                {shortDate(suggested.date)} · {timeText(suggested.start)}
              </button>
            )}
          </div>
        )}
        {student?.removedAt ? (
          <div role="alert" className="callout warning">
            This student has been removed.
          </div>
        ) : student ? (
          <StudentCheckin
            student={student}
            status={studentStatus(student)}
            session={activeSession}
            className={currentClass?.name || ""}
            tuteTitle={currentTute?.title}
            date={date}
            role={role}
            attendance={attendance}
            schedules={schedules}
            overrides={overrides}
            onBack={() => setStudent(null)}
            onAttendance={markAttendance}
            onPayment={() => setModal("payment")}
            onIssue={issueTute}
            onDetails={() => setModal("profile")}
          />
        ) : (
          <>
            <Scanner
              key={canScan ? activeSession?.id : "unavailable"}
              disabled={!canScan}
              onResult={scanResult}
              notify={setToast}
            />
            <div className="scanner-search">
              <Search size={19} />
              <input
                aria-label="Search student to check in"
                placeholder="Search by name, student ID or phone"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd>⌘ K</kbd>
            </div>
            {query && (
              <div className="search-results">
                {students
                  .filter(
                    (s) =>
                      s.classId === activeSession?.classId &&
                      (
                        s.name +
                        " " +
                        s.id +
                        " " +
                        s.phone +
                        " " +
                        s.parentPhone
                      )
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  )
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setStudent(s);
                        setQuery("");
                      }}
                    >
                      <Avatar student={s} size="small" />
                      <div>
                        <strong>{s.name}</strong>
                        <span>
                          {s.id} · Class roll {s.roll}
                        </span>
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                {!students.some(
                  (s) =>
                    s.classId === activeSession?.classId &&
                    (s.name + " " + s.id + " " + s.phone + " " + s.parentPhone)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                ) && (
                  <p className="muted padded">
                    No matching students in this class.
                  </p>
                )}
              </div>
            )}
            <div className="scanner-tip">
              <ShieldCheck size={19} />
              <p>Scan opens the student. You pick what to record.</p>
            </div>
          </>
        )}
      </div>
      <aside>
        <div className="panel checkin-guide">
          <Badge tone="mint">ONE ACTION AT A TIME</Badge>
          <h2>
            A smooth start
            <br />
            to every class.
          </h2>
          <p>
            Select your class, scan a student’s QR, then record exactly what you
            need.
          </p>
          {[
            {
              icon: CheckCheck,
              title: "Mark attendance",
              text: "Check a student in for this session.",
            },
            {
              icon: Coins,
              title: "Record payment",
              text: "Save a monthly fee, separately.",
            },
            {
              icon: BookOpen,
              title: "Give a tute",
              text: "Keep track of each month’s lesson.",
            },
          ].map(({ icon, title, text }, i) => (
            <div className="guide-step" key={title}>
              <span className={"guide-icon " + ["mint", "peach", "lilac"][i]}>
                <Icon icon={icon} size={20} />
              </span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </div>
          ))}
          <div className="callout">
            <CloudCheck size={18} />
            <span>
              Works offline. Your updates will sync when you’re online again.
            </span>
          </div>
        </div>
        <div className="session-summary panel">
          <h3>Class check-in</h3>
          <span className="muted">
            {currentClass?.name || "Select a class"} · {shortDate(date)}
          </span>
          <div className="summary-numbers">
            <div>
              <strong>
                {
                  attendance.filter((a) => a.sessionId === activeSession?.id)
                    .length
                }
              </strong>
              <span>Present</span>
            </div>
            <div>
              <strong>
                {activeStudents.length -
                  attendance.filter(
                    (a) =>
                      a.sessionId === activeSession?.id &&
                      activeStudents.some((s) => s.id === a.studentId),
                  ).length}
              </strong>
              <span>Not marked</span>
            </div>
            <div>
              <strong>{activeStudents.length}</strong>
              <span>Total</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
