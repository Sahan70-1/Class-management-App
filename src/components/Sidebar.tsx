import {
  CalendarDays,
  GraduationCap,
  History,
  Sun,
  Moon,
  Cloud as CloudCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, readTheme, saveTheme, THEME_STORAGE_KEY } from "../theme";

export function Sidebar({
  mobileMenu,
  open,
  goHome,
}: {
  mobileMenu: boolean;
  open: (section: "classes" | "activity" | "calendar") => void;
  goHome: () => void;
}) {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    function syncAppearance(event?: StorageEvent) {
      if (event && event.key !== null && event.key !== THEME_STORAGE_KEY) return;
      const saved = readTheme();
      applyTheme(saved);
      setTheme(saved);
    }
    syncAppearance();
    window.addEventListener("storage", syncAppearance);
    return () => window.removeEventListener("storage", syncAppearance);
  }, []);
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
        <fieldset className="theme-switch">
          <legend>Appearance</legend>
          <div className="theme-options">
            {(["light", "dark"] as const).map((choice) => {
              const Icon = choice === "light" ? Sun : Moon;
              return (
                <label key={choice}>
                  <input
                    type="radio"
                    name="appearance"
                    value={choice}
                    checked={theme === choice}
                    onChange={() => {
                      saveTheme(choice);
                      setTheme(choice);
                    }}
                  />
                  <span>
                    <Icon aria-hidden="true" size={16} />
                    {choice === "light" ? "Light" : "Dark"}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>
    </aside>
  );
}
