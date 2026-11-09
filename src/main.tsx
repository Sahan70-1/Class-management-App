import {TodayTab} from './components/TodayTab';
import {SettingsModal} from './components/SettingsModal';
import {TuteModal} from './components/TuteModal';
import {PaymentModal} from './components/PaymentModal';
import {QRModal} from './components/QRModal';
import {RegisterModal} from './components/RegisterModal';
import {FreeTimes} from './components/FreeTimes';
import {ScheduleModal} from './components/ScheduleModal';
import {download} from './utils';
import {Scanner} from './components/Scanner';
import {StudentCheckin} from './components/StudentCheckin';
import {ClassIllustration} from './components/ClassIllustration';
import {MiniCalendar} from './components/MiniCalendar';
import {Stat} from './components/Stat';
import {Modal} from './components/Modal';
import {Badge} from './components/Badge';
import {Avatar} from './components/Avatar';
import {Icon} from './components/Icon';
import {nav} from './navigation';
import {type Tab} from './navigation';
import React, {
  useEffect,
  useState,
  useSyncExternalStore,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  GraduationCap,
  LayoutDashboard,
  ScanLine,
  Users,
  ChartNoAxesCombined,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  Plus,
  Clock,
  Cloud as CloudCheck,
  CloudOff,
  RefreshCw,
  Settings,
  Search,
  ArrowRight,
  Check,
  CheckCheck,
  Coins,
  BookOpen,
  MapPin,
  Ellipsis,
  Download,
  X,
  Camera,
  Info,
  History as HistoryIcon,
  LogOut,
  ShieldCheck,
  WifiOff,
  CalendarClock,
  SlidersHorizontal,
  ArrowLeft,
  Printer,
  ImagePlus,
  Menu,
  Mail,
  TriangleAlert,
  Sun,
  CheckCircle2,
  FileText,
  Bell,
  Layers,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import {
  initialize,
  subscribe,
  getSnapshot,
  mutate,
  sync,
  discardConflict,
} from "./store";
import {
  todayISO,
  addDays,
  weekday,
  dateObject,
  monthOf,
  monthText,
  shortDate,
  timeText,
  money,
  values,
  sessionsFor,
  freeSlots,
  findConflict,
  overlaps,
  qrStudentId,
  type Session,
  type Student,
  type Role,
  type Schedule,
  type Override,
  type EntityMap,
  type Entity,
  type StoredRecord,
} from "./model";
import "./styles.css";







function App() {
  const data = useSyncExternalStore(subscribe, getSnapshot);
  const today = todayISO();
  const [tab, setTab] = useState<Tab>("Today"),
    [date, setDate] = useState(today),
    [calendar, setCalendar] = useState(false),
    [selected, setSelected] = useState<string>(""),
    [student, setStudent] = useState<Student | null>(null),
    [modal, setModal] = useState<string | null>(null),
    [editing, setEditing] = useState<Session | null>(null),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [reportClass, setReportClass] = useState("grade-9"),
    [reportMonth, setReportMonth] = useState(monthOf(today)),
    [reportType, setReportType] = useState("attendance"),
    [previewRole, setPreviewRole] = useState<Role>("admin"),
    [toast, setToast] = useState(""),
    [mobileMenu, setMobileMenu] = useState(false);
  const students = values(data.records, "students"),
    classes = values(data.records, "classes"),
    schedules = values(data.records, "schedules"),
    overrides = values(data.records, "overrides"),
    attendance = values(data.records, "attendance"),
    fees = values(data.records, "fees"),
    tutes = values(data.records, "tutes"),
    issues = values(data.records, "issues");
  const role: Role =
    data.role === "viewer"
      ? "viewer"
      : data.role === "staff"
        ? previewRole === "viewer"
          ? "viewer"
          : "staff"
        : previewRole;
  const sessions = sessionsFor(date, schedules, overrides),
    activeSession =
      sessions.find((s) => s.id === selected) ||
      sessions.find((s) => !s.cancelled) ||
      null;
  const currentClass = classes.find((c) => c.id === activeSession?.classId);
  const activeStudents = students.filter(
    (s) => s.classId === activeSession?.classId,
  );
  const month = monthOf(date);
  const currentTute = tutes.find(
    (t) => t.classId === activeSession?.classId && t.month === month,
  );
  const present = attendance.filter((a) => a.date === date).length,
    collected = fees
      .filter((f) => f.at.slice(0, 10) === date)
      .reduce((n, f) => n + f.amount, 0);
  useEffect(() => {
    void initialize();
    if ("serviceWorker" in navigator && import.meta.env.PROD)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    if (data.role !== "admin") setPreviewRole(data.role);
  }, [data.role]);
  async function save<K extends Entity>(
    entity: K,
    value: EntityMap[K],
    message: string,
  ) {
    try {
      await mutate(entity, value, role);
      setToast(message);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not save.");
    }
  }
  function navigate(t: Tab) {
    setTab(t);
    setStudent(null);
    setQuery("");
    setMobileMenu(false);
  }
  function openClass(session: Session) {
    setSelected(session.id);
    setTab("Scan");
    setStudent(null);
    setQuery("");
  }
  function studentStatus(s: Student) {
    return {
      present: attendance.some(
        (a) => a.studentId === s.id && a.sessionId === activeSession?.id,
      ),
      paid: fees.some(
        (f) =>
          f.studentId === s.id && f.classId === s.classId && f.month === month,
      ),
      issued: issues.some(
        (i) => i.studentId === s.id && i.tuteId === currentTute?.id,
      ),
    };
  }
  function scanResult(raw: string) {
    const id = qrStudentId(raw);
    const s = students.find((s) => s.id === id);
    if (!s) {
      setToast("Student QR not found. Search by name or ID.");
      return;
    }
    if (!activeSession) {
      setToast("Select an active class before checking in.");
      return;
    }
    if (s.classId !== activeSession.classId) {
      setToast(s.name + " is registered in a different class.");
      return;
    }
    setStudent(s);
    setQuery("");
  }
  async function markAttendance() {
    if (!student || !activeSession || activeSession.cancelled) return;
    await save(
      "attendance",
      {
        id: student.id + "@" + activeSession.id,
        studentId: student.id,
        sessionId: activeSession.id,
        classId: activeSession.classId,
        date,
        at: new Date().toISOString(),
      },
      "Attendance marked for " + student.name,
    );
  }
  async function issueTute() {
    if (!student || !currentTute) return;
    await save(
      "issues",
      {
        id: student.id + "@" + currentTute.id,
        studentId: student.id,
        tuteId: currentTute.id,
        at: new Date().toISOString(),
      },
      "Tute issued to " + student.name,
    );
  }
  const changeHistory = [
    ...data.pending
      .filter((o) => ["schedules", "overrides"].includes(o.entity))
      .map((o) => ({
        id: o.id,
        at: o.at,
        actor: o.actor,
        description:
          o.entity === "schedules"
            ? "Weekly timetable changed · pending sync"
            : "Class session changed · pending sync",
        key: o.key,
        entity: o.entity,
      })),
    ...data.history.filter((h) =>
      ["schedules", "overrides"].includes(h.entity),
    ),
  ];
  const recent = [
    ...data.pending.map((o) => ({
      id: o.id,
      at: o.at,
      actor: o.actor,
      description:
        o.entity === "attendance"
          ? "Attendance marked"
          : o.entity === "fees"
            ? "Payment recorded"
            : o.entity === "issues"
              ? "Tute issued"
              : "Workspace updated",
      key: o.key,
      entity: o.entity,
      pending: true,
    })),
    ...data.history.map((h) => ({ ...h, pending: false })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 4);
  const scheduleEditor = (session: Session) => {
    setEditing(session);
    setModal("schedule");
  };

  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobileMenu ? "mobile-open" : "")}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("Today");
          }}
        >
          <span className="brand-mark">
            <GraduationCap size={26} />
          </span>
          <span>
            classroom<span className="brand-dot">.</span>
            <small>LESS ADMIN. MORE TEACHING.</small>
          </span>
        </a>
        <div className="workspace">
          <div className="workspace-avatar">
            <GraduationCap size={19} />
          </div>
          <div>
            <strong>My tuition space</strong>
            <span>Mathematics academy</span>
          </div>
          <Badge tone="mint">PRO</Badge>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav">
          {nav.map(({ name, icon }) => (
            <button
              key={name}
              className={tab === name ? "active" : ""}
              onClick={() => navigate(name)}
            >
              <Icon icon={icon} />
              <span>{name}</span>
              {tab === name && <span className="active-dot" />}
              {name === "Students" && <small>{students.length}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="offline-note">
            <span className="offline-icon">
              <CloudCheck size={22} />
            </span>
            <strong>Ready, even offline.</strong>
            <p>
              Your work stays with you.
              <br />
              We’ll sync when you’re back.
            </p>
            <span>
              <i /> Saved on this device
            </span>
          </div>
          <button
            className="sidebar-settings"
            onClick={() => setModal("settings")}
          >
            <Settings size={18} /> Workspace settings
          </button>
          <div className="tutor">
            <span className="tutor-avatar">T</span>
            <div>
              <strong>My workspace</strong>
              <span>
                {role === "admin"
                  ? "Tutor · Admin"
                  : role === "staff"
                    ? "Attendance staff"
                    : "Reports · Read only"}
              </span>
            </div>
            <button
              aria-label="Account and roles"
              className="icon-button"
              onClick={() => setModal("settings")}
            >
              <Ellipsis size={20} />
            </button>
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="mobile-scrim"
          aria-label="Close menu"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open menu"
              onClick={() => setMobileMenu(true)}
            >
              <Menu />
            </button>
            <span className="desktop-only">Workspace</span>
            <ChevronRight size={14} className="desktop-only" />
            <strong>{tab}</strong>
          </div>
          <div className="topbar-right">
            <button
              className={"sync-button " + (!data.online ? "offline" : "")}
              onClick={() => setModal("sync")}
            >
              <Icon
                icon={
                  !data.online
                    ? CloudOff
                    : data.syncing
                      ? RefreshCw
                      : CloudCheck
                }
                size={18}
                className={data.syncing ? "spinning" : ""}
              />
              <span>
                {!data.online
                  ? "Offline"
                  : data.syncing
                    ? "Syncing"
                    : data.pending.length
                      ? data.pending.length + " pending"
                      : data.lastSync
                        ? "All changes synced"
                        : "Saved locally"}
              </span>
              <i />
            </button>
            <span className="topbar-divider" />
            <button
              className="icon-button notification"
              aria-label="View recent activity"
              onClick={() => setModal("activity")}
            >
              <Bell size={19} />
              {data.pending.length > 0 && <i />}
            </button>
            <button
              className="account-avatar"
              aria-label="Workspace settings"
              onClick={() => setModal("settings")}
            >
              T
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {tab === "Today"
                  ? "YOUR DAY, AT A GLANCE"
                  : tab === "Scan"
                    ? "A WARM WELCOME STARTS HERE"
                    : tab === "Students"
                      ? "EVERY STUDENT, IN ONE PLACE"
                      : "THE NUMBERS BEHIND YOUR CLASSES"}
              </div>
              <h1>
                {tab === "Today"
                  ? "Today’s overview"
                  : tab === "Scan"
                    ? student
                      ? "Student check-in"
                      : "Scan a student"
                    : tab === "Students"
                      ? "Your students"
                      : "Reports & insights"}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {tab === "Today"
                  ? "A little less admin. A little more teaching."
                  : tab === "Scan"
                    ? "Check attendance, fees and tutes. One action at a time."
                    : tab === "Students"
                      ? "Familiar faces. Everything you need to know."
                      : "Keep track of progress, payments and everything in between."}
              </p>
            </div>
            <div className="page-heading-actions">
              {role === "viewer" && (
                <Badge tone="violet">
                  <ShieldCheck size={13} /> Read only
                </Badge>
              )}
              {tab === "Today" ? (
                <button
                  className="button white date-button"
                  onClick={() => setCalendar(!calendar)}
                >
                  <CalendarDays size={17} />
                  {dateObject(date).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "Asia/Colombo",
                  })}
                  <ChevronRight size={15} />
                </button>
              ) : tab === "Students" && role === "admin" ? (
                <button
                  className="button primary"
                  onClick={() => {
                    setStudent(null);
                    setModal("register");
                  }}
                >
                  <Plus size={18} /> New student
                </button>
              ) : tab === "Reports" ? (
                <button className="button white" onClick={() => exportReport()}>
                  <Download size={17} />
                  Export report
                </button>
              ) : null}
            </div>
          </div>

          {!data.online && (
            <div className="offline-banner">
              <WifiOff size={18} />
              <div>
                <strong>You’re working offline.</strong> Changes are saved on
                this device and will sync when you reconnect.
              </div>
              <Badge tone="amber">{data.pending.length} pending</Badge>
            </div>
          )}
          {tab === "Today" && <TodayTab sessions={sessions} date={date} today={today} activeSession={activeSession} openClass={openClass} setModal={setModal} month={month} present={present} collected={collected} students={students} calendar={calendar} setCalendar={setCalendar} setDate={setDate} schedules={schedules} overrides={overrides} classes={classes} attendance={attendance} role={role} scheduleEditor={scheduleEditor} setEditing={setEditing} recent={recent} tutes={tutes} issues={issues}/>}

          {tab === "Scan" && (
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
                    {!activeSession && (
                      <option value="">No class scheduled</option>
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
                {student ? (
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
                      disabled={!activeSession || role === "viewer"}
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
                        ) && (
                          <p className="muted padded">
                            No matching students in this class.
                          </p>
                        )}
                      </div>
                    )}
                    <div className="scanner-tip">
                      <ShieldCheck size={19} />
                      <p>
                        Scanning only opens the student’s details.
                        <br />
                        <strong>You choose what to record.</strong>
                      </p>
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
                    Select your class, scan a student’s QR, then record exactly
                    what you need.
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
                      title: "Issue a tute",
                      text: "Keep track of each month’s lesson.",
                    },
                  ].map(({ icon, title, text }, i) => (
                    <div className="guide-step" key={title}>
                      <span
                        className={
                          "guide-icon " + ["mint", "peach", "lilac"][i]
                        }
                      >
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
                      Works offline. Your updates will sync when you’re online
                      again.
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
                          attendance.filter(
                            (a) => a.sessionId === activeSession?.id,
                          ).length
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
          )}

          {tab === "Students" && (
            <>
              <div className="directory-toolbar">
                <div className="search-input">
                  <Search size={18} />
                  <input
                    aria-label="Search students"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, student ID or phone…"
                  />
                </div>
                <div className="filter-select">
                  <SlidersHorizontal size={16} />
                  <select
                    aria-label="Filter students by class"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All classes</option>
                    {classes.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="button white"
                  onClick={() => setModal("tutes")}
                >
                  <Layers size={17} />
                  Manage tutes
                </button>
              </div>
              <div className="panel student-directory">
                <div className="directory-header">
                  <h3>
                    Student directory{" "}
                    <span className="count-pill">
                      {
                        students.filter(
                          (s) => filter === "all" || s.classId === filter,
                        ).length
                      }
                    </span>
                  </h3>
                  <span>Stable IDs. Familiar faces.</span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>STUDENT</th>
                        <th>CLASS & ROLL</th>
                        <th>MONTHLY FEES</th>
                        <th>TUTE STATUS</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {students
                        .filter(
                          (s) =>
                            (filter === "all" || s.classId === filter) &&
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
                        .map((s) => {
                          const t = tutes.find(
                            (t) =>
                              t.classId === s.classId &&
                              t.month === monthOf(today),
                          );
                          return (
                            <tr key={s.id}>
                              <td>
                                <button
                                  className="student-cell"
                                  onClick={() => {
                                    setStudent(s);
                                    setModal("profile");
                                  }}
                                >
                                  <Avatar student={s} />
                                  <span>
                                    <strong>{s.name}</strong>
                                    <small>{s.id}</small>
                                  </span>
                                </button>
                              </td>
                              <td>
                                <strong>
                                  {
                                    classes.find((c) => c.id === s.classId)
                                      ?.name
                                  }
                                </strong>
                                <small className="cell-sub">
                                  Roll {s.roll}
                                </small>
                              </td>
                              <td>
                                <Badge
                                  tone={
                                    fees.some(
                                      (f) =>
                                        f.studentId === s.id &&
                                        f.month === monthOf(today),
                                    )
                                      ? "mint"
                                      : "amber"
                                  }
                                  dot
                                >
                                  {fees.some(
                                    (f) =>
                                      f.studentId === s.id &&
                                      f.month === monthOf(today),
                                  )
                                    ? "Paid"
                                    : "Unpaid"}
                                </Badge>
                              </td>
                              <td>
                                <Badge
                                  tone={
                                    issues.some(
                                      (i) =>
                                        i.studentId === s.id &&
                                        i.tuteId === t?.id,
                                    )
                                      ? "mint"
                                      : "neutral"
                                  }
                                >
                                  {issues.some(
                                    (i) =>
                                      i.studentId === s.id &&
                                      i.tuteId === t?.id,
                                  )
                                    ? "Issued"
                                    : "Not issued"}
                                </Badge>
                              </td>
                              <td>
                                <div className="row-actions">
                                  <button
                                    className="icon-button"
                                    aria-label={"View QR for " + s.name}
                                    onClick={() => {
                                      setStudent(s);
                                      setModal("qr");
                                    }}
                                  >
                                    <ScanLine size={19} />
                                  </button>
                                  <button
                                    className="icon-button"
                                    aria-label={"View profile for " + s.name}
                                    onClick={() => {
                                      setStudent(s);
                                      setModal("profile");
                                    }}
                                  >
                                    <ChevronRight size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                {!students.some(
                  (s) =>
                    (filter === "all" || s.classId === filter) &&
                    (s.name + " " + s.id + " " + s.phone + " " + s.parentPhone)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                ) && (
                  <div className="empty-state">
                    <Search size={28} />
                    <h3>No students found</h3>
                    <p>Try another name, student ID or phone number.</p>
                  </div>
                )}
                <div className="directory-footer">
                  <ShieldCheck size={15} />A student’s QR stays the same when
                  their grade changes.
                </div>
              </div>
            </>
          )}

          {tab === "Reports" && (
            <>
              <div className="report-toolbar">
                <div>
                  <GraduationCap size={18} />
                  <select
                    aria-label="Report class"
                    value={reportClass}
                    onChange={(e) => setReportClass(e.target.value)}
                  >
                    {classes.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <CalendarDays size={18} />
                  <input
                    aria-label="Report month"
                    type="month"
                    value={reportMonth}
                    onChange={(e) => {
                      if (e.target.value) setReportMonth(e.target.value);
                    }}
                  />
                </div>
                <Badge tone="mint">
                  <RefreshCw size={12} />
                  Includes locally saved updates
                </Badge>
              </div>
              {(() => {
                const roster = students.filter(
                  (s) => s.classId === reportClass,
                );
                const monthFees = fees.filter(
                  (f) => f.classId === reportClass && f.month === reportMonth,
                );
                const monthAttendance = attendance.filter(
                  (a) =>
                    a.classId === reportClass && a.date.startsWith(reportMonth),
                );
                const t = tutes.find(
                  (t) => t.classId === reportClass && t.month === reportMonth,
                );
                const issued = issues.filter((i) => i.tuteId === t?.id);
                return (
                  <>
                    <div className="stats-grid report-stats">
                      <Stat
                        icon={CheckCheck}
                        label="Attendance records"
                        value={monthAttendance.length}
                        foot={monthText(reportMonth)}
                        tone="mint"
                      />
                      <Stat
                        icon={Coins}
                        label="Monthly fees collected"
                        value={
                          <>
                            <small>LKR</small>{" "}
                            {monthFees
                              .reduce((n, f) => n + f.amount, 0)
                              .toLocaleString()}
                          </>
                        }
                        foot={monthFees.length + " payments recorded"}
                        tone="peach"
                      />
                      <Stat
                        icon={BookOpen}
                        label="Tutes distributed"
                        value={
                          <>
                            {issued.length}
                            <small> / {roster.length}</small>
                          </>
                        }
                        foot={t?.title || "No lesson title set"}
                        tone="lilac"
                      />
                      <Stat
                        icon={Users}
                        label="Enrolled students"
                        value={roster.length}
                        foot={
                          classes.find((c) => c.id === reportClass)?.name || ""
                        }
                        tone="blue"
                      />
                    </div>
                    <div className="panel report-panel">
                      <div className="section-heading">
                        <div>
                          <h2>Every student, a clearer picture</h2>
                          <p>
                            {classes.find((c) => c.id === reportClass)?.name} ·{" "}
                            {monthText(reportMonth)}
                          </p>
                        </div>
                        <Badge tone="amber">
                          {
                            roster.filter(
                              (s) =>
                                !monthFees.some((f) => f.studentId === s.id),
                            ).length
                          }{" "}
                          unpaid
                        </Badge>
                      </div>
                      <div className="report-tabs">
                        {[
                          {
                            id: "attendance",
                            label: "Attendance",
                            icon: CheckCheck,
                          },
                          { id: "fees", label: "Monthly fees", icon: Coins },
                          {
                            id: "tutes",
                            label: "Tute distribution",
                            icon: BookOpen,
                          },
                        ].map(({ id, label, icon }) => (
                          <button
                            className={reportType === id ? "active" : ""}
                            key={id}
                            onClick={() => setReportType(id)}
                          >
                            <Icon icon={icon} size={16} />
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>STUDENT</th>
                              <th>STUDENT ID</th>
                              <th>
                                {reportType === "attendance"
                                  ? "CLASSES ATTENDED"
                                  : reportType === "fees"
                                    ? "PAYMENT STATUS"
                                    : "TUTE STATUS"}
                              </th>
                              <th>
                                {reportType === "attendance"
                                  ? "LATEST CHECK-IN"
                                  : reportType === "fees"
                                    ? "AMOUNT"
                                    : "LESSON TITLE"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {roster.map((s) => {
                              const attended = monthAttendance
                                .filter((a) => a.studentId === s.id)
                                .sort((a, b) => b.at.localeCompare(a.at));
                              const fee = monthFees.find(
                                (f) => f.studentId === s.id,
                              );
                              const issue = issued.some(
                                (i) => i.studentId === s.id,
                              );
                              return (
                                <tr key={s.id}>
                                  <td>
                                    <div className="student-cell">
                                      <Avatar student={s} size="small" />
                                      <strong>{s.name}</strong>
                                    </div>
                                  </td>
                                  <td>{s.id}</td>
                                  <td>
                                    {reportType === "attendance" ? (
                                      <Badge
                                        tone={
                                          attended.length ? "mint" : "neutral"
                                        }
                                      >
                                        {attended.length} sessions
                                      </Badge>
                                    ) : reportType === "fees" ? (
                                      <Badge tone={fee ? "mint" : "amber"}>
                                        {fee ? "Paid" : "Unpaid"}
                                      </Badge>
                                    ) : (
                                      <Badge tone={issue ? "mint" : "amber"}>
                                        {issue ? "Issued" : "Not issued"}
                                      </Badge>
                                    )}
                                  </td>
                                  <td>
                                    {reportType === "attendance"
                                      ? attended[0]
                                        ? shortDate(attended[0].date)
                                        : "—"
                                      : reportType === "fees"
                                        ? fee
                                          ? money(fee.amount)
                                          : "—"
                                        : t?.title || "Not set"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="directory-footer">
                        <Info size={15} />
                        Last synced:{" "}
                        {data.lastSync
                          ? new Date(data.lastSync).toLocaleString("en-GB", {
                              timeZone: "Asia/Colombo",
                            })
                          : "Not yet synced"}
                        {data.pending.length > 0 &&
                          ` · ${data.pending.length} local updates pending`}
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          )}
          <footer className="page-footer">
            <span>
              <GraduationCap size={15} />
              Built for the way you teach.
            </span>
            <span>
              Classroom <i /> Fictional sample data
            </span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav">
        {nav.map(({ name, icon }) => (
          <button
            className={tab === name ? "active" : ""}
            key={name}
            onClick={() => navigate(name)}
          >
            <Icon icon={icon} size={21} />
            <span>{name}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div role="status" className="toast">
          <CheckCircle2 size={19} />
          {toast}
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal === "sync" && (
        <Modal
          title="Your work, safely saved"
          subtitle="Device storage & synchronization"
          onClose={() => setModal(null)}
        >
          <div className="sync-detail">
            <span className="large-status mint">
              <CloudCheck size={30} />
            </span>
            <h3>
              {!data.online
                ? "Working offline"
                : data.pending.length
                  ? `${data.pending.length} updates waiting to sync`
                  : "Everything is saved on this device"}
            </h3>
            <p>
              Last successful sync:{" "}
              {data.lastSync
                ? new Date(data.lastSync).toLocaleString("en-GB", {
                    timeZone: "Asia/Colombo",
                  })
                : "Not yet synced"}
            </p>
            {data.error && (
              <div className="callout warning">
                <TriangleAlert size={18} />
                {data.error}
              </div>
            )}
            <p>
              Keep this browser’s storage until all pending changes are synced.
              Other devices receive updates after a successful sync.
            </p>
            {data.conflicts.map((c) => {
              const id = c.split(": ")[0];
              return (
                <div className="conflict-item" key={id}>
                  <p>{c.slice(id.length + 2)}</p>
                  <button
                    className="button white"
                    onClick={() => void discardConflict(id)}
                  >
                    Use server version & discard local change
                  </button>
                </div>
              );
            })}
            <button
              className="button primary full"
              onClick={() => void sync()}
              disabled={!data.online || data.syncing}
            >
              <RefreshCw size={17} className={data.syncing ? "spinning" : ""} />
              {data.syncing ? "Syncing…" : "Sync now"}
            </button>
            {data.error?.includes("Sign in") && (
              <a
                className="button white full"
                href={
                  "/signin-with-chatgpt?return_to=" + encodeURIComponent("/")
                }
                target="_top"
              >
                Sign in to sync
                <ArrowRight size={16} />
              </a>
            )}
          </div>
        </Modal>
      )}
      {modal === "activity" && (
        <Modal
          title="Recent activity"
          subtitle="Changes saved locally and on the server"
          onClose={() => setModal(null)}
        >
          <div className="activity-list modal-list">
            {[
              ...data.pending.map((o) => ({
                id: o.id,
                description: o.entity + " updated · pending sync",
                actor: o.actor,
                at: o.at,
              })),
              ...data.history,
            ]
              .sort((a, b) => b.at.localeCompare(a.at))
              .map((h) => (
                <div className="history-row" key={h.id}>
                  <span className="activity-icon mint">
                    <HistoryIcon size={17} />
                  </span>
                  <div>
                    <strong>{h.description}</strong>
                    <p>{h.actor}</p>
                    <small>
                      {new Date(h.at).toLocaleString("en-GB", {
                        timeZone: "Asia/Colombo",
                      })}
                    </small>
                  </div>
                </div>
              ))}
            {!recent.length && (
              <p className="muted padded">
                No new changes yet. Your activity will appear here.
              </p>
            )}
          </div>
        </Modal>
      )}
      {modal === "settings" && (
        <SettingsModal
          actualRole={data.role}
          role={previewRole}
          email={data.email}
          onRole={setPreviewRole}
          onClose={() => setModal(null)}
          notify={setToast}
        />
      )}
      {modal === "manage" && (
        <Modal
          title="Manage classes"
          subtitle="Weekly timetables, extra classes and change history"
          onClose={() => setModal(null)}
          wide
        >
          <div className="modal-action-row">
            {role === "admin" && (
              <>
                <button
                  className="button primary"
                  onClick={() => {
                    setEditing(null);
                    setModal("weekly");
                  }}
                >
                  <Plus size={17} />
                  Weekly class
                </button>
                <button
                  className="button white"
                  onClick={() => {
                    setEditing(null);
                    setModal("extra");
                  }}
                >
                  <Plus size={17} />
                  Extra class
                </button>
              </>
            )}
            <button
              className="button white"
              onClick={() => setModal("history")}
            >
              <HistoryIcon size={17} />
              Change history
            </button>
          </div>
          <div className="manage-list">
            {schedules.map((s) => {
              const v =
                [...s.versions]
                  .reverse()
                  .find(
                    (v) => v.from <= date && (!v.until || date <= v.until),
                  ) || s.versions.at(-1)!;
              return (
                <div className="manage-row" key={s.id}>
                  <span className="class-icon teal">
                    <GraduationCap size={23} />
                  </span>
                  <div>
                    <h3>{classes.find((c) => c.id === s.classId)?.name}</h3>
                    <p>
                      {s.extraDate
                        ? shortDate(s.extraDate)
                        : "Every " +
                          [
                            "Sunday",
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                          ][v.weekday]}{" "}
                      · {timeText(v.start)} – {timeText(v.end)}
                    </p>
                    <small>
                      {v.cancelled
                        ? "Cancelled from " + v.from
                        : s.extraDate
                          ? "Extra class"
                          : "Weekly timetable"}
                    </small>
                  </div>
                  {role === "admin" && (
                    <button
                      className="button white"
                      onClick={() => {
                        let d = s.extraDate || date;
                        while (!sessionsFor(d, [s], []).length)
                          d = addDays(d, 1);
                        scheduleEditor(sessionsFor(d, [s], overrides)[0]);
                      }}
                    >
                      Edit
                      <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      )}
      {["schedule", "weekly", "extra"].includes(modal || "") && (
        <ScheduleModal
          mode={modal!}
          session={editing}
          date={date}
          records={data.records}
          role={role}
          onClose={() => setModal(null)}
          onSave={async (entity, value) => {
            await save(entity, value, "Schedule saved with change history");
            setModal(null);
          }}
        />
      )}
      {modal === "history" && (
        <Modal
          title="Schedule change history"
          subtitle="Who changed what, and when"
          onClose={() => setModal(null)}
        >
          {changeHistory.length ? (
            changeHistory.map((h) => (
              <div className="history-row" key={h.id}>
                <span className="activity-icon lilac">
                  <CalendarClock size={18} />
                </span>
                <div>
                  <strong>{h.description}</strong>
                  <p>{h.key}</p>
                  <small>
                    {h.actor} ·{" "}
                    {new Date(h.at).toLocaleString("en-GB", {
                      timeZone: "Asia/Colombo",
                    })}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <HistoryIcon size={30} />
              <h3>No schedule changes yet</h3>
              <p>
                Session edits, cancellations and timetable changes will appear
                here.
              </p>
            </div>
          )}
        </Modal>
      )}
      {modal === "free" && (
        <FreeTimes
          date={date}
          classes={classes}
          schedules={schedules}
          overrides={overrides}
          role={role}
          onClose={() => setModal(null)}
          onChoose={async (c, d, start, end) => {
            await save(
              "schedules",
              {
                id: "extra-" + crypto.randomUUID(),
                classId: c,
                extraDate: d,
                versions: [{ from: d, weekday: weekday(d), start, end }],
              },
              "Extra class added",
            );
            setDate(d);
            setCalendar(d !== today);
            setModal(null);
          }}
        />
      )}
      {modal === "register" && (
        <RegisterModal
          classes={classes}
          existing={student}
          students={students}
          onClose={() => setModal(null)}
          onSave={async (s) => {
            await save("students", s, "Student saved. Their QR is ready.");
            setStudent(s);
            setModal("qr");
          }}
        />
      )}
      {modal === "qr" && student && (
        <QRModal
          student={student}
          classLabel={classes.find((c) => c.id === student.classId)?.name || ""}
          onClose={() => setModal(null)}
          onScan={() => {
            setModal(null);
            navigate("Scan");
          }}
        />
      )}
      {modal === "profile" && student && (
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
                {student.id} ·{" "}
                {classes.find((c) => c.id === student.classId)?.name}
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
              <button
                className="button white"
                onClick={() => setModal("register")}
              >
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
      )}
      {modal === "payment" && student && currentClass && (
        <PaymentModal
          student={student}
          amount={currentClass.fee}
          month={month}
          onClose={() => setModal(null)}
          onSave={async (method) => {
            await save(
              "fees",
              {
                id: student.id + "@" + currentClass.id + "@" + month,
                studentId: student.id,
                classId: currentClass.id,
                month,
                amount: currentClass.fee,
                method,
                at: new Date().toISOString(),
              },
              "Payment recorded. Attendance and tute status are unchanged.",
            );
            setModal(null);
          }}
        />
      )}
      {modal === "tutes" && (
        <TuteModal
          classes={classes}
          month={month}
          tutes={tutes}
          issues={issues}
          students={students}
          role={role}
          onClose={() => setModal(null)}
          onSave={async (value) => {
            await save("tutes", value, "Lesson title saved");
          }}
        />
      )}
    </div>
  );
  function exportReport() {
    const roster = students.filter((s) => s.classId === reportClass);
    const rows = [
      [
        "Student ID",
        "Name",
        "Class",
        "Month",
        "Attendance count",
        "Fee paid (LKR)",
        "Tute issued",
      ],
      ...roster.map((s) => [
        s.id,
        s.name,
        classes.find((c) => c.id === s.classId)?.name || "",
        reportMonth,
        attendance.filter(
          (a) => a.studentId === s.id && a.date.startsWith(reportMonth),
        ).length,
        fees
          .filter(
            (f) =>
              f.studentId === s.id &&
              f.month === reportMonth &&
              f.classId === s.classId,
          )
          .reduce((n, f) => n + f.amount, 0),
        issues.some(
          (i) =>
            i.studentId === s.id &&
            tutes.some((t) => t.id === i.tuteId && t.month === reportMonth),
        )
          ? "Yes"
          : "No",
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((r) =>
          r
            .map(
              (v) =>
                '"' +
                String(v)
                  .replace(/^[=+@-]/, "'$&")
                  .replace(/"/g, '""') +
                '"',
            )
            .join(","),
        )
        .join("\r\n");
    download(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      "classroom-" + reportClass + "-" + reportMonth + ".csv",
    );
    setToast("Report exported with local and synced records.");
  }
}
















createRoot(document.getElementById("root")!).render(<App />);
