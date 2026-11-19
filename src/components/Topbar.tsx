import {
  Bell,
  ChevronRight,
  Check as CloudCheck,
  CloudOff,
  Menu,
  RefreshCw,
} from "lucide-react";
import React from "react";
import { type Tab } from "../navigation";
import { type StoreState } from "../store";
import { Icon } from "./Icon";
export function Topbar({
  setMobileMenu,
  tab,
  data,
  setModal,
}: {
  setMobileMenu: React.Dispatch<React.SetStateAction<boolean>>;
  tab: Tab;
  data: StoreState;
  setModal: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button
          className="icon-button mobile-menu"
          aria-label="Open menu"
          onClick={() => setMobileMenu(true)}
        >
          <Menu />
        </button>
        <strong className="header-wordmark">
          classroom<span className="brand-dot">.</span>
        </strong>
      </div>
      <div className="topbar-right">
        <button
          className={
            "sync-button " +
            (!data.online ? "offline" : data.pending.length ? "waiting" : "")
          }
          onClick={() => setModal("sync")}
        >
          <Icon
            icon={
              !data.online ? CloudOff : data.syncing ? RefreshCw : CloudCheck
            }
            size={18}
            className={data.syncing ? "spinning" : ""}
          />
          <span>
            {!data.online
              ? "Offline"
              : data.syncing
                ? "Syncing"
                : data.pending.length
                  ? "Waiting to sync"
                  : data.lastSync
                    ? "Synced"
                    : "Saved locally"}
          </span>
          <i />
        </button>
        <span className="topbar-divider" />
        <button
          className="icon-button notification"
          aria-label="View recent activity"
          onClick={() => setModal("activity")}
        >
          <Bell size={19} />
          {data.pending.length > 0 && <i />}
        </button>
        <button
          className="account-avatar"
          aria-label="Workspace settings"
          onClick={() => setModal("settings")}
        >
          {data.email?.charAt(0).toUpperCase() || "T"}
        </button>
      </div>
    </header>
  );
}
