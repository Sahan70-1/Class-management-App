import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  canWrite,
  sessionRoster,
  todayISO,
  monthOf,
  type Student,
} from "../src/model";
import { seedRecords } from "../src/seed";
import { reportCsv, reportRoster } from "../src/reports";
import { ReportsTab } from "../src/components/ReportsTab";

test("removal and restoration enforce roles, retain history, sync as deltas, and preserve conflicting edits", async () => {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      scriptPath: "dist/server/index.js",
      compatibilityDate: "2026-10-01",
      d1Databases: ["DB"],
      bindings: { LOCAL_DEMO: "true" },
    }),
  );
  try {
    const db = await mf.getD1Database("DB");
    const journal = JSON.parse(
      await readFile("drizzle/meta/_journal.json", "utf8"),
    );
    for (const entry of journal.entries) {
      const sql = await readFile("drizzle/" + entry.tag + ".sql", "utf8");
      await db.batch(
        sql
          .split("--> statement-breakpoint")
          .map((s: string) => db.prepare(s.trim())),
      );
    }
    const request = async (
      path: string,
      body: any,
      email = "tutor@local.demo",
    ) => {
      const response = await mf.dispatchFetch("http://localhost" + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "oai-authenticated-user-email": email,
        },
        body: JSON.stringify(body),
      });
      assert.equal(response.status, 200);
      return (await response.json()) as any;
    };
    const sync = (operations: any[] = [], lastSeq = 0, email?: string) =>
      request("/api/sync", { operations, lastSeq }, email);
    const initial = await sync();
    await request("/api/members", {
      email: "staff@example.com",
      role: "staff",
    });
    await request("/api/members", {
      email: "viewer@example.com",
      role: "viewer",
    });
    const pupil = initial.records.find(
      (r: any) => r.entity === "students" && r.key === "S-00002",
    );
    const op = (value: any, revision: number, entity = "students") => ({
      id: crypto.randomUUID(),
      key: value.id,
      entity,
      value,
      baseRevision: revision,
      revision: revision + 1,
      at: new Date().toISOString(),
      actor: "spoofed",
    });
    // Establish a nonzero cursor for the second device before removal.
    const baseline = await sync([
      op({ ...pupil.value, name: "Retained pupil" }, 1),
    ]);
    const cursor = baseline.lastSeq;
    const removed = {
      ...pupil.value,
      name: "Retained pupil",
      removedAt: new Date().toISOString(),
      removedBy: "tutor@local.demo",
    };
    for (const email of ["staff@example.com", "viewer@example.com"]) {
      const result = await sync([op(removed, 2)], cursor, email);
      assert.equal(result.accepted.length, 0);
      assert.match(result.conflicts[0].message, /role|admin/i);
    }
    // Staff cannot disguise a removal as a new registration.
    const forged = await sync(
      [op({ ...removed, id: "S-FORGED" }, 0)],
      cursor,
      "staff@example.com",
    );
    assert.equal(forged.accepted.length, 0);
    const malformed = await sync(
      [op({ ...removed, removedAt: "yesterday" }, 2)],
      cursor,
    );
    assert.equal(malformed.accepted.length, 0);
    const impersonated = await sync(
      [op({ ...removed, removedBy: "other-admin@example.com" }, 2)],
      cursor,
    );
    assert.equal(impersonated.accepted.length, 0);
    assert.match(impersonated.conflicts[0].message, /signed-in admin/);
    const removeOp = op(removed, 2);
    const result = await sync([removeOp], cursor);
    assert.deepEqual(result.accepted, [removeOp.id]);
    assert.equal(result.full, false);
    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].value.removedBy, "tutor@local.demo");
    const deviceB = await sync([], cursor);
    assert.equal(deviceB.full, false);
    assert.deepEqual(deviceB.records, result.records);
    const historyBefore = initial.records.filter(
      (r: any) =>
        ["attendance", "fees", "issues"].includes(r.entity) &&
        r.value.studentId === pupil.key,
    );
    assert.equal(historyBefore.length, 3);
    const retained = await sync();
    for (const r of historyBefore)
      assert.deepEqual(
        retained.records.find(
          (x: any) => x.entity === r.entity && x.key === r.key,
        ),
        r,
      );
    const day = todayISO(),
      month = monthOf(day);
    // Valid-looking new actions on a new session/month must be rejected for the removed pupil.
    const futureMonth = month === "2099-12" ? "2099-11" : "2099-12";
    const lesson = {
      id: "grade-9@" + futureMonth,
      classId: "grade-9",
      month: futureMonth,
      title: "Future lesson",
    };
    await sync([op(lesson, 0, "tutes")]);
    const actions = [
      op(
        {
          id: pupil.key + "@weekly-9@" + day,
          studentId: pupil.key,
          sessionId: "weekly-9@" + day,
          date: day,
          classId: "grade-9",
          at: new Date().toISOString(),
        },
        0,
        "attendance",
      ),
      op(
        {
          id: pupil.key + "@grade-9@" + futureMonth,
          studentId: pupil.key,
          classId: "grade-9",
          month: futureMonth,
          amount: 2000,
          method: "Cash",
          at: new Date().toISOString(),
        },
        0,
        "fees",
      ),
      op(
        {
          id: pupil.key + "@" + lesson.id,
          studentId: pupil.key,
          tuteId: lesson.id,
          at: new Date().toISOString(),
        },
        0,
        "issues",
      ),
    ];
    // Give attendance a distinct key/session so it is a genuinely new record.
    const schedule = {
      id: "removal-extra",
      classId: "grade-9",
      extraDate: day,
      versions: [{ from: day, weekday: 0, start: "08:00", end: "09:00" }],
    };
    await sync([op(schedule, 0, "schedules")]);
    actions[0].value.sessionId = schedule.id + "@" + day;
    actions[0].value.id = pupil.key + "@" + actions[0].value.sessionId;
    actions[0].key = actions[0].value.id;
    for (const action of actions) {
      const rejected = await sync([action], result.lastSeq);
      assert.equal(rejected.accepted.length, 0);
      assert.match(rejected.conflicts[0].message, /student has been removed/i);
    }
    // Existing logical records remain retryable; no history is replaced.
    for (const r of historyBefore) {
      const replay = await sync([op(r.value, 0, r.entity)], result.lastSeq);
      assert.equal(replay.conflicts.length, 0);
    }
    const retry = await sync([removeOp], result.lastSeq);
    assert.deepEqual(retry.accepted, [removeOp.id]);
    assert.equal(
      (
        (await db
          .prepare("SELECT COUNT(*) AS n FROM events WHERE operation_id=?")
          .bind(removeOp.id)
          .first()) as any
      ).n,
      1,
    );
    const restored = { ...removed };
    delete restored.removedAt;
    delete restored.removedBy;
    for (const email of ["staff@example.com", "viewer@example.com"])
      assert.equal(
        (await sync([op(restored, 3)], result.lastSeq, email)).accepted.length,
        0,
      );
    const restoration = await sync([op(restored, 3)], result.lastSeq);
    assert.equal(restoration.conflicts.length, 0);
    const concurrent = await Promise.all([
      sync([op({ ...restored, name: "Device A" }, 4)]),
      sync([op({ ...restored, name: "Device B" }, 4)]),
    ]);
    assert.equal(
      concurrent.reduce((n, r) => n + r.accepted.length, 0),
      1,
    );
    assert.equal(
      concurrent.reduce((n, r) => n + r.conflicts.length, 0),
      1,
    );
    const final = await sync();
    const winner = final.records.find(
      (r: any) => r.entity === "students" && r.key === pupil.key,
    );
    assert.equal(winner.revision, 5);
    assert.ok(["Device A", "Device B"].includes(winner.value.name));
    const stale = await sync([op(removed, 4)], final.lastSeq);
    assert.equal(stale.accepted.length, 0);
    assert.match(stale.conflicts[0].message, /newer|changed/i);
    const unchanged = await sync();
    assert.deepEqual(
      unchanged.records.find((r: any) => r.key === pupil.key),
      winner,
    );
  } finally {
    await mf.dispose();
  }
});

