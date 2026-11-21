import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  centeredPhoto,
  croppedJpeg,
  drawPhoto,
  panPhoto,
  readPhoto,
} from "../profilePhoto";
import { MemberAvatar } from "./MemberAvatar";
import { Modal } from "./Modal";

type ProfilePhotoProps = {
  email: string;
  photo?: string;
  enabled: boolean;
  save: (photo: string) => Promise<void>;
};

export function ProfilePhotoField({
  email,
  photo,
  enabled,
  save,
}: ProfilePhotoProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="profile-picture-trigger"
        disabled={!enabled}
        aria-label={photo ? "Change profile picture" : "Add profile picture"}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <MemberAvatar email={email} photo={photo} />
        <span className="profile-camera">
          <Camera size={16} />
        </span>
      </button>
      {open &&
        createPortal(
          <PhotoPicker
            photo={photo}
            save={save}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}

function PhotoPicker({
  photo,
  save,
  onClose,
}: Pick<ProfilePhotoProps, "photo" | "save"> & { onClose: () => void }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState(centeredPhoto);
  const [removing, setRemoving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (image && canvas.current) {
      try {
        drawPhoto(canvas.current, image, crop);
      } catch {
        setImage(null);
        setError("This device could not preview the photo.");
      }
    }
  }, [image, crop]);

  async function choose(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const selected = await readPhoto(file);
      setCrop(centeredPhoto);
      setImage(selected);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "This photo could not be read.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function confirm() {
    if (saving || (!image && !removing)) return;
    setSaving(true);
    setError("");
    try {
      const result = image ? croppedJpeg(image, crop, 128) : "";
      await save(result);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save your profile picture.",
      );
    } finally {
      setSaving(false);
    }
  }
  function move(dx: number, dy: number) {
    if (image)
      setCrop((previous) =>
        panPhoto(image.naturalWidth, image.naturalHeight, previous, dx, dy),
      );
  }
  return (
    <Modal
      title={
        image
          ? "Adjust profile picture"
          : removing
            ? "Remove profile picture?"
            : "Profile picture"
      }
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <div className="photo-editor">
        {image ? (
          <>
            <canvas
              ref={canvas}
              width={320}
              height={320}
              className="photo-crop"
              tabIndex={0}
              aria-label="Profile picture preview. Drag or use arrow keys to reposition."
              onPointerDown={(e) => {
                if (saving || !e.isPrimary || e.button !== 0) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                pointer.current = {
                  id: e.pointerId,
                  x: e.clientX,
                  y: e.clientY,
                };
              }}
              onPointerMove={(e) => {
                const prior = pointer.current;
                if (!prior || prior.id !== e.pointerId) return;
                const width = e.currentTarget.getBoundingClientRect().width;
                if (width === 0) return;
                move(
                  (e.clientX - prior.x) / width,
                  (e.clientY - prior.y) / width,
                );
                pointer.current = {
                  id: e.pointerId,
                  x: e.clientX,
                  y: e.clientY,
                };
              }}
              onLostPointerCapture={() => {
                pointer.current = null;
              }}
              onKeyDown={(e) => {
                if (saving) return;
                const step = 0.05;
                switch (e.key) {
                  case "ArrowLeft":
                    move(-step, 0);
                    break;
                  case "ArrowRight":
                    move(step, 0);
                    break;
                  case "ArrowUp":
                    move(0, -step);
                    break;
                  case "ArrowDown":
                    move(0, step);
                    break;
                  default:
                    return;
                }
                e.preventDefault();
              }}
            />
            <p>Drag to position your photo.</p>
            <label className="photo-zoom">
              Zoom
              <input
                type="range"
                disabled={saving}
                min={1}
                max={3}
                step={0.05}
                value={crop.zoom}
                onChange={(e) =>
                  setCrop({ ...crop, zoom: Number(e.currentTarget.value) })
                }
              />
            </label>
            <button
              type="button"
              className="button primary"
              disabled={saving}
              onClick={confirm}
            >
              {saving ? "Saving…" : "Save picture"}
            </button>
            <button
              type="button"
              className="button white"
              disabled={saving}
              onClick={() => {
                setError("");
                setImage(null);
              }}
            >
              Choose another photo
            </button>
          </>
        ) : removing ? (
          <>
            <p>Your initial will appear in recent activity.</p>
            <button
              type="button"
              disabled={saving}
              className="button danger"
              onClick={confirm}
            >
              {saving ? "Removing…" : "Remove picture"}
            </button>
            <button
              type="button"
              disabled={saving}
              className="button white"
              onClick={() => {
                setError("");
                setRemoving(false);
              }}
            >
              Keep picture
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={loading}
              className="button white photo-choice"
              onClick={() => camera.current?.click()}
            >
              <Camera size={20} /> Take photo
            </button>
            <button
              type="button"
              disabled={loading}
              className="button white photo-choice"
              onClick={() => gallery.current?.click()}
            >
              <ImagePlus size={20} /> Choose from photos
            </button>
            {photo && (
              <button
                type="button"
                disabled={loading}
                className="button white photo-choice"
                onClick={() => {
                  setError("");
                  setRemoving(true);
                }}
              >
                <Trash2 size={20} /> Remove picture
              </button>
            )}
            <input
              type="file"
              ref={camera}
              hidden
              accept="image/*"
              capture="user"
              onChange={(e) => void choose(e.currentTarget)}
            />
            <input
              type="file"
              ref={gallery}
              hidden
              accept="image/*"
              onChange={(e) => void choose(e.currentTarget)}
            />
            {loading && <p role="status">Opening photo…</p>}
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
