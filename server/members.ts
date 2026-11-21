import type { Role } from "../src/model";

function respond(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

interface MemberDevice {
  label: string;
  lastSeen: string;
}

async function listMembers(db: D1Database) {
  const { results } = await db
    .prepare(
      `
    SELECT m.email, m.role, d.label, d.last_seen AS lastSeen
    FROM members m LEFT JOIN member_devices d ON d.email = m.email
    ORDER BY m.email, d.last_seen DESC, d.device_id
  `,
    )
    .all<{
      email: string;
      role: Role;
      label: string | null;
      lastSeen: string | null;
    }>();
  const members = new Map<
    string,
    { email: string; role: Role; devices: MemberDevice[] }
  >();
  for (const { email, role, label, lastSeen } of results) {
    const member = members.get(email) ?? { email, role, devices: [] };
    if (label && lastSeen) member.devices.push({ label, lastSeen });
    members.set(email, member);
  }
  return Array.from(members.values());
}

// Repeat the actor check in the mutation so that concurrent changes by two
// administrators cannot revoke or demote the last active administrator.
const adminCanAct =
  "EXISTS (SELECT 1 FROM members WHERE email = ? AND role = 'admin')";

export async function manageMembers(
  request: Request,
  db: D1Database,
  actor: string,
  role: Role,
) {
  if (role !== "admin")
    return respond({ error: "Admin access required." }, 403);
  if (request.method === "GET") return respond(await listMembers(db));
  if (request.method !== "POST" && request.method !== "DELETE") {
    return respond({ error: "Method not allowed." }, 405);
  }
  const body = await request
    .json<{ email?: unknown; role?: unknown }>()
    .catch(() => null);
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^\S+@\S+\.\S+$/.test(email))
    return respond({ error: "Provide a valid email." }, 400);
  if (email === actor) {
    return respond(
      {
        error:
          request.method === "DELETE"
            ? "You cannot remove yourself from the workspace."
            : "You cannot change your own role.",
      },
      400,
    );
  }

  if (request.method === "DELETE") {
    // A distinct, current administrator must exist. The foreign key deletes
    // only this member's device observations; historical records use the email.
    const result = await db
      .prepare(`DELETE FROM members WHERE email = ? AND ${adminCanAct}`)
      .bind(email, actor)
      .run();
    if (result.meta.changes) return respond({ ok: true });
    if (
      !(await db
        .prepare("SELECT 1 FROM members WHERE email = ? AND role = 'admin'")
        .bind(actor)
        .first())
    ) {
      return respond({ error: "Admin access required." }, 403);
    }
    return respond(
      { error: "This person is no longer a workspace member." },
      404,
    );
  }

  const newRole = body?.role;
  if (newRole !== "admin" && newRole !== "staff" && newRole !== "viewer") {
    return respond({ error: "Provide a valid member role." }, 400);
  }
  const result = await db
    .prepare(
      `
    INSERT INTO members(email, role, created_at)
    SELECT ?, ?, ? WHERE ${adminCanAct}
    ON CONFLICT(email) DO UPDATE SET role=excluded.role
  `,
    )
    .bind(email, newRole, new Date().toISOString(), actor)
    .run();
  if (!result.meta.changes)
    return respond({ error: "Admin access required." }, 403);
  return respond({ ok: true });
}

function deviceLabel(agent: string) {
  const system = /iPad|iPhone|iPod/i.test(agent)
    ? "iOS"
    : /Android/i.test(agent)
      ? "Android"
      : /Windows/i.test(agent)
        ? "Windows"
        : /CrOS/i.test(agent)
          ? "ChromeOS"
          : /Macintosh|Mac OS X/i.test(agent)
            ? "macOS"
            : /Linux/i.test(agent)
              ? "Linux"
              : "";
  const browser = /Edg(?:e|A|iOS)?\//i.test(agent)
    ? "Edge"
    : /OPR\/|OPiOS\//i.test(agent)
      ? "Opera"
      : /SamsungBrowser\//i.test(agent)
        ? "Samsung Internet"
        : /Firefox\/|FxiOS\//i.test(agent)
          ? "Firefox"
          : /Chrome\/|CriOS\//i.test(agent)
            ? "Chrome"
            : /Safari\//i.test(agent)
              ? "Safari"
              : "";
  return [browser, system].filter(Boolean).join(" · ") || "Unknown browser";
}

// Executed in the successful sync snapshot batch. Clients without a device ID
// keep syncing as usual. The ID distinguishes multiple installations with the same label.
export function deviceObservation(
  request: Request,
  db: D1Database,
  email: string,
) {
  const id = request.headers.get("X-Classroom-Device");
  if (
    !id ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    return null;
  const now = Date.now();
  const refreshBefore = new Date(now - 5 * 60_000).toISOString();
  return db
    .prepare(
      `
    INSERT INTO member_devices(email, device_id, label, last_seen)
    SELECT email, ?, ?, ? FROM members WHERE email = ?
    ON CONFLICT(email, device_id) DO UPDATE SET label = excluded.label, last_seen = excluded.last_seen
      WHERE member_devices.last_seen < ? OR member_devices.label <> excluded.label
  `,
    )
    .bind(
      id.toLowerCase(),
      deviceLabel(request.headers.get("User-Agent") || ""),
      new Date(now).toISOString(),
      email,
      refreshBefore,
    );
}
