import {
  ChevronRight,
  Layers,
  ScanLine,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import React from "react";
import {
  monthOf,
  type ClassGroup,
  type Fee,
  type Issue,
  type Student,
  type Tute,
} from "../model";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
export function StudentsTab({
  query,
  setQuery,
  filter,
  setFilter,
  classes,
  setModal,
  students,
  tutes,
  today,
  setStudent,
  fees,
  issues,
}: {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  filter: string;
  setFilter: React.Dispatch<React.SetStateAction<string>>;
  classes: ClassGroup[];
  setModal: React.Dispatch<React.SetStateAction<string | null>>;
  students: Student[];
  tutes: Tute[];
  today: string;
  setStudent: React.Dispatch<React.SetStateAction<Student | null>>;
  fees: Fee[];
  issues: Issue[];
}) {
  return (
    <>
      <div className="directory-toolbar">
        <div className="search-input">
          <Search size={18} />
          <input
            aria-label="Search students"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, student ID or phone…"
          />
        </div>
        <div className="filter-select">
          <SlidersHorizontal size={16} />
          <select
            aria-label="Filter students by class"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All classes</option>
            {classes.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button className="button white" onClick={() => setModal("tutes")}>
          <Layers size={17} />
          Manage tutes
        </button>
      </div>
      <div className="panel student-directory">
        <div className="directory-header">
          <h3>
            Student directory{" "}
            <span className="count-pill">
              {
                students.filter((s) => filter === "all" || s.classId === filter)
                  .length
              }
            </span>
          </h3>
          <span>Stable IDs. Familiar faces.</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>STUDENT</th>
                <th>CLASS & ROLL</th>
                <th>MONTHLY FEES</th>
                <th>TUTE STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {students
                .filter(
                  (s) =>
                    (filter === "all" || s.classId === filter) &&
                    (s.name + " " + s.id + " " + s.phone + " " + s.parentPhone)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                )
                .map((s) => {
                  const t = tutes.find(
                    (t) =>
                      t.classId === s.classId && t.month === monthOf(today),
                  );
                  return (
                    <tr key={s.id}>
                      <td>
                        <button
                          className="student-cell"
                          onClick={() => {
                            setStudent(s);
                            setModal("profile");
                          }}
                        >
                          <Avatar student={s} />
                          <span>
                            <strong>{s.name}</strong>
                            <small>{s.id}</small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <strong>
                          {classes.find((c) => c.id === s.classId)?.name}
                        </strong>
                        <small className="cell-sub">Roll {s.roll}</small>
                      </td>
                      <td>
                        <Badge
                          tone={
                            fees.some(
                              (f) =>
                                f.studentId === s.id &&
                                f.month === monthOf(today),
                            )
                              ? "mint"
                              : "amber"
                          }
                          dot
                        >
                          {fees.some(
                            (f) =>
                              f.studentId === s.id &&
                              f.month === monthOf(today),
                          )
                            ? "Paid"
                            : "Unpaid"}
                        </Badge>
                      </td>
                      <td>
                        <Badge
                          tone={
                            issues.some(
                              (i) => i.studentId === s.id && i.tuteId === t?.id,
                            )
                              ? "mint"
                              : "neutral"
                          }
                        >
                          {issues.some(
                            (i) => i.studentId === s.id && i.tuteId === t?.id,
                          )
                            ? "Issued"
                            : "Not issued"}
                        </Badge>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={"View QR for " + s.name}
                            onClick={() => {
                              setStudent(s);
                              setModal("qr");
                            }}
                          >
                            <ScanLine size={19} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={"View profile for " + s.name}
                            onClick={() => {
                              setStudent(s);
                              setModal("profile");
                            }}
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {!students.some(
          (s) =>
            (filter === "all" || s.classId === filter) &&
            (s.name + " " + s.id + " " + s.phone + " " + s.parentPhone)
              .toLowerCase()
              .includes(query.toLowerCase()),
        ) && (
          <div className="empty-state">
            <Search size={28} />
            <h3>No students found</h3>
            <p>Try another name, student ID or phone number.</p>
          </div>
        )}
        <div className="directory-footer">
          <ShieldCheck size={15} />A student’s QR stays the same when their
          grade changes.
        </div>
      </div>
    </>
  );
}
