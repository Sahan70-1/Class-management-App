import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Sidebar } from "../src/components/Sidebar";
import { BottomNavigation } from "../src/components/BottomNavigation";
import { TuteModal } from "../src/components/TuteModal";
import { ActivityDialog } from "../src/components/ActivityDialog";
import { seedRecords } from "../src/seed";
import { values } from "../src/model";
import type { StoreState } from "../src/store";

test("primary navigation stays in the bottom bar and teaching tools are in the sidebar", () => {
  const sidebar = renderToStaticMarkup(
    createElement(Sidebar, {
      mobileMenu: true,
      open: () => {},
      goHome: () => {},
    }),
  );
  const tabs = renderToStaticMarkup(
    createElement(BottomNavigation, { tab: "Today", navigate: () => {} }),
  );
  for (const tool of ["Your classes", "Calendar", "Recent activity"])
    assert.ok(sidebar.includes(tool));
  for (const name of ["Today", "Scan", "Students", "Reports"]) {
    assert.ok(tabs.includes('aria-label="' + name + '"'));
    assert.ok(!sidebar.includes(">" + name + "<"));
  }
  assert.ok(!sidebar.includes("Workspace settings"));
});

test("tute manager lists past months and limits editing to admin and staff", () => {
  const classes = values(seedRecords(), "classes");
  const tutes = ["2025-11", "2026-11"].map((month) => ({
    id: classes[0].id + "@" + month,
    classId: classes[0].id,
    month,
    title: "Lesson " + month,
  }));
  for (const role of ["viewer", "staff", "admin"] as const) {
    const html = renderToStaticMarkup(
      createElement(TuteModal, {
        classes,
        month: "2026-11",
        tutes,
        issues: [],
        students: [],
        role,
        onClose: () => {},
        onSave: async () => {},
      }),
    );
    assert.ok(html.includes("November 2025"));
    assert.ok(html.includes("Lesson 2025-11"));
    assert.equal(html.includes("Delete tute"), role !== "viewer");
  }
});

test("recent activity uses the matching member picture and falls back to an initial", () => {
  const actor = "staff@example.com";
  const history = ["first@example.com", actor].map((actor, i) => ({
    id: String(i),
    actor,
    entity: "tutes" as const,
    key: "sample",
    at: "2026-11-21T09:00:00Z",
    description: "Tute deleted",
  }));
  const data: StoreState = {
    accessMessage: null,
    records: [],
    pending: [],
    history,
    lastSync: null,
    role: "staff",
    email: actor,
    syncing: false,
    error: null,
    online: true,
    ready: true,
    conflicts: [],
  };
  const photo = "data:image/jpeg;base64,/9j/2Q==";
  const html = renderToStaticMarkup(
    createElement(ActivityDialog, {
      data,
      setModal: () => {},
      profiles: [{ id: actor, photo }],
    }),
  );
  assert.match(html, />F<\/span>/);
  assert.equal(html.split("<img ").length - 1, 1);
  assert.ok(html.includes(photo));
  assert.ok(html.includes(actor));
});
