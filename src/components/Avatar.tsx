import { type Student } from "../model";

export function Avatar({
  student,
  size = "normal",
}: {
  student: Student;
  size?: string;
}) {
  return (
    <span className={"avatar " + student.color + " " + size}>
      {student.photo ? (
        <img src={student.photo} alt={student.name} />
      ) : (
        student.name
          .split(" ")
          .map((s) => s[0])
          .slice(0, 2)
          .join("")
      )}
    </span>
  );
}
