import {
  monthOf,
  todayISO,
  type Student,
  type Attendance,
  type Fee,
  type Issue,
  type Tute,
  type ClassGroup,
} from "./model";
export function reportRoster(
  students: Student[],
  classId: string,
  month: string,
  attendance: Attendance[],
  fees: Fee[],
  issues: Issue[],
  tutes: Tute[],
  includeRemoved = false,
) {
  const lessonIds = new Set(
    tutes
      .filter((t) => t.classId === classId && t.month === month)
      .map((t) => t.id),
  );
  const recorded = new Set(
    [
      ...attendance.filter(
        (a) => a.classId === classId && a.date.startsWith(month),
      ),
      ...fees.filter((f) => f.classId === classId && f.month === month),
      ...issues.filter((i) => lessonIds.has(i.tuteId)),
    ].map((r) => r.studentId),
  );
  return students.filter(
    (s) =>
      (s.classId === classId || recorded.has(s.id)) &&
      (!s.removedAt ||
        month < monthOf(todayISO()) ||
        (includeRemoved && recorded.has(s.id))),
  );
}
export function reportCsv(
  students: Student[],
  classes: ClassGroup[],
  classId: string,
  month: string,
  attendance: Attendance[],
  fees: Fee[],
  issues: Issue[],
  tutes: Tute[],
) {
  const roster = reportRoster(
    students,
    classId,
    month,
    attendance,
    fees,
    issues,
    tutes,
    true,
  );
  const lessonIds = new Set(
    tutes
      .filter((t) => t.classId === classId && t.month === month)
      .map((t) => t.id),
  );
  const rows = [
    [
      "Student ID",
      "Name",
      "Status",
      "Class",
      "Month",
      "Attendance count",
      "Fee paid (LKR)",
      "Tute issued",
    ],
    ...roster.map((s) => [
      s.id,
      s.name,
      s.removedAt ? "Removed" : "Active",
      classes.find((c) => c.id === classId)?.name || "",
      month,
      attendance.filter(
        (a) =>
          a.studentId === s.id &&
          a.classId === classId &&
          a.date.startsWith(month),
      ).length,
      fees
        .filter(
          (f) =>
            f.studentId === s.id && f.classId === classId && f.month === month,
        )
        .reduce((n, f) => n + f.amount, 0),
      issues.some((i) => i.studentId === s.id && lessonIds.has(i.tuteId))
        ? "Yes"
        : "No",
    ]),
  ];
  return (
    "\uFEFF" +
    rows
      .map((r) =>
        r
          .map(
            (v) =>
              '"' +
              String(v)
                .replace(/^[=+@-]/, "'$&")
                .replace(/"/g, '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n")
  );
}