test("active rosters hide removed pupils while reports and formula-safe CSV retain history", () => {
  const records = seedRecords(),
    students = records
      .filter((r) => r.entity === "students")
      .map((r) => r.value) as Student[];
  const student = students[1];
  student.name = "=SUM(A1)";
  student.removedAt = new Date().toISOString();
  student.removedBy = "admin@example.com";
  const attendance = records
      .filter((r) => r.entity === "attendance")
      .map((r) => r.value) as any[],
    fees = records
      .filter((r) => r.entity === "fees")
      .map((r) => r.value) as any[],
    issues = records
      .filter((r) => r.entity === "issues")
      .map((r) => r.value) as any[],
    tutes = records
      .filter((r) => r.entity === "tutes")
      .map((r) => r.value) as any[],
    classes = records
      .filter((r) => r.entity === "classes")
      .map((r) => r.value) as any[];
  const month = monthOf(todayISO());
  assert.equal(canWrite("staff", "students", false, student), false);
  assert.equal(canWrite("admin", "students", true, student), true);
  assert.equal(canWrite("viewer", "students", true, student), false);
  assert.equal(
    reportRoster(
      students,
      "grade-9",
      month,
      attendance,
      fees,
      issues,
      tutes,
    ).some((s) => s.id === student.id),
    false,
  );
  assert.equal(
    reportRoster(
      students,
      "grade-9",
      "2025-01",
      attendance,
      fees,
      issues,
      tutes,
    ).some((s) => s.id === student.id),
    true,
  );
  const csv = reportCsv(
    students,
    classes,
    "grade-9",
    month,
    attendance,
    fees,
    issues,
    tutes,
  );
  assert.match(csv, /"'=SUM\(A1\)"/);
  assert.match(csv, /"Removed"/);
  assert.match(csv, /"2000"/);
  const markup = renderToStaticMarkup(
    createElement(ReportsTab, {
      reportClass: "grade-9",
      setReportClass: () => {},
      classes,
      reportMonth: month,
      setReportMonth: () => {},
      students,
      attendance,
      fees,
      issues,
      tutes,
      reportType: "fees",
      setReportType: () => {},
      data: { lastSync: null, pending: [] } as any,
    }),
  );
  assert.match(markup, /12,000/);
  assert.doesNotMatch(markup, /SUM\(A1\)/);
  const summary = sessionRoster(
    { id: "weekly-9@" + todayISO(), classId: "grade-9" } as any,
    students,
    attendance,
  );
  assert.equal(
    summary.rows.some((r) => r.student.id === student.id),
    false,
  );
});

