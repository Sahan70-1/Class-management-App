import { nav, type Tab } from "../navigation";
import { Icon } from "./Icon";
export function BottomNavigation({
  tab,
  navigate,
}: {
  tab: Tab;
  navigate: (t: Tab) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {nav.map(({ name, icon }) => (
        <button
          className={tab === name ? "active" : ""}
          aria-label={name}
          aria-current={tab === name ? "page" : undefined}
          key={name}
          onClick={() => navigate(name)}
        >
          <Icon icon={icon} size={21} />
          <span>{name}</span>
        </button>
      ))}
    </nav>
  );
}
