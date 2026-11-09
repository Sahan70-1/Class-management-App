import { Download, LogOut, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { type Role } from "../model";
import { Badge } from "./Badge";
import { Modal } from "./Modal";
export function SettingsModal({
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
