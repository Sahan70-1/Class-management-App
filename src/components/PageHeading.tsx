import type { SetDialog } from "../navigation";
import { Download, Plus, ShieldCheck } from "lucide-react";
import React from "react";
import { dateObject, type Role, type Student } from "../model";
import { type Tab } from "../navigation";
import { Badge } from "./Badge";
export function PageHeading({
  tab,
  student,
  role,
  date,
  setStudent,
  setModal,
  exportReport,
}: {
  tab: Tab;
  student: Student | null;
  role: Role;
  date: string;
  setStudent: React.Dispatch<React.SetStateAction<Student | null>>;
  setModal: SetDialog;
  exportReport: () => void;
}) {
  return (
    <div className="page-heading">
      <div>
        {tab === "Today" && (
          <div className="eyebrow">
            {dateObject(date).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "short",
              timeZone: "Asia/Colombo",
            })}
          </div>
        )}
        <h1>
          {tab === "Today"
            ? "Today"
            : tab === "Scan"
              ? student
                ? "Student check-in"
                : "Scan a student"
              : tab === "Students"
                ? "Students"
                : "Reports"}
          <span className="heading-dot">.</span>
        </h1>
      </div>
      <div className="page-heading-actions">
        {role === "viewer" && (
          <Badge tone="violet">
            <ShieldCheck size={13} /> Read only
          </Badge>
        )}
        {tab === "Students" && role !== "viewer" ? (
          <button
            className="button primary"
            onClick={() => {
              setStudent(null);
              setModal("register");
            }}
          >
            <Plus size={18} /> New student
          </button>
        ) : tab === "Reports" ? (
          <button
            className="button white"
            aria-label="Export report"
            onClick={() => exportReport()}
          >
            <Download size={17} />
            Export report
          </button>
        ) : null}
      </div>
    </div>
  );
}
