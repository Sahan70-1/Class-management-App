import assert from "node:assert/strict";
import { test } from "node:test";
import { nextDialogPath } from "../src/navigation";
import { nextScheduleSession, type Schedule } from "../src/model";

test("dismissal returns to the opener at every depth", () => {
  const classes = nextDialogPath([], "classes");
  assert.deepEqual(
    nextDialogPath(nextDialogPath(classes, "overview"), null),
    classes,
  );
  const manage = nextDialogPath(classes, "manage");
  for (const child of ["weekly", "extra", "history", "schedule"] as const) {
    assert.deepEqual(
      nextDialogPath(nextDialogPath(manage, child), null),
      manage,
    );
  }
  assert.deepEqual(nextDialogPath(manage, null), classes);
  assert.deepEqual(nextDialogPath(classes, null), []);
});

test("choosing a calendar date reuses the class list and saving an edit replaces the form", () => {
  assert.deepEqual(nextDialogPath(["classes", "calendar"], "classes"), [
    "classes",
  ]);
  assert.deepEqual(nextDialogPath(["profile", "register"], "qr", true), [
    "profile",
    "qr",
  ]);
  assert.deepEqual(nextDialogPath(["register"], "qr", true), ["qr"]);
});

test("opening an editor skips gaps and stops when a timetable has ended", () => {
  const timetable: Schedule = {
    id: "wed",
    classId: "g9",
    versions: [
      {
        from: "2026-01-01",
        until: "2026-01-31",
        weekday: 3,
        start: "10:00",
        end: "12:00",
      },
      {
        from: "2026-08-01",
        until: "2026-08-31",
        weekday: 3,
        start: "12:00",
        end: "14:00",
      },
    ],
  };
  assert.equal(
    nextScheduleSession(timetable, "2026-02-01", [])?.date,
    "2026-08-05",
  );
  assert.equal(nextScheduleSession(timetable, "2026-09-01", []), undefined);
});
