import { activeStudentsOnly } from "./model";
import { reportCsv } from "./reports";
import { SessionOverview } from "./components/SessionOverview";
import { Modal } from "./components/Modal";
import { shortDate } from "./model";
import { CheckCircle2, GraduationCap, WifiOff, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ActivityDialog } from "./components/ActivityDialog";
import { Badge } from "./components/Badge";
import { BottomNavigation } from "./components/BottomNavigation";
import { FreeTimes } from "./components/FreeTimes";
import { ManageClassesDialog } from "./components/ManageClassesDialog";
import { PageHeading } from "./components/PageHeading";
import { PaymentModal } from "./components/PaymentModal";
import { QRModal } from "./components/QRModal";
import { RegisterModal } from "./components/RegisterModal";
import { ReportsTab } from "./components/ReportsTab";
import { ScanTab } from "./components/ScanTab";
import { ScheduleHistoryDialog } from "./components/ScheduleHistoryDialog";
import { ScheduleModal } from "./components/ScheduleModal";
import { SettingsModal } from "./components/SettingsModal";
import { Sidebar } from "./components/Sidebar";
import { StudentProfileDialog } from "./components/StudentProfileDialog";
import { StudentsTab } from "./components/StudentsTab";
import { SyncDialog } from "./components/SyncDialog";
import { TodayTab } from "./components/TodayTab";
import { Topbar } from "./components/Topbar";
import { TuteModal } from "./components/TuteModal";
import {
  monthOf,
  qrStudentId,
  sessionsFor,
  todayISO,
  values,
  weekday,
  type Entity,
  type EntityMap,
  type Role,
  type Session,
  type Student,
} from "./model";
import { type Tab } from "./navigation";
import { getSnapshot, initialize, mutate, subscribe } from "./store";
import { download } from "./utils";

export function App() {
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
  const enrolled = activeStudentsOnly(students);
  useEffect(() => {
    if (student) {
      const latest = students.find((s) => s.id === student.id);
      if (latest) setStudent(latest);
    }
  }, [data.records, student?.id]);
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
  const activeStudents = enrolled.filter(
    (s) => s.classId === activeSession?.classId,
  );
  const month = monthOf(date);
  const currentTute = tutes.find(
    (t) => t.classId === activeSession?.classId && t.month === month,
  );
  const present = attendance.filter(
      (a) => a.date === date && enrolled.some((s) => s.id === a.studentId),
    ).length,
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
    setModal("overview");
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
    if (s.removedAt) {
      setStudent(null);
      setToast("This student has been removed.");
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
    if (
      !student ||
      students.find((s) => s.id === student.id)?.removedAt ||
      !activeSession ||
      activeSession.cancelled
    )
      return;
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
    if (
      !student ||
      students.find((s) => s.id === student.id)?.removedAt ||
      !currentTute
    )
      return;
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
      <Sidebar
        mobileMenu={mobileMenu}
        navigate={navigate}
        tab={tab}
        students={enrolled}
        setModal={setModal}
        role={role}
      />
      {mobileMenu && (
        <button
          className="mobile-scrim"
          aria-label="Close menu"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <div className="main-shell">
        <Topbar
          setMobileMenu={setMobileMenu}
          tab={tab}
          data={data}
          setModal={setModal}
        />
        <main>
          <PageHeading
            tab={tab}
            student={student}
            role={role}
            setCalendar={setCalendar}
            calendar={calendar}
            date={date}
            setStudent={setStudent}
            setModal={setModal}
            exportReport={exportReport}
          />

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
            <TodayTab
              sessions={sessions}
              date={date}
              today={today}
              activeSession={activeSession}
              openClass={openClass}
              setModal={setModal}
              month={month}
              present={present}
              collected={collected}
              students={enrolled}
              calendar={calendar}
              setCalendar={setCalendar}
              setDate={setDate}
              schedules={schedules}
              overrides={overrides}
              classes={classes}
              attendance={attendance}
              role={role}
              scheduleEditor={scheduleEditor}
              setEditing={setEditing}
              recent={recent}
              tutes={tutes}
              issues={issues}
            />
          )}

          {tab === "Scan" && (
            <ScanTab
              activeSession={activeSession}
              setSelected={setSelected}
              setStudent={setStudent}
              sessions={sessions}
              classes={classes}
              date={date}
              setDate={setDate}
              student={students.find((s) => s.id === student?.id) || null}
              studentStatus={studentStatus}
              currentClass={currentClass}
              currentTute={currentTute}
              role={role}
              attendance={attendance}
              schedules={schedules}
              overrides={overrides}
              markAttendance={markAttendance}
              setModal={setModal}
              issueTute={issueTute}
              scanResult={scanResult}
              setToast={setToast}
              query={query}
              setQuery={setQuery}
              students={enrolled}
              activeStudents={activeStudents}
            />
          )}

          {tab === "Students" && (
            <StudentsTab
              role={role}
              query={query}
              setQuery={setQuery}
              filter={filter}
              setFilter={setFilter}
              classes={classes}
              setModal={setModal}
              students={students}
              tutes={tutes}
              today={today}
              setStudent={setStudent}
              fees={fees}
              issues={issues}
            />
          )}

          {tab === "Reports" && (
            <ReportsTab
              reportClass={reportClass}
              setReportClass={setReportClass}
              classes={classes}
              reportMonth={reportMonth}
              setReportMonth={setReportMonth}
              students={students}
              fees={fees}
              attendance={attendance}
              tutes={tutes}
              issues={issues}
              reportType={reportType}
              setReportType={setReportType}
              data={data}
            />
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
      <BottomNavigation tab={tab} navigate={navigate} />
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
      {modal === "sync" && <SyncDialog setModal={setModal} data={data} />}
      {modal === "activity" && (
        <ActivityDialog setModal={setModal} data={data} recent={recent} />
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
      {modal === "overview" && activeSession && currentClass && (
        <Modal
          title="Session overview"
          subtitle={shortDate(activeSession.date)}
          onClose={() => setModal(null)}
          wide
        >
          <SessionOverview
            session={activeSession}
            group={currentClass}
            students={students}
            attendance={attendance}
            role={role}
            onStart={() => {
              setModal(null);
              setTab("Scan");
              setStudent(null);
              setQuery("");
            }}
          />
        </Modal>
      )}
      {modal === "manage" && (
        <ManageClassesDialog
          notify={setToast}
          setModal={setModal}
          role={role}
          setEditing={setEditing}
          schedules={schedules}
          date={date}
          classes={classes}
          scheduleEditor={scheduleEditor}
          overrides={overrides}
        />
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
        <ScheduleHistoryDialog
          setModal={setModal}
          changeHistory={changeHistory}
        />
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
        <StudentProfileDialog
          setModal={setModal}
          student={student}
          classes={classes}
          attendance={attendance}
          fees={fees}
          issues={issues}
          role={role}
        />
      )}
      {modal === "payment" && student && !student.removedAt && currentClass && (
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
          students={enrolled}
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
    const csv = reportCsv(
      students,
      classes,
      reportClass,
      reportMonth,
      attendance,
      fees,
      issues,
      tutes,
    );
    download(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      "classroom-" + reportClass + "-" + reportMonth + ".csv",
    );
    setToast("Report exported with local and synced records.");
  }
}
