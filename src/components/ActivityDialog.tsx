import { MemberAvatar } from "./MemberAvatar";
import React from "react";
import { type MemberProfile } from "../model";
import { type StoreState } from "../store";
import { Modal } from "./Modal";
export function ActivityDialog({
  setModal,
  data,
  profiles,
}: {
  setModal: React.Dispatch<React.SetStateAction<string | null>>;
  data: StoreState;
  profiles: MemberProfile[];
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
              <MemberAvatar
                email={h.actor}
                photo={profiles.find((p) => p.id === h.actor)?.photo}
              />
              <div>
                <strong>
                  {h.description
                    .replace("Attendance marked", "Marked present")
                    .replace("Monthly fee recorded", "Fee paid")
                    .replace("Tute issued", "Tute given")}
                </strong>
                <p>{h.actor}</p>
                <small>
                  {new Date(h.at).toLocaleString("en-GB", {
                    timeZone: "Asia/Colombo",
                  })}
                </small>
              </div>
            </div>
          ))}
        {!data.history.length && !data.pending.length && (
          <p className="muted padded">
            No new changes yet. Your activity will appear here.
          </p>
        )}
      </div>
    </Modal>
  );
}
