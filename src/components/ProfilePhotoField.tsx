import { useState } from "react";
import { squarePhoto } from "../profilePhoto";

export function ProfilePhotoField({
  photo,
  enabled,
  save,
}: {
  photo?: string;
  enabled: boolean;
  save: (photo: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function update(file?: File) {
    setBusy(true);
    setError("");
    try {
      await save(file ? await squarePhoto(file, 128) : "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save your picture.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="profile-photo-field">
      <label>
        Profile picture
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={!enabled || busy}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (file) void update(file);
          }}
        />
      </label>
      {photo && (
        <button
          type="button"
          className="text-button"
          disabled={!enabled || busy}
          onClick={() => update()}
        >
          Remove picture
        </button>
      )}
      {busy && <p role="status">Saving picture…</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
