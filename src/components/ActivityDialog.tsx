import { History as HistoryIcon } from "lucide-react";
import React from "react";
import { type Entity } from "../model";
import { type StoreState } from "../store";
import { Modal } from "./Modal";
export function ActivityDialog({
  setModal,
  data,
  recent,
}: {
  setModal: React.Dispatch<React.SetStateAction<string | null>>;
  data: StoreState;
  recent: {
    id: string;
    at: string;
    actor: string;
    description: string;
    key: string;
    entity: Entity;
    pending: boolean;
  }[];
}) {
  return (
    <Modal
      title="Recent activity"
      subtitle="Changes saved locally and on the server"
      onClose={() => setModal(null)}
    >
      <div className="activity-list modal-list">
        {[
          ...data.pending.map((o) => ({
            id: o.id,
            description: o.entity + " updated · pending sync",
            actor: o.actor,
            at: o.at,
          })),
          ...data.history,
        ]
          .sort((a, b) => b.at.localeCompare(a.at))
          .map((h) => (
            <div className="history-row" key={h.id}>
              <span className="activity-icon mint">
                <HistoryIcon size={17} />
              </span>
              <div>
                <strong>{h.description}</strong>
                <p>{h.actor}</p>
                <small>
                  {new Date(h.at).toLocaleString("en-GB", {
                    timeZone: "Asia/Colombo",
                  })}
                </small>
              </div>
            </div>
          ))}
        {!recent.length && (
          <p className="muted padded">
            No new changes yet. Your activity will appear here.
          </p>
        )}
      </div>
    </Modal>
  );
}
