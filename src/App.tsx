import { activeStudentsOnly } from "./model";
import { reportCsv } from "./reports";
import { ClassSessions } from "./components/ClassSessions";
import { MiniCalendar } from "./components/MiniCalendar";
import { SessionOverview } from "./components/SessionOverview";
import { Modal } from "./components/Modal";
import { shortDate } from "./model";
import { CheckCircle2, GraduationCap, WifiOff, X } from "lucide-react";
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
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
import { nextDialogPath, type DialogName, type Tab } from "./navigation";
import { getSnapshot, initialize, mutate, subscribe, sync } from "./store";
import { download } from "./utils";
import { confirmCheckinSave } from "./feedback";

export function App() {
  const data = useSyncExternalStore(subscribe, getSnapshot);
  const today = todayISO();
  const [tab, setTab] = useState<Tab>("Today"),
    [date, setDate] = useState(today),
    [selected, setSelected] = useState<string>(""),
    [student, setStudent] = useState<Student | null>(null),
    [dialogPath, setDialogPath] = useState<readonly DialogName[]>([]),
    [editing, setEditing] = useState<Session | null>(null),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [reportClass, setReportClass] = useState("grade-9"),
    [reportMonth, setReportMonth] = useState(monthOf(today)),
    [reportType, setReportType] = useState("attendance"),
    [previewRole, setPreviewRole] = useState<Role>("admin"),
    [toast, setToast] = useState(""),
    [mobileMenu, setMobileMenu] = useState(false);
  const modal = dialogPath.at(-1);
  function setModal(next: DialogName | null, replace = false) {
    // An async save can finish after its dialog has already been dismissed.
    setDialogPath((current) =>
      current === dialogPath ? nextDialogPath(current, next, replace) : current,
    );
  }
  const students = values(data.records, "students"),
    classes = values(data.records, "classes"),
    schedules = values(data.records, "schedules"),
    overrides = values(data.records, "overrides"),
    attendance = values(data.records, "attendance"),
    fees = values(data.records, "fees"),
    allTutes = values(data.records, "tutes"),
    tutes = allTutes.filter((t) => !t.deleted),
    issues = values(data.records, "issues");
  const profiles = values(data.records, "profiles");
  const myPhoto = profiles.find((p) => p.id === data.email)?.photo;
  const enrolled = activeStudentsOnly(students);
  useLayoutEffect(() => {
    const page = document.scrollingElement;
    if (page) page.scrollTop = 0;
  }, [tab]);
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
  const todaySessions =
    date === today ? sessions : sessionsFor(today, schedules, overrides);
  const nextClass = todaySessions.find((s) => !s.cancelled) || null;
  const present = attendance.filter(
      (a) => a.date === today && enrolled.some((s) => s.id === a.studentId),
    ).length,
    collected = fees
      .filter((f) => f.at.slice(0, 10) === today)
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
  useEffect(() => {
    if (data.accessMessage) {
      setDialogPath([]);
      setMobileMenu(false);
      setStudent(null);
      setTab("Today");
    }
  }, [data.accessMessage]);
  async function save<K extends Entity>(
    entity: K,
    value: EntityMap[K],
    message: string,
  ) {
    try {
      await mutate(entity, value, role);
      confirmCheckinSave(entity);
      setToast(message);
      return true;
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not save.");
      return false;
    }
  }
  function navigate(t: Tab) {
    if (t === "Today") setDate(today);
    setDialogPath([]);
    setTab(t);
    setStudent(null);
    setQuery("");
    setMobileMenu(false);
  }
  function openClass(session: Session) {
    setDate(session.date);
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
      "Marked present: " + student.name,
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
      "Tute given to " + student.name,
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
  const scheduleEditor = (session: Session) => {
    setEditing(session);
    setModal("schedule");
  };

  if (data.accessMessage) {
    return (
      <main>
        <section className="panel form" aria-labelledby="workspace-access-title">
          <h1 id="workspace-access-title">Workspace access</h1>
          <p>{data.accessMessage}</p>
          <div className="modal-action-row">
            <button className="button primary" disabled={data.syncing || !data.online} onClick={() => void sync()}>
              {data.syncing ? "Checking…" : "Check access again"}
            </button>
            <a className="button white" target="_top" href="/signout-with-chatgpt?return_to=%2F">Switch account</a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        mobileMenu={mobileMenu}
        goHome={() => navigate("Today")}
        open={(section) => {
          setMobileMenu(false);
          if (section === "classes") setDate(today);
          setModal(section);
        }}
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
          photo={myPhoto}
          setMobileMenu={setMobileMenu}
          tab={tab}
          data={data}
          setModal={setModal}
        />
        <main key={tab}>
          <PageHeading
            tab={tab}
            student={student}
            role={role}
            date={today}
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
              sessions={todaySessions}
              activeSession={nextClass}
              classes={classes}
              openClass={openClass}
              setModal={setModal}
              present={present}
              collected={collected}
              students={enrolled}
              tutes={tutes}
              month={monthOf(today)}
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
              tutes={allTutes}
              issues={issues}
              reportType={reportType}
              setReportType={setReportType}
              data={data}
            />
          )}
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
      {dialogPath.includes("sync") && (
        <SyncDialog setModal={setModal} data={data} />
      )}
      {dialogPath.includes("classes") && (
        <ClassSessions
          sessions={sessions}
          date={date}
          classes={classes}
          students={enrolled}
          attendance={attendance}
          role={role}
          openClass={openClass}
          scheduleEditor={scheduleEditor}
          setModal={setModal}
          setEditing={setEditing}
        />
      )}
      {dialogPath.includes("calendar") && (
        <Modal title="Calendar" onClose={() => setModal(null)}>
          <MiniCalendar
            date={date}
            onDate={(day) => {
              setDate(day);
              setModal("classes");
            }}
            schedules={schedules}
            overrides={overrides}
          />
        </Modal>
      )}
      {dialogPath.includes("activity") && (
        <ActivityDialog profiles={profiles} setModal={setModal} data={data} />
      )}
      {dialogPath.includes("settings") && (
        <SettingsModal
          photo={myPhoto}
          savePhoto={async (photo) => {
            await mutate("profiles", { id: data.email, photo }, role);
            setToast("Profile picture updated");
          }}
          actualRole={data.role}
          role={previewRole}
          email={data.email}
          onRole={setPreviewRole}
          onClose={() => setModal(null)}
          notify={setToast}
        />
      )}
      {dialogPath.includes("overview") && activeSession && currentClass && (
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
              navigate("Scan");
            }}
          />
        </Modal>
      )}
      {dialogPath.includes("manage") && (
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
            if (await save(entity, value, "Schedule saved with change history"))
              setModal(null);
          }}
        />
      )}
      {dialogPath.includes("history") && (
        <ScheduleHistoryDialog
          setModal={setModal}
          changeHistory={changeHistory}
        />
      )}
      {dialogPath.includes("free") && (
        <FreeTimes
          date={date}
          classes={classes}
          schedules={schedules}
          overrides={overrides}
          role={role}
          onClose={() => setModal(null)}
          onChoose={async (c, d, start, end) => {
            const saved = await save(
              "schedules",
              {
                id: "extra-" + crypto.randomUUID(),
                classId: c,
                extraDate: d,
                versions: [{ from: d, weekday: weekday(d), start, end }],
              },
              "Extra class added",
            );
            if (saved) {
              setDate(d);
              setModal(null);
            }
          }}
        />
      )}
      {dialogPath.includes("register") && (
        <RegisterModal
          classes={classes}
          existing={student}
          students={students}
          onClose={() => setModal(null)}
          onSave={async (s) => {
            const saved = await save(
              "students",
              s,
              "Student saved. Their QR is ready.",
            );
            if (!saved) return;
            setStudent(s);
            setModal("qr", true);
          }}
        />
      )}
      {dialogPath.includes("qr") && student && (
        <QRModal
          student={student}
          classLabel={classes.find((c) => c.id === student.classId)?.name || ""}
          onClose={() => setModal(null)}
          onScan={() => {
            navigate("Scan");
          }}
        />
      )}
      {dialogPath.includes("profile") && student && (
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
      {dialogPath.includes("payment") &&
        student &&
        !student.removedAt &&
        currentClass && (
          <PaymentModal
            student={student}
            amount={currentClass.fee}
            month={month}
            onClose={() => setModal(null)}
            onSave={async (method) => {
              const saved = await save(
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
              if (saved) setModal(null);
            }}
          />
        )}
      {dialogPath.includes("tutes") && (
        <TuteModal
          classes={classes}
          month={monthOf(today)}
          tutes={allTutes}
          issues={issues}
          students={enrolled}
          role={role}
          onClose={() => setModal(null)}
          onSave={async (value) => {
            await mutate("tutes", value, role);
            setToast(value.deleted ? "Tute deleted" : "Tute saved");
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
      allTutes,
    );
    download(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      "classroom-" + reportClass + "-" + reportMonth + ".csv",
    );
    setToast("Report exported with local and synced records.");
  }
}
