import {
  ChevronRight,
  GraduationCap,
  History as HistoryIcon,
  Plus,
} from "lucide-react";
import React from "react";
import {
  addDays,
  sessionsFor,
  shortDate,
  timeText,
  type ClassGroup,
  type Override,
  type Role,
  type Schedule,
  type Session,
} from "../model";
import { Modal } from "./Modal";
export function ManageClassesDialog({
  setModal,
  role,
  setEditing,
  schedules,
  date,
  classes,
  scheduleEditor,
  overrides,
}: {
  setModal: React.Dispatch<React.SetStateAction<string | null>>;
  role: Role;
  setEditing: React.Dispatch<React.SetStateAction<Session | null>>;
  schedules: Schedule[];
  date: string;
  classes: ClassGroup[];
  scheduleEditor: (session: Session) => void;
  overrides: Override[];
}) {
  return (
    <Modal
      title="Manage classes"
      subtitle="Weekly timetables, extra classes and change history"
      onClose={() => setModal(null)}
      wide
    >
      <div className="modal-action-row">
        {role === "admin" && (
          <>
            <button
              className="button primary"
              onClick={() => {
                setEditing(null);
                setModal("weekly");
              }}
            >
              <Plus size={17} />
              Weekly class
            </button>
            <button
              className="button white"
              onClick={() => {
                setEditing(null);
                setModal("extra");
              }}
            >
              <Plus size={17} />
              Extra class
            </button>
          </>
        )}
        <button className="button white" onClick={() => setModal("history")}>
          <HistoryIcon size={17} />
          Change history
        </button>
      </div>
      <div className="manage-list">
        {schedules.map((s) => {
          const v =
            [...s.versions]
              .reverse()
              .find((v) => v.from <= date && (!v.until || date <= v.until)) ||
            s.versions.at(-1)!;
          return (
            <div className="manage-row" key={s.id}>
              <span className="class-icon teal">
                <GraduationCap size={23} />
              </span>
              <div>
                <h3>{classes.find((c) => c.id === s.classId)?.name}</h3>
                <p>
                  {s.extraDate
                    ? shortDate(s.extraDate)
                    : "Every " +
                      [
                        "Sunday",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                      ][v.weekday]}{" "}
                  · {timeText(v.start)} – {timeText(v.end)}
                </p>
                <small>
                  {v.cancelled
                    ? "Cancelled from " + v.from
                    : s.extraDate
                      ? "Extra class"
                      : "Weekly timetable"}
                </small>
              </div>
              {role === "admin" && (
                <button
                  className="button white"
                  onClick={() => {
                    let d = s.extraDate || date;
                    while (!sessionsFor(d, [s], []).length) d = addDays(d, 1);
                    scheduleEditor(sessionsFor(d, [s], overrides)[0]);
                  }}
                >
                  Edit
                  <ChevronRight size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
