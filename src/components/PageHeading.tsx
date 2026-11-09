import {
  CalendarDays,
  ChevronRight,
  Download,
  Plus,
  ShieldCheck,
} from "lucide-react";
import React from "react";
import { dateObject, type Role, type Student } from "../model";
import { type Tab } from "../navigation";
import { Badge } from "./Badge";
export function PageHeading({
  tab,
  student,
  role,
  setCalendar,
  calendar,
  date,
  setStudent,
  setModal,
  exportReport,
}: {
  tab: Tab;
  student: Student | null;
  role: Role;
  setCalendar: React.Dispatch<React.SetStateAction<boolean>>;
  calendar: boolean;
  date: string;
  setStudent: React.Dispatch<React.SetStateAction<Student | null>>;
  setModal: React.Dispatch<React.SetStateAction<string | null>>;
  exportReport: () => void;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          {tab === "Today"
            ? "YOUR DAY, AT A GLANCE"
            : tab === "Scan"
              ? "A WARM WELCOME STARTS HERE"
              : tab === "Students"
                ? "EVERY STUDENT, IN ONE PLACE"
                : "THE NUMBERS BEHIND YOUR CLASSES"}
        </div>
        <h1>
          {tab === "Today"
            ? "Today’s overview"
            : tab === "Scan"
              ? student
                ? "Student check-in"
                : "Scan a student"
              : tab === "Students"
                ? "Your students"
                : "Reports & insights"}
          <span className="heading-dot">.</span>
        </h1>
        <p>
          {tab === "Today"
            ? "A little less admin. A little more teaching."
            : tab === "Scan"
              ? "Check attendance, fees and tutes. One action at a time."
              : tab === "Students"
                ? "Familiar faces. Everything you need to know."
                : "Keep track of progress, payments and everything in between."}
        </p>
      </div>
      <div className="page-heading-actions">
        {role === "viewer" && (
          <Badge tone="violet">
            <ShieldCheck size={13} /> Read only
          </Badge>
        )}
        {tab === "Today" ? (
          <button
            className="button white date-button"
            onClick={() => setCalendar(!calendar)}
          >
            <CalendarDays size={17} />
            {dateObject(date).toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "Asia/Colombo",
            })}
            <ChevronRight size={15} />
          </button>
        ) : tab === "Students" && role !== "viewer" ? (
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
          <button className="button white" onClick={() => exportReport()}>
            <Download size={17} />
            Export report
          </button>
        ) : null}
      </div>
    </div>
  );
}