test("removal and removed-directory controls are admin-only", async () => {
  await import("fake-indexeddb/auto");
  Object.defineProperty(globalThis, "window", {
    value: new EventTarget(),
    configurable: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: false },
    configurable: true,
  });
  const interval = globalThis.setInterval;
  globalThis.setInterval = ((...args: any[]) => {
    const timer = (interval as any)(...args);
    timer.unref();
    return timer;
  }) as typeof setInterval;
  const { StudentProfileDialog } =
    await import("../src/components/StudentProfileDialog");
  const { StudentsTab } = await import("../src/components/StudentsTab");
  globalThis.setInterval = interval;
  const student = seedRecords().find((r) => r.entity === "students")!
    .value as Student;
  for (const role of ["admin", "staff", "viewer"] as const) {
    const profile = renderToStaticMarkup(
      createElement(StudentProfileDialog, {
        setModal: () => {},
        student,
        classes: [],
        attendance: [],
        fees: [],
        issues: [],
        role,
      }),
    );
    assert.equal(profile.includes("Remove student"), role === "admin");
    const directory = renderToStaticMarkup(
      createElement(StudentsTab, {
        role,
        query: "",
        setQuery: () => {},
        filter: "all",
        setFilter: () => {},
        classes: [],
        setModal: () => {},
        students: [
          {
            ...student,
            removedAt: new Date().toISOString(),
            removedBy: "admin@example.com",
          },
        ],
        tutes: [],
        today: todayISO(),
        setStudent: () => {},
        fees: [],
        issues: [],
      }),
    );
    assert.equal(directory.includes("Show removed students"), role === "admin");
    assert.equal(directory.includes(student.name), false);
  }
});
