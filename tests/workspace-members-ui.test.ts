import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsModal } from "../src/components/SettingsModal";
import { WorkspaceMemberList } from "../src/components/WorkspaceMembersDialog";
import type { Role } from "../src/model";
const noop = () => {};

test("teaching space shows the account identity and reserves membership for admins", () => {
  const labels = { admin: "Tutor · Administrator", staff: "Attendance staff", viewer: "Reports viewer" };
  for (const role of Object.keys(labels) as Role[]) {
    const email = role + "@example.com";
    const html = renderToStaticMarkup(createElement(SettingsModal, {
      role, email, onClose: noop, notify: noop, savePhoto: async () => {},
    }));
    assert.ok(html.includes(email));
    assert.ok(html.includes(labels[role]));
    assert.equal(html.includes("Workspace members"), role === "admin");
    assert.doesNotMatch(html, /Preview a role|<select/);
  }
});

test("member rows show device observations and offer removal only for another removable member", () => {
  const admin = {
    email: "tutor@example.com",
    role: "admin" as const,
    devices: [],
  };
  const staff = {
    email: "staff@example.com",
    role: "staff" as const,
    devices: [
      { label: "Safari · iOS", lastSeen: "2026-11-01T00:00:00.000Z" },
      { label: "", lastSeen: "" },
    ],
  };
  function render(email: string) {
    return renderToStaticMarkup(
      createElement(WorkspaceMemberList, {
        email,
        members: [admin, staff],
        onAction: noop,
      }),
    );
  }
  const html = render(admin.email.toUpperCase());
  assert.ok(!html.includes('aria-label="Remove ' + admin.email + '"'));
  assert.ok(html.includes('aria-label="Remove ' + staff.email + '"'));
  assert.ok(html.includes('aria-label="Edit role for ' + staff.email + '"'));
  assert.ok(html.includes("Safari · iOS"));
  assert.ok(html.includes("Last seen"));
  assert.ok(html.includes('dateTime="2026-11-01T00:00:00.000Z"'));
  assert.ok(html.includes("Unknown device"));
  assert.ok(html.includes("No device activity recorded yet"));
  assert.ok(
    !render("another@example.com").includes(
      'aria-label="Remove ' + admin.email + '"',
    ),
  );
  const empty = renderToStaticMarkup(
    createElement(WorkspaceMemberList, {
      email: admin.email,
      members: [],
      onAction: noop,
    }),
  );
  assert.ok(empty.includes("No workspace members yet"));
});
