import {
  CalendarDays,
  GraduationCap,
  History,
  Cloud as CloudCheck,
} from "lucide-react";
export function Sidebar({
  mobileMenu,
  open,
  goHome,
}: {
  mobileMenu: boolean;
  open: (section: "classes" | "activity" | "calendar") => void;
  goHome: () => void;
}) {
  return (
    <aside className={"sidebar " + (mobileMenu ? "mobile-open" : "")}>
      <a
        href="#"
        className="brand"
        onClick={(e) => {
          e.preventDefault();
          goHome();
        }}
      >
        <span className="brand-mark">
          <GraduationCap size={26} />
        </span>
        <span>
          classroom<span className="brand-dot">.</span>
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
      </div>
      <nav className="main-nav" aria-label="Teaching tools">
        <button onClick={() => open("classes")}>
          <GraduationCap size={20} /> Your classes
        </button>
        <button onClick={() => open("activity")}>
          <History size={20} /> Recent activity
        </button>
        <button onClick={() => open("calendar")}>
          <CalendarDays size={20} /> Calendar
        </button>
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
      </div>
    </aside>
  );
}
