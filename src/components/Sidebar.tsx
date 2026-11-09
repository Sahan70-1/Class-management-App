import {
  Cloud as CloudCheck,
  Ellipsis,
  GraduationCap,
  Settings,
} from "lucide-react";
import React from "react";
import { type Role, type Student } from "../model";
import { nav, type Tab } from "../navigation";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
export function Sidebar({
  mobileMenu,
  navigate,
  tab,
  students,
  setModal,
  role,
}: {
  mobileMenu: boolean;
  navigate: (t: Tab) => void;
  tab: Tab;
  students: Student[];
  setModal: React.Dispatch<React.SetStateAction<string | null>>;
  role: Role;
}) {
  return (
    <aside className={"sidebar " + (mobileMenu ? "mobile-open" : "")}>
      <a
        href="#"
        className="brand"
        onClick={(e) => {
          e.preventDefault();
          navigate("Today");
        }}
      >
        <span className="brand-mark">
          <GraduationCap size={26} />
        </span>
        <span>
          classroom<span className="brand-dot">.</span>
          <small>LESS ADMIN. MORE TEACHING.</small>
        </span>
      </a>
      <div className="workspace">
        <div className="workspace-avatar">
          <GraduationCap size={19} />
        </div>
        <div>
          <strong>My tuition space</strong>
          <span>Mathematics academy</span>
        </div>
        <Badge tone="mint">PRO</Badge>
      </div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="main-nav">
        {nav.map(({ name, icon }) => (
          <button
            key={name}
            className={tab === name ? "active" : ""}
            onClick={() => navigate(name)}
          >
            <Icon icon={icon} />
            <span>{name}</span>
            {tab === name && <span className="active-dot" />}
            {name === "Students" && <small>{students.length}</small>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="offline-note">
          <span className="offline-icon">
            <CloudCheck size={22} />
          </span>
          <strong>Ready, even offline.</strong>
          <p>
            Your work stays with you.
            <br />
            We’ll sync when you’re back.
          </p>
          <span>
            <i /> Saved on this device
          </span>
        </div>
        <button
          className="sidebar-settings"
          onClick={() => setModal("settings")}
        >
          <Settings size={18} /> Workspace settings
        </button>
        <div className="tutor">
          <span className="tutor-avatar">T</span>
          <div>
            <strong>My workspace</strong>
            <span>
              {role === "admin"
                ? "Tutor · Admin"
                : role === "staff"
                  ? "Attendance staff"
                  : "Reports · Read only"}
            </span>
          </div>
          <button
            aria-label="Account and roles"
            className="icon-button"
            onClick={() => setModal("settings")}
          >
            <Ellipsis size={20} />
          </button>
        </div>
      </div>
    </aside>
  );
}
