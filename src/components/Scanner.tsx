import React, {
  useEffect,
  useState,
  useSyncExternalStore,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  GraduationCap,
  LayoutDashboard,
  ScanLine,
  Users,
  ChartNoAxesCombined,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  Plus,
  Clock,
  Cloud as CloudCheck,
  CloudOff,
  RefreshCw,
  Settings,
  Search,
  ArrowRight,
  Check,
  CheckCheck,
  Coins,
  BookOpen,
  MapPin,
  Ellipsis,
  Download,
  X,
  Camera,
  Info,
  History as HistoryIcon,
  LogOut,
  ShieldCheck,
  WifiOff,
  CalendarClock,
  SlidersHorizontal,
  ArrowLeft,
  Printer,
  ImagePlus,
  Menu,
  Mail,
  TriangleAlert,
  Sun,
  CheckCircle2,
  FileText,
  Bell,
  Layers,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import {
  initialize,
  subscribe,
  getSnapshot,
  mutate,
  sync,
  discardConflict,
} from "../store";
import {
  todayISO,
  addDays,
  weekday,
  dateObject,
  monthOf,
  monthText,
  shortDate,
  timeText,
  money,
  values,
  sessionsFor,
  freeSlots,
  findConflict,
  overlaps,
  qrStudentId,
  type Session,
  type Student,
  type Role,
  type Schedule,
  type Override,
  type EntityMap,
  type Entity,
  type StoredRecord,
} from "../model";

export function Scanner({
  disabled,
  onResult,
  notify,
}: {
  disabled: boolean;
  onResult: (raw: string) => void;
  notify: (message: string) => void;
}) {
  const [active, setActive] = useState(false),
    [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!active) return;
    let stopped = false,
      frame = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
        function scan() {
          if (stopped) return;
          if (video.current?.readyState === 4) {
            canvas.width = video.current.videoWidth;
            canvas.height = video.current.videoHeight;
            ctx.drawImage(video.current, 0, 0);
            const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(image.data, image.width, image.height);
            if (code) {
              onResult(code.data);
              setActive(false);
              return;
            }
          }
          frame = requestAnimationFrame(scan);
        }
        frame = requestAnimationFrame(scan);
      })
      .catch((e) => {
        setError(
          e.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in your browser or upload a QR image."
            : "Camera is unavailable. Upload a QR image or search for a student.",
        );
        setActive(false);
      });
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);
  async function upload(f: File) {
    try {
      const image = await createImageBitmap(f);
      const c = document.createElement("canvas");
      c.width = image.width;
      c.height = image.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      const result = jsQR(data.data, c.width, c.height);
      image.close();
      if (result) onResult(result.data);
      else notify("No readable QR found in this image. Try a clearer image.");
    } catch {
      notify("This image could not be read. Use a PNG or JPEG.");
    }
  }
  return (
    <>
      <div className={"scanner-window " + (active ? "is-active" : "")}>
        {active ? (
          <video ref={video} playsInline muted />
        ) : (
          <div className="scanner-placeholder">
            <div className="qr-sample">
              <ScanLine size={66} strokeWidth={1.1} />
            </div>
            <h3>One scan. A familiar face.</h3>
            <p>Place the student’s QR inside the frame.</p>
            <button
              className="button primary"
              onClick={() => {
                if (!navigator.mediaDevices) {
                  setError(
                    "Camera access requires HTTPS. Upload a QR image or search for a student.",
                  );
                  return;
                }
                setError("");
                setActive(true);
              }}
              disabled={disabled}
            >
              <Camera size={18} />
              Open camera
            </button>
          </div>
        )}
        <div className="scanner-corners">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="scanner-bottom">
          <span>
            <i />
            {active ? "Camera active" : "Camera is paused"}
          </span>
          {active && (
            <button onClick={() => setActive(false)}>Stop camera</button>
          )}
        </div>
      </div>
      {error && (
        <div role="alert" className="callout warning">
          <Info size={18} />
          {error}
        </div>
      )}
      <button
        className="upload-qr"
        onClick={() => file.current?.click()}
        disabled={disabled}
      >
        <ImagePlus size={17} />
        Or upload a QR image
        <ArrowUpRight size={14} />
      </button>
      <input
        hidden
        type="file"
        ref={file}
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.[0]) void upload(e.target.files[0]);
        }}
      />
    </>
  );
}
