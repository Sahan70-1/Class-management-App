import { WorkspaceMembersDialog } from "./WorkspaceMembersDialog";
import { ProfilePhotoField } from "./ProfilePhotoField";
import { Download, LogOut, Users, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { type Role } from "../model";
import { Modal } from "./Modal";
export function SettingsModal({
  photo,
  savePhoto,
  actualRole,
  role,
  email,
  onRole,
  onClose,
  notify,
}: {
  photo?: string;
  savePhoto: (photo: string) => Promise<void>;
  actualRole: Role;
  role: Role;
  email: string;
  onRole: (role: Role) => void;
  onClose: () => void;
  notify: (message: string) => void;
}) {
  const [showMembers, setShowMembers] = useState(false);
  const canManageMembers = actualRole === "admin" && role === "admin";
  useEffect(() => {
    if (!canManageMembers) setShowMembers(false);
  }, [canManageMembers]);
  return (
    <>
      <Modal
        title="Your teaching space"
        subtitle="Account, permissions and installation"
        onClose={onClose}
      >
        <div className="settings-account">
          <ProfilePhotoField
            email={email}
            photo={photo}
            enabled={email.includes("@")}
            save={savePhoto}
          />
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
              {canManageMembers && (
                <button
                  className="button white"
                  onClick={() => setShowMembers(true)}
                >
                  <Users size={18} />
                  Workspace members
                </button>
              )}
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
      {showMembers && canManageMembers && (
        <WorkspaceMembersDialog
          key={email}
          email={email}
          onClose={() => setShowMembers(false)}
          notify={notify}
        />
      )}
    </>
  );
}
