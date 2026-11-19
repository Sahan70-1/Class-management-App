import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ScanTab } from "../src/components/ScanTab";
import { sessionsFor } from "../src/model";

test("staff can find an available session from an empty date, skipping cancellations", () => {
  const noop = () => {};
  const props: ComponentProps<typeof ScanTab> = {
    activeSession: null,
    sessions: [],
    date: "2026-11-19",
    role: "staff",
    classes: [
      {
        id: "g10",
        name: "Grade 10",
        fee: 1,
        room: "",
        subject: "",
        color: "mint",
      },
    ],
    schedules: [
      {
        id: "sat",
        classId: "g10",
        versions: [
          { from: "2026-01-01", weekday: 6, start: "09:00", end: "11:00" },
        ],
      },
    ],
    overrides: [],
    student: null,
    currentClass: undefined,
    currentTute: undefined,
    students: [],
    activeStudents: [],
    attendance: [],
    query: "",
    setDate: noop,
    setSelected: noop,
    setStudent: noop,
    setModal: noop,
    setToast: noop,
    setQuery: noop,
    studentStatus: () => ({ present: false, paid: false, issued: false }),
    issueTute: async () => {},
    markAttendance: async () => {},
    scanResult: noop,
  };
  const render = (patch: Partial<typeof props> = {}) =>
    renderToStaticMarkup(createElement(ScanTab, { ...props, ...patch }));
  const suggestion = /Select Grade 10 · 21 Nov/;
  assert.match(render(), suggestion);
  assert.doesNotMatch(render({ role: "viewer" }), suggestion);
  const date = "2026-11-21";
  const sessions = sessionsFor(date, props.schedules, []);
  const available = render({ date, sessions, activeSession: sessions[0] });
  assert.doesNotMatch(available, /disabled=""/);
  assert.doesNotMatch(available, /No class is scheduled/);
  const overrides = [
    {
      id: "sat@" + date,
      scheduleId: "sat",
      date,
      start: "09:00",
      end: "11:00",
      cancelled: true,
    },
  ];
  assert.doesNotMatch(render({ overrides }), suggestion);
  const cancelled = sessionsFor(date, props.schedules, overrides);
  assert.match(
    render({
      date,
      sessions: cancelled,
      activeSession: cancelled[0],
      overrides,
    }),
    /This session was cancelled/,
  );
});
