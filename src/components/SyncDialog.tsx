import {
  ArrowRight,
  Cloud as CloudCheck,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import React from "react";
import { discardConflict, sync, type StoreState } from "../store";
import { Modal } from "./Modal";
export function SyncDialog({
  setModal,
  data,
}: {
  setModal: React.Dispatch<React.SetStateAction<string | null>>;
  data: StoreState;
}) {
  return (
    <Modal
      title="Your work, safely saved"
      subtitle="Device storage & synchronization"
      onClose={() => setModal(null)}
    >
      <div className="sync-detail">
        <span className="large-status mint">
          <CloudCheck size={30} />
        </span>
        <h3>
          {!data.online
            ? "Working offline"
            : data.pending.length
              ? `${data.pending.length} updates waiting to sync`
              : "Everything is saved on this device"}
        </h3>
        <p>
          Last successful sync:{" "}
          {data.lastSync
            ? new Date(data.lastSync).toLocaleString("en-GB", {
                timeZone: "Asia/Colombo",
              })
            : "Not yet synced"}
        </p>
        {data.error && (
          <div className="callout warning">
            <TriangleAlert size={18} />
            {data.error}
          </div>
        )}
        <p>
          Keep this browser’s storage until all pending changes are synced.
          Other devices receive updates after a successful sync.
        </p>
        {data.conflicts.map((c) => {
          const id = c.split(": ")[0];
          return (
            <div className="conflict-item" key={id}>
              <p>{c.slice(id.length + 2)}</p>
              <button
                className="button white"
                onClick={() => void discardConflict(id)}
              >
                Use server version & discard local change
              </button>
            </div>
          );
        })}
        <button
          className="button primary full"
          onClick={() => void sync()}
          disabled={!data.online || data.syncing}
        >
          <RefreshCw size={17} className={data.syncing ? "spinning" : ""} />
          {data.syncing ? "Syncing…" : "Sync now"}
        </button>
        {data.error?.includes("Sign in") && (
          <a
            className="button white full"
            href={"/signin-with-chatgpt?return_to=" + encodeURIComponent("/")}
            target="_top"
          >
            Sign in to sync
            <ArrowRight size={16} />
          </a>
        )}
      </div>
    </Modal>
  );
}
