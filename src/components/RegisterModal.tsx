import { classGrade } from "../model";
import { ArrowRight, Camera, Info } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { type EntityMap, type Student } from "../model";
import { Modal } from "./Modal";
export function RegisterModal({
  classes,
  existing,
  students,
  onClose,
  onSave,
}: {
  classes: EntityMap["classes"][];
  existing: Student | null;
  students: Student[];
  onClose: () => void;
  onSave: (s: Student) => Promise<void>;
}) {
  const [name, setName] = useState(existing?.name || ""),
    [classId, setClassId] = useState(existing?.classId || classes[0]?.id || ""),
    [phone, setPhone] = useState(existing?.phone || ""),
    [parentPhone, setParentPhone] = useState(existing?.parentPhone || ""),
    [whatsapp, setWhatsapp] = useState(existing?.whatsapp || ""),
    [address, setAddress] = useState(existing?.address || ""),
    [photo, setPhoto] = useState(existing?.photo || ""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  async function addPhoto(f: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    try {
      const image = await createImageBitmap(f);
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const ctx = c.getContext("2d")!;
      const side = Math.min(image.width, image.height);
      ctx.drawImage(
        image,
        (image.width - side) / 2,
        (image.height - side) / 2,
        side,
        side,
        0,
        0,
        256,
        256,
      );
      setPhoto(c.toDataURL("image/jpeg", 0.8));
      image.close();
      setError("");
    } catch {
      setError("This photo could not be read.");
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const c = classes.find((c) => c.id === classId)!;
    const grade = classGrade(c);
    const id =
      existing?.id || "S-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    const sameClass = existing?.classId === classId;
    const roll = sameClass
      ? existing!.roll
      : grade.padStart(2, "0") + "-" + id.slice(-6);
    try {
      await onSave({
        ...existing,
        id,
        name: name.trim(),
        phone,
        parentPhone,
        whatsapp,
        address,
        photo: photo || undefined,
        classId,
        grade,
        roll,
        color:
          existing?.color ||
          ["mint", "peach", "blue", "lilac"][students.length % 4],
      });
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={existing ? "Edit student" : "A new face. A fresh start."}
      subtitle={
        existing
          ? "The student ID and QR stay the same when details change."
          : "Register a student and create their permanent QR."
      }
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <div className="register-top">
          <button
            className="photo-upload"
            type="button"
            onClick={() => file.current?.click()}
          >
            {photo ? (
              <img src={photo} alt="Student photo preview" />
            ) : (
              <>
                <Camera size={25} />
                <span>
                  Add photo<small>Optional</small>
                </span>
              </>
            )}
          </button>
          <input
            ref={file}
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              if (e.target.files?.[0]) void addPhoto(e.target.files[0]);
            }}
          />
          <label>
            Class & grade
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Grade {classGrade(c)} · {c.name}
                </option>
              ))}
            </select>
            <span className="form-hint">
              {new Date().getFullYear()} academic year
            </span>
          </label>
        </div>
        <label>
          Full name
          <input
            required
            maxLength={100}
            value={name}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Saman Kumara"
          />
        </label>
        <div className="form-grid">
          <label>
            Student phone
            <input
              type="tel"
              maxLength={30}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07X XXX XXXX"
            />
          </label>
          <label>
            Parent phone
            <input
              type="tel"
              maxLength={30}
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="07X XXX XXXX"
            />
          </label>
        </div>
        <label>
          WhatsApp number
          <input
            type="tel"
            maxLength={30}
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="07X XXX XXXX"
          />
        </label>
        <label>
          Address
          <textarea
            rows={2}
            maxLength={400}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Optional home address"
          />
        </label>
        {error && (
          <div className="callout warning" role="alert">
            {error}
          </div>
        )}
        <div className="callout">
          <Info size={18} />
          <span>
            Student ID is assigned automatically and never changes. QR codes
            contain the ID, with no contact details.
          </span>
        </div>
        <button className="button primary full" disabled={saving}>
          {saving
            ? "Saving…"
            : existing
              ? "Save student details"
              : "Register & create QR"}
          <ArrowRight size={17} />
        </button>
      </form>
    </Modal>
  );
}
