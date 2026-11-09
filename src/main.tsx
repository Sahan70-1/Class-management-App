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
          {tab === "Today" && (
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
                        lined up{" "}
                        {date === today ? "today" : "on " + shortDate(date)}.
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
                    {activeSession
                      ? "Start student check-in"
                      : "Find a free time"}
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
                      const count = students.filter(
                        (s) => s.classId === c.id,
                      ).length;
                      const marked = attendance.filter(
                        (a) => a.sessionId === session.id,
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
                                {session.extra
                                  ? "One-time class"
                                  : "Weekly class"}
                              </p>
                            </div>
                            {role === "admin" && (
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
                                    <Avatar
                                      key={s.id}
                                      student={s}
                                      size="tiny"
                                    />
                                  ))}
                              </div>
                              <span>
                                <strong>{count}</strong> students{" "}
                                {marked > 0 && (
                                  <small>· {marked} present</small>
                                )}
                              </span>
                            </div>
                            <button
                              className={
                                "button " + (i === 0 ? "primary" : "subtle")
                              }
                              onClick={() => openClass(session)}
                              disabled={session.cancelled}
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
                          A fresh space for learning. Add an extra class or
                          choose another day.
                        </p>
                        {role === "admin" && (
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
                                (s) =>
                                  r.key.startsWith(s.id + "@") ||
                                  r.key === s.id,
                              )?.name || "Class timetable"}{" "}
                              <span>·</span>{" "}
                              {r.pending ? "Saved locally" : "Synced"}
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
                          You’re all set. New activity will appear here as you
                          teach.
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
                    <button
                      className="button white"
                      onClick={() => setModal("free")}
                    >
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
                      const total = students.filter(
                        (s) => s.classId === c.id,
                      ).length;
                      const count = issues.filter(
                        (i) => i.tuteId === t?.id,
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
                                width:
                                  (total ? (count / total) * 100 : 0) + "%",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <button
                      className="text-button"
                      onClick={() => setModal("tutes")}
                    >
                      Manage tutes
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </aside>
              </div>
            </>
          )}

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




function StudentCheckin({
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
function Scanner({
  disabled,
  onResult,
  notify,
}: {
  disabled: boolean;
  onResult: (raw: string) => void;
  notify: (message: string) => void;
}) {
  const [active, setActive] = useState(false),
    [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!active) return;
    let stopped = false,
      frame = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
        function scan() {
          if (stopped) return;
          if (video.current?.readyState === 4) {
            canvas.width = video.current.videoWidth;
            canvas.height = video.current.videoHeight;
            ctx.drawImage(video.current, 0, 0);
            const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(image.data, image.width, image.height);
            if (code) {
              onResult(code.data);
              setActive(false);
              return;
            }
          }
          frame = requestAnimationFrame(scan);
        }
        frame = requestAnimationFrame(scan);
      })
      .catch((e) => {
        setError(
          e.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in your browser or upload a QR image."
            : "Camera is unavailable. Upload a QR image or search for a student.",
        );
        setActive(false);
      });
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);
  async function upload(f: File) {
    try {
      const image = await createImageBitmap(f);
      const c = document.createElement("canvas");
      c.width = image.width;
      c.height = image.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      const result = jsQR(data.data, c.width, c.height);
      image.close();
      if (result) onResult(result.data);
      else notify("No readable QR found in this image. Try a clearer image.");
    } catch {
      notify("This image could not be read. Use a PNG or JPEG.");
    }
  }
  return (
    <>
      <div className={"scanner-window " + (active ? "is-active" : "")}>
        {active ? (
          <video ref={video} playsInline muted />
        ) : (
          <div className="scanner-placeholder">
            <div className="qr-sample">
              <ScanLine size={66} strokeWidth={1.1} />
            </div>
            <h3>One scan. A familiar face.</h3>
            <p>Place the student’s QR inside the frame.</p>
            <button
              className="button primary"
              onClick={() => {
                if (!navigator.mediaDevices) {
                  setError(
                    "Camera access requires HTTPS. Upload a QR image or search for a student.",
                  );
                  return;
                }
                setError("");
                setActive(true);
              }}
              disabled={disabled}
            >
              <Camera size={18} />
              Open camera
            </button>
          </div>
        )}
        <div className="scanner-corners">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="scanner-bottom">
          <span>
            <i />
            {active ? "Camera active" : "Camera is paused"}
          </span>
          {active && (
            <button onClick={() => setActive(false)}>Stop camera</button>
          )}
        </div>
      </div>
      {error && (
        <div role="alert" className="callout warning">
          <Info size={18} />
          {error}
        </div>
      )}
      <button
        className="upload-qr"
        onClick={() => file.current?.click()}
        disabled={disabled}
      >
        <ImagePlus size={17} />
        Or upload a QR image
        <ArrowUpRight size={14} />
      </button>
      <input
        hidden
        type="file"
        ref={file}
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.[0]) void upload(e.target.files[0]);
        }}
      />
    </>
  );
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ScheduleModal({
  mode,
  session,
  date,
  records,
  role,
  onClose,
  onSave,
}: {
  mode: string;
  session: Session | null;
  date: string;
  records: StoredRecord[];
  role: Role;
  onClose: () => void;
  onSave: (
    entity: "schedules" | "overrides",
    value: Schedule | Override,
  ) => Promise<void>;
}) {
  const classes = values(records, "classes"),
    schedules = values(records, "schedules"),
    overrides = values(records, "overrides");
  const [classId, setClassId] = useState(
      session?.classId || classes[0]?.id || "",
    ),
    [day, setDay] = useState(session?.date || date),
    [start, setStart] = useState(session?.start || "14:00"),
    [end, setEnd] = useState(session?.end || "16:00"),
    [scope, setScope] = useState<"day" | "onward">("day"),
    [cancel, setCancel] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const original = schedules.find((s) => s.id === session?.scheduleId);
  const extra = mode === "extra" || !!original?.extraDate;
  const duration = Math.max(
    30,
    Number(end.slice(0, 2)) * 60 +
      Number(end.slice(3)) -
      Number(start.slice(0, 2)) * 60 -
      Number(start.slice(3)),
  );
  const free = freeSlots(day, duration, schedules, overrides, original?.id);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (role !== "admin") return;
    if (start >= end) {
      setError("End time must be later than the start time.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "schedule" && original && scope === "day") {
        const change: Override = {
          id: original.id + "@" + day,
          scheduleId: original.id,
          date: day,
          start,
          end,
          cancelled: cancel,
        };
        const conflict =
          !cancel &&
          sessionsFor(day, schedules, overrides).some(
            (s) =>
              s.scheduleId !== original.id &&
              !s.cancelled &&
              overlaps(s, change),
          );
        if (conflict) {
          setError(
            "This time overlaps another class. Choose a free time below.",
          );
          return;
        }
        await onSave("overrides", change);
      } else {
        const next: Schedule = original
          ? {
              ...original,
              versions: [
                ...original.versions
                  .filter((v) => v.from < day)
                  .map((v) => ({
                    ...v,
                    until:
                      v.until && v.until < day ? v.until : addDays(day, -1),
                  })),
                {
                  from: day,
                  weekday: weekday(day),
                  start,
                  end,
                  cancelled: cancel,
                },
              ],
            }
          : {
              id: (extra ? "extra-" : "weekly-") + crypto.randomUUID(),
              classId,
              extraDate: extra ? day : undefined,
              versions: [{ from: day, weekday: weekday(day), start, end }],
            };
        const conflict = findConflict(next, schedules, overrides);
        if (conflict) {
          setError(
            "This overlaps " +
              (classes.find((c) => c.id === conflict.session.classId)?.name ||
                "another class") +
              " on " +
              shortDate(conflict.date) +
              ". Choose a free time.",
          );
          return;
        }
        await onSave("schedules", next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save schedule.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        mode === "schedule"
          ? "Edit class session"
          : extra
            ? "Add an extra class"
            : "Add a weekly class"
      }
      subtitle={
        mode === "schedule"
          ? "Choose how this change applies. Past records stay intact."
          : "One tutor, one timetable. We check for overlaps."
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="form">
        <label>
          Class
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            disabled={!!original}
          >
            {classes.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name} · {c.subject}
              </option>
            ))}
          </select>
        </label>
        <label>
          {extra
            ? "Class date"
            : mode === "schedule"
              ? "Session / effective date"
              : "First class date (repeats weekly)"}
          <input
            type="date"
            required
            value={day}
            disabled={mode === "schedule"}
            onChange={(e) => {
              if (e.target.value) setDay(e.target.value);
            }}
          />
        </label>
        <div className="form-grid">
          <label>
            Start time
            <input
              type="time"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
              disabled={cancel}
            />
          </label>
          <label>
            End time
            <input
              type="time"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              disabled={cancel}
            />
          </label>
        </div>
        {mode === "schedule" && (
          <>
            <fieldset>
              <legend>Apply this change to</legend>
              <label className="radio-card">
                <input
                  type="radio"
                  checked={scope === "day"}
                  onChange={() => setScope("day")}
                />
                <div>
                  <strong>This day only</strong>
                  <small>Other class dates stay as scheduled.</small>
                </div>
              </label>
              {!extra && (
                <label className="radio-card">
                  <input
                    type="radio"
                    checked={scope === "onward"}
                    onChange={() => setScope("onward")}
                  />
                  <div>
                    <strong>From this day onward</strong>
                    <small>
                      Update the weekly timetable from {shortDate(day)}.
                    </small>
                  </div>
                </label>
              )}
            </fieldset>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={cancel}
                onChange={(e) => setCancel(e.target.checked)}
              />
              Cancel{" "}
              {scope === "day"
                ? "this session"
                : "classes from this day onward"}
            </label>
          </>
        )}
        {error && (
          <div role="alert" className="callout warning">
            <TriangleAlert size={18} />
            {error}
          </div>
        )}
        {error && free.length > 0 && (
          <div className="free-suggestions">
            <strong>Available on {shortDate(day)}</strong>
            {free.slice(0, 4).map((slot) => (
              <button
                type="button"
                className="button white"
                key={slot.start}
                onClick={() => {
                  setStart(slot.start);
                  setEnd(slot.end);
                  setError("");
                }}
              >
                {timeText(slot.start)} – {timeText(slot.end)}
              </button>
            ))}
          </div>
        )}
        <div className="callout">
          <HistoryIcon size={17} />
          <span>
            Every schedule change is recorded with its date and author. Weekly
            overlaps are checked up to a year ahead.
          </span>
        </div>
        <button
          type="submit"
          className={"button full " + (cancel ? "danger" : "primary")}
          disabled={busy || role !== "admin"}
        >
          {cancel
            ? "Save cancellation"
            : busy
              ? "Saving…"
              : "Save class schedule"}
          <Check size={17} />
        </button>
      </form>
    </Modal>
  );
}
function FreeTimes({
  date,
  classes,
  schedules,
  overrides,
  role,
  onClose,
  onChoose,
}: {
  date: string;
  classes: EntityMap["classes"][];
  schedules: Schedule[];
  overrides: Override[];
  role: Role;
  onClose: () => void;
  onChoose: (
    classId: string,
    date: string,
    start: string,
    end: string,
  ) => Promise<void>;
}) {
  const [day, setDay] = useState(date),
    [classId, setClassId] = useState(classes[0]?.id || ""),
    [duration, setDuration] = useState(120),
    [choice, setChoice] = useState(""),
    [busy, setBusy] = useState(false);
  const busySessions = sessionsFor(day, schedules, overrides).filter(
    (s) => !s.cancelled,
  );
  const slots = freeSlots(day, duration, schedules, overrides);
  return (
    <Modal
      title="Find a little breathing room"
      subtitle="Available times across your full teaching timetable"
      onClose={onClose}
    >
      <div className="form">
        <label>
          Class
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Date
            <input
              type="date"
              value={day}
              onChange={(e) => {
                if (e.target.value) {
                  setDay(e.target.value);
                  setChoice("");
                }
              }}
            />
          </label>
          <label>
            Lesson duration
            <select
              value={duration}
              onChange={(e) => {
                setDuration(Number(e.target.value));
                setChoice("");
              }}
            >
              <option value="60">1 hour</option>
              <option value="90">1½ hours</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
            </select>
          </label>
        </div>
        <div className="callout">
          <Clock size={18} />
          <span>
            Teaching hours: 8:00 AM – 8:00 PM
            {busySessions.length > 0 && (
              <>
                <br />
                {busySessions
                  .map((s) => timeText(s.start) + "–" + timeText(s.end))
                  .join(", ")}{" "}
                already scheduled.
              </>
            )}
          </span>
        </div>
        <h3>
          Available times <small className="muted">· {shortDate(day)}</small>
        </h3>
        <div className="slot-list">
          {slots.map((s) => (
            <button
              className={choice === s.start ? "selected" : ""}
              key={s.start}
              onClick={() => setChoice(s.start)}
            >
              <span className="radio-dot" />
              {timeText(s.start)} – {timeText(s.end)}
              {choice === s.start && <Check size={16} />}
            </button>
          ))}
          {!slots.length && (
            <p className="muted">
              No free {duration / 60}-hour slot. Choose another date or a
              shorter lesson.
            </p>
          )}
        </div>
        {role === "admin" && (
          <button
            className="button primary full"
            disabled={!choice || busy}
            onClick={async () => {
              const slot = slots.find((s) => s.start === choice);
              if (!slot) return;
              setBusy(true);
              try {
                await onChoose(classId, day, slot.start, slot.end);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Plus size={18} />
            {busy ? "Adding…" : "Use time for extra class"}
          </button>
        )}
        <span className="form-hint">
          <ShieldCheck size={15} />
          Overlaps are checked again when your change syncs.
        </span>
      </div>
    </Modal>
  );
}
function RegisterModal({
  classes,
  existing,
  students,
  onClose,
  onSave,
}: {
  classes: EntityMap["classes"][];
  existing: Student | null;
  students: Student[];
  onClose: () => void;
  onSave: (s: Student) => Promise<void>;
}) {
  const [name, setName] = useState(existing?.name || ""),
    [classId, setClassId] = useState(existing?.classId || classes[0]?.id || ""),
    [phone, setPhone] = useState(existing?.phone || ""),
    [parentPhone, setParentPhone] = useState(existing?.parentPhone || ""),
    [whatsapp, setWhatsapp] = useState(existing?.whatsapp || ""),
    [address, setAddress] = useState(existing?.address || ""),
    [photo, setPhoto] = useState(existing?.photo || ""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  async function addPhoto(f: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    try {
      const image = await createImageBitmap(f);
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const ctx = c.getContext("2d")!;
      const side = Math.min(image.width, image.height);
      ctx.drawImage(
        image,
        (image.width - side) / 2,
        (image.height - side) / 2,
        side,
        side,
        0,
        0,
        256,
        256,
      );
      setPhoto(c.toDataURL("image/jpeg", 0.8));
      image.close();
      setError("");
    } catch {
      setError("This photo could not be read.");
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const c = classes.find((c) => c.id === classId)!;
    const grade = c.name.replace("Grade ", "");
    const id =
      existing?.id || "S-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    const sameClass = existing?.classId === classId;
    const roll = sameClass
      ? existing!.roll
      : grade.padStart(2, "0") + "-" + id.slice(-6);
    try {
      await onSave({
        id,
        name: name.trim(),
        phone,
        parentPhone,
        whatsapp,
        address,
        photo: photo || undefined,
        classId,
        grade,
        roll,
        color:
          existing?.color ||
          ["mint", "peach", "blue", "lilac"][students.length % 4],
      });
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={existing ? "Edit student" : "A new face. A fresh start."}
      subtitle={
        existing
          ? "The student ID and QR stay the same when details change."
          : "Register a student and create their permanent QR."
      }
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <div className="register-top">
          <button
            className="photo-upload"
            type="button"
            onClick={() => file.current?.click()}
          >
            {photo ? (
              <img src={photo} alt="Student photo preview" />
            ) : (
              <>
                <Camera size={25} />
                <span>
                  Add photo<small>Optional</small>
                </span>
              </>
            )}
          </button>
          <input
            ref={file}
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              if (e.target.files?.[0]) void addPhoto(e.target.files[0]);
            }}
          />
          <label>
            Class & grade
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.subject}
                </option>
              ))}
            </select>
            <span className="form-hint">
              {new Date().getFullYear()} academic year
            </span>
          </label>
        </div>
        <label>
          Full name
          <input
            required
            maxLength={100}
            value={name}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Saman Kumara"
          />
        </label>
        <div className="form-grid">
          <label>
            Student phone
            <input
              type="tel"
              maxLength={30}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07X XXX XXXX"
            />
          </label>
          <label>
            Parent phone
            <input
              type="tel"
              maxLength={30}
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="07X XXX XXXX"
            />
          </label>
        </div>
        <label>
          WhatsApp number
          <input
            type="tel"
            maxLength={30}
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="07X XXX XXXX"
          />
        </label>
        <label>
          Address
          <textarea
            rows={2}
            maxLength={400}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Optional home address"
          />
        </label>
        {error && (
          <div className="callout warning" role="alert">
            {error}
          </div>
        )}
        <div className="callout">
          <Info size={18} />
          <span>
            Student ID is assigned automatically and never changes. QR codes
            contain the ID, with no contact details.
          </span>
        </div>
        <button className="button primary full" disabled={saving}>
          {saving
            ? "Saving…"
            : existing
              ? "Save student details"
              : "Register & create QR"}
          <ArrowRight size={17} />
        </button>
      </form>
    </Modal>
  );
}
function QRModal({
  student,
  classLabel,
  onClose,
  onScan,
}: {
  student: Student;
  classLabel: string;
  onClose: () => void;
  onScan: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current)
      void QRCode.toCanvas(
        canvas.current,
        JSON.stringify({ app: "classroom", v: 1, id: student.id }),
        {
          width: 260,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#152c34", light: "#ffffff" },
        },
      );
  }, [student.id]);
  function printQR() {
    const popup = window.open("", "_blank", "width=500,height=650");
    if (!popup || !canvas.current) return;
    popup.document.title = "Student QR · " + student.id;
    const heading = popup.document.createElement("h1");
    heading.textContent = student.name;
    const info = popup.document.createElement("p");
    info.textContent =
      student.id + " · " + classLabel + " · Roll " + student.roll;
    const image = popup.document.createElement("img");
    image.src = canvas.current.toDataURL();
    image.width = 300;
    popup.document.body.style.cssText =
      "font-family:system-ui;text-align:center;padding:30px";
    popup.document.body.append(heading, info, image);
    image.onload = () => {
      popup.focus();
      popup.print();
    };
  }
  return (
    <Modal
      title="One student. One permanent QR."
      subtitle="Ready to save, print and bring to class"
      onClose={onClose}
    >
      <div className="qr-profile">
        <Avatar student={student} size="large" />
        <div>
          <h2>{student.name}</h2>
          <p>
            {student.id} · {classLabel}
          </p>
          <span>Class roll {student.roll}</span>
        </div>
      </div>
      <div className="qr-canvas">
        <canvas ref={canvas} />
        <strong>{student.id}</strong>
        <span>CLASSROOM · STUDENT QR</span>
      </div>
      <div className="form">
        <button
          className="button primary full"
          onClick={() =>
            canvas.current?.toBlob((blob) => {
              if (blob) download(blob, student.id + "-QR.png");
            })
          }
        >
          <Download size={18} />
          Save QR image
        </button>
        <button className="button white full" onClick={printQR}>
          <Printer size={18} />
          Print QR
        </button>
        <button className="button white full" onClick={onScan}>
          <ScanLine size={18} />
          Back to scanner
        </button>
        <span className="form-hint">
          <Info size={15} />
          Keep this QR when the student’s grade or class changes.
        </span>
      </div>
    </Modal>
  );
}
function PaymentModal({
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
function TuteModal({
  classes,
  month,
  tutes,
  issues,
  students,
  role,
  onClose,
  onSave,
}: {
  classes: EntityMap["classes"][];
  month: string;
  tutes: EntityMap["tutes"][];
  issues: EntityMap["issues"][];
  students: Student[];
  role: Role;
  onClose: () => void;
  onSave: (t: EntityMap["tutes"]) => Promise<void>;
}) {
  const [classId, setClassId] = useState(classes[0]?.id || ""),
    [period, setPeriod] = useState(month),
    [title, setTitle] = useState(""),
    [busy, setBusy] = useState(false);
  const current = tutes.find(
    (t) => t.classId === classId && t.month === period,
  );
  useEffect(
    () => setTitle(current?.title || ""),
    [classId, period, current?.title],
  );
  const roster = students.filter((s) => s.classId === classId);
  return (
    <Modal
      title="A lesson worth keeping"
      subtitle="Manage tute titles and monthly distribution"
      onClose={onClose}
    >
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave({
              id: classId + "@" + period,
              classId,
              month: period,
              title: title.trim(),
            });
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            Class
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Month
            <input
              type="month"
              required
              value={period}
              onChange={(e) => {
                if (e.target.value) setPeriod(e.target.value);
              }}
            />
          </label>
        </div>
        <label>
          Lesson title
          <input
            required
            maxLength={150}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={role !== "admin"}
            placeholder="e.g. Perimeter & area"
          />
        </label>
        {role === "admin" && (
          <button className="button primary" disabled={busy || !title.trim()}>
            <Check size={17} />
            {busy ? "Saving…" : "Save lesson title"}
          </button>
        )}
        <div className="callout">
          <Info size={17} />
          <span>
            Editing a lesson title keeps existing issue records. Issue each tute
            separately at student check-in.
          </span>
        </div>
        <div className="tute-roster">
          {roster.map((s) => (
            <div key={s.id}>
              <Avatar student={s} size="small" />
              <strong>{s.name}</strong>
              <Badge
                tone={
                  issues.some(
                    (i) => i.tuteId === current?.id && i.studentId === s.id,
                  )
                    ? "mint"
                    : "amber"
                }
              >
                {issues.some(
                  (i) => i.tuteId === current?.id && i.studentId === s.id,
                )
                  ? "Issued"
                  : "Not issued"}
              </Badge>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
}
function SettingsModal({
  actualRole,
  role,
  email,
  onRole,
  onClose,
  notify,
}: {
  actualRole: Role;
  role: Role;
  email: string;
  onRole: (role: Role) => void;
  onClose: () => void;
  notify: (message: string) => void;
}) {
  const [memberEmail, setEmail] = useState(""),
    [memberRole, setMemberRole] = useState<Role>("staff"),
    [members, setMembers] = useState<{ email: string; role: Role }[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const response = await fetch("/api/members");
      if (response.ok) setMembers(await response.json());
    } catch {
      /* Current cached account remains available offline. */
    }
  }
  useEffect(() => {
    if (actualRole === "admin") void load();
  }, [actualRole]);
  return (
    <Modal
      title="Your teaching space"
      subtitle="Account, permissions and installation"
      onClose={onClose}
    >
      <div className="settings-account">
        <span className="tutor-avatar">T</span>
        <div>
          <strong>{email}</strong>
          <p>
            {actualRole === "admin"
              ? "Tutor · Administrator"
              : actualRole === "staff"
                ? "Attendance staff"
                : "Reports viewer"}
          </p>
        </div>
        <ShieldCheck size={20} />
      </div>
      <div className="form">
        {actualRole === "admin" && (
          <>
            <label>
              Preview a role
              <select
                value={role}
                onChange={(e) => onRole(e.target.value as Role)}
              >
                <option value="admin">Tutor / admin</option>
                <option value="staff">Attendance staff</option>
                <option value="viewer">Read-only reports viewer</option>
              </select>
              <span className="form-hint">
                Preview only. Actual permissions are enforced by the server.
              </span>
            </label>
            <h3 className="spaced-title">Workspace members</h3>
            {members.map((m) => (
              <div className="detail-row" key={m.email}>
                <span>{m.email}</span>
                <Badge tone={m.role === "admin" ? "mint" : "neutral"}>
                  {m.role}
                </Badge>
              </div>
            ))}
            <form
              className="form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const response = await fetch("/api/members", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email: memberEmail,
                      role: memberRole,
                    }),
                  });
                  if (!response.ok) {
                    const result = await response.json();
                    throw Error(result.error || "Could not save member.");
                  }
                  setEmail("");
                  notify(
                    "Member role saved. Also grant Site access to this person in sharing settings.",
                  );
                  await load();
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Connect online to manage members.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Member email
                <input
                  type="email"
                  required
                  value={memberEmail}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@example.com"
                />
              </label>
              <label>
                Permissions
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as Role)}
                >
                  <option value="staff">
                    Attendance staff · check-in, fees & tutes
                  </option>
                  <option value="viewer">
                    Read only · view & export reports
                  </option>
                  <option value="admin">Tutor / admin · full management</option>
                </select>
              </label>
              <button className="button primary" disabled={busy}>
                <Plus size={16} />
                {busy ? "Saving…" : "Save member role"}
              </button>
              {error && (
                <div role="alert" className="callout warning">
                  {error}
                </div>
              )}
              <span className="form-hint">
                Members also need access to this private Site. Set their role
                here before sharing access.
              </span>
            </form>
          </>
        )}
        <div className="callout">
          <Download size={18} />
          <span>
            <strong>Keep Classroom close.</strong>
            <br />
            Use your browser’s “Install app” or “Add to Home Screen” option.
            Open it online once to enable offline use.
          </span>
        </div>
        <a
          href="/signout-with-chatgpt?return_to=%2F"
          target="_top"
          className="button white"
        >
          <LogOut size={16} />
          Sign out of online account
        </a>
        <span className="form-hint">
          Signing out does not erase offline records. Use a trusted device for
          student information.
        </span>
      </div>
    </Modal>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
