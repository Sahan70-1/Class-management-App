import { useState } from "react";
import { type Role, type Student } from "./model";
import { getSnapshot, mutate } from "./store";
export function useStudentRemoval(role: Role) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function change(student: Student, remove: boolean) {
    if (role !== "admin") {
      setError("Only admins can remove or restore a student.");
      return false;
    }
    setBusy(true);
    setError("");
    try {
      const updated = { ...student };
      if (remove) {
        updated.removedAt = new Date().toISOString();
        updated.removedBy = getSnapshot().email;
      } else {
        delete updated.removedAt;
        delete updated.removedBy;
      }
      await mutate("students", updated, role);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this change.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, change };
}
