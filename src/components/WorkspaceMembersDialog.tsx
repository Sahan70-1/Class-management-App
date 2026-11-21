import { MonitorSmartphone, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import type { Role } from "../model";
import { Badge } from "./Badge";
import { Modal } from "./Modal";

type Member = {
  email: string;
  role: Role;
  devices: { label: string; lastSeen: string }[];
};
type Action = { type: "add" } | { type: "edit" | "remove"; member: Member };

const roleLabels: Record<Role, string> = {
  admin: "Admin",
  staff: "Attendance staff",
  viewer: "Reports viewer",
};
function watchConnection(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}
const lastSeenFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Colombo",
});

export function WorkspaceMemberList({
  members,
  email,
  onAction,
}: {
  members: Member[];
  email: string;
  onAction: (action: Action) => void;
}) {
  const adminCount = members.filter((m) => m.role === "admin").length;
  if (!members.length) return <p>No workspace members yet.</p>;
  return (
    <ul className="workspace-member-list">
      {members.map((member) => {
        const canChange =
          member.email.toLowerCase() !== email.toLowerCase() &&
          (member.role !== "admin" || adminCount > 1);
        return (
          <li key={member.email} className="workspace-member">
            <div className="workspace-member-heading">
              <div>
                <strong>{member.email}</strong>
                <Badge tone={member.role === "admin" ? "mint" : "neutral"}>
                  {roleLabels[member.role]}
                </Badge>
              </div>
              {canChange && (
                <div className="workspace-member-actions">
                  <button
                    className="icon-button"
                    aria-label={"Edit role for " + member.email}
                    onClick={() => onAction({ type: "edit", member })}
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    className="icon-button member-trash"
                    aria-label={"Remove " + member.email}
                    onClick={() => onAction({ type: "remove", member })}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
            {member.devices?.length ? (
              <ul
                className="member-device-list"
                aria-label={"Devices for " + member.email}
              >
                {member.devices.map((device, index) => {
                  const timestamp = Date.parse(device.lastSeen);
                  return (
                    <li key={index}>
                      <MonitorSmartphone size={16} aria-hidden="true" />
                      <div>
                        <strong>
                          {device.label?.trim() || "Unknown device"}
                        </strong>
                        <small>
                          Last seen{" "}
                          {Number.isFinite(timestamp) ? (
                            <time dateTime={device.lastSeen}>
                              {lastSeenFormat.format(timestamp)} (Sri Lanka)
                            </time>
                          ) : (
                            "unknown"
                          )}
                        </small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="member-device-empty">
                <MonitorSmartphone size={16} aria-hidden="true" /> No device
                activity recorded yet.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MemberActionDialog({
  action,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  action: Action;
  pending: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (email: string, role?: Role) => Promise<void>;
}) {
  const [email, setEmail] = useState(
    action.type === "add" ? "" : action.member.email,
  );
  const [role, setRole] = useState<Role>(
    action.type === "add" ? "staff" : action.member.role,
  );
  const removing = action.type === "remove";
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!pending) void onSubmit(email.trim(), removing ? undefined : role);
  }
  return (
    <Modal
      title={
        removing
          ? "Remove workspace member"
          : action.type === "add"
            ? "Add member"
            : "Edit member role"
      }
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        {removing ? (
          <p>
            Remove <strong>{email}</strong> from this workspace? They will lose
            access to its online records.
          </p>
        ) : (
          <>
            <label>
              Member email
              <input
                required
                type="email"
                autoComplete="off"
                value={email}
                disabled={pending || action.type === "edit"}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Permissions
              <select
                value={role}
                disabled={pending}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="staff">Attendance staff</option>
                <option value="viewer">Reports viewer</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            {action.type === "add" && (
              <p className="form-hint">
                Members also need access to this private Site through its
                sharing settings.
              </p>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="callout warning">
            {error}
          </p>
        )}
        <div className="modal-action-row">
          {removing && (
            <button
              type="button"
              className="button white"
              disabled={pending}
              onClick={onClose}
            >
              Keep member
            </button>
          )}
          <button
            type="submit"
            disabled={pending}
            className={
              "button " + (removing ? "member-remove-confirm" : "primary")
            }
          >
            {removing ? <Trash2 size={16} /> : null}
            {pending
              ? "Saving…"
              : removing
                ? "Remove member"
                : "Save member role"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function WorkspaceMembersDialog({
  email,
  onClose,
  notify,
}: {
  email: string;
  onClose: () => void;
  notify: (message: string) => void;
}) {
  const online = useSyncExternalStore(
    watchConnection,
    () => navigator.onLine,
    () => true,
  );
  const [members, setMembers] = useState<Member[] | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setMembers(null);
    setAction(null);
    setLoadError("");
    if (online) {
      (async () => {
        try {
          const res = await fetch("/api/members", {
            cache: "no-store",
            signal: controller.signal,
          });
          if (!res.ok)
            throw Error(
              res.status === 403
                ? "Admin access is required to view workspace members."
                : "Could not load workspace members.",
            );
          const data: Member[] = await res.json();
          if (!controller.signal.aborted) setMembers(data);
        } catch (error) {
          if (!controller.signal.aborted)
            setLoadError(
              error instanceof Error
                ? error.message
                : "Could not load workspace members.",
            );
        }
      })();
    }
    return () => controller.abort();
  }, [online, refresh]);

  function openAction(next: Action) {
    setActionError("");
    setAction(next);
  }
  async function save(target: string, role?: Role) {
    const removing = role === undefined;
    if (target.toLowerCase() === email.toLowerCase()) {
      setActionError("Your own workspace membership cannot be changed here.");
      return;
    }
    setPending(true);
    setActionError("");
    try {
      const res = await fetch("/api/members", {
        method: removing ? "DELETE" : "POST",
        signal: AbortSignal.timeout(18000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target, role }),
      });
      if (!res.ok) {
        const message = (await res.json().catch(() => null))?.error;
        if (res.status === 403 || res.status === 401) {
          if (mounted.current) {
            setMembers(null);
            setAction(null);
            setLoadError(message || "Admin access is required.");
          }
          return;
        }
        throw Error(message || "Could not save the workspace member.");
      }
      if (mounted.current) {
        setAction(null);
        notify(removing ? "Workspace member removed." : "Member role saved.");
        setRefresh((n) => n + 1);
      }
    } catch (error) {
      if (mounted.current)
        setActionError(
          error instanceof Error
            ? error.message
            : "Connect online to manage members.",
        );
    } finally {
      if (mounted.current) setPending(false);
    }
  }
  return (
    <>
      <Modal title="Workspace members" onClose={onClose}>
        {!online ? (
          <p role="status" className="callout">
            Connect online to view and manage workspace members.
          </p>
        ) : loadError ? (
          <div className="form">
            <p role="alert">{loadError}</p>
            <button
              className="button white"
              onClick={() => setRefresh((n) => n + 1)}
            >
              Retry
            </button>
          </div>
        ) : members === null ? (
          <p role="status">Loading members…</p>
        ) : (
          <>
            <button
              className="button primary"
              onClick={() => openAction({ type: "add" })}
            >
              <Plus size={18} />
              Add member
            </button>
            <WorkspaceMemberList
              members={members}
              email={email}
              onAction={openAction}
            />
          </>
        )}
      </Modal>
      {online && action && members && (
        <MemberActionDialog
          action={action}
          pending={pending}
          error={actionError}
          onClose={() => {
            if (!pending) setAction(null);
          }}
          onSubmit={save}
        />
      )}
    </>
  );
}
