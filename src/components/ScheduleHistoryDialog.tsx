import { CalendarClock, History as HistoryIcon } from "lucide-react";
import React from "react";
import { type Entity } from "../model";
import { Modal } from "./Modal";
export function ScheduleHistoryDialog({
  setModal,
  changeHistory,
}: {
  setModal: React.Dispatch<React.SetStateAction<string | null>>;
  changeHistory: {
    id: string;
    at: string;
    actor: string;
    description: string;
    key: string;
    entity: Entity;
  }[];
}) {
  return (
    <Modal
      title="Schedule change history"
      subtitle="Who changed what, and when"
      onClose={() => setModal(null)}
    >
      {changeHistory.length ? (
        changeHistory.map((h) => (
          <div className="history-row" key={h.id}>
            <span className="activity-icon lilac">
              <CalendarClock size={18} />
            </span>
            <div>
              <strong>{h.description}</strong>
              <p>{h.key}</p>
              <small>
                {h.actor} ·{" "}
                {new Date(h.at).toLocaleString("en-GB", {
                  timeZone: "Asia/Colombo",
                })}
              </small>
            </div>
          </div>
        ))
      ) : (
        <div className="empty-state">
          <HistoryIcon size={30} />
          <h3>No schedule changes yet</h3>
          <p>
            Session edits, cancellations and timetable changes will appear here.
          </p>
        </div>
      )}
    </Modal>
  );
}
