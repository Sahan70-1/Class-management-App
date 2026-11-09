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
import {Modal} from './Modal';
import {Avatar} from './Avatar';
import {download} from '../utils';
export function QRModal({
  student,
  classLabel,
  onClose,
  onScan,
}: {
  student: Student;
  classLabel: string;
  onClose: () => void;
  onScan: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current)
      void QRCode.toCanvas(
        canvas.current,
        JSON.stringify({ app: "classroom", v: 1, id: student.id }),
        {
          width: 260,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#152c34", light: "#ffffff" },
        },
      );
  }, [student.id]);
  function printQR() {
    const popup = window.open("", "_blank", "width=500,height=650");
    if (!popup || !canvas.current) return;
    popup.document.title = "Student QR · " + student.id;
    const heading = popup.document.createElement("h1");
    heading.textContent = student.name;
    const info = popup.document.createElement("p");
    info.textContent =
      student.id + " · " + classLabel + " · Roll " + student.roll;
    const image = popup.document.createElement("img");
    image.src = canvas.current.toDataURL();
    image.width = 300;
    popup.document.body.style.cssText =
      "font-family:system-ui;text-align:center;padding:30px";
    popup.document.body.append(heading, info, image);
    image.onload = () => {
      popup.focus();
      popup.print();
    };
  }
  return (
    <Modal
      title="One student. One permanent QR."
      subtitle="Ready to save, print and bring to class"
      onClose={onClose}
    >
      <div className="qr-profile">
        <Avatar student={student} size="large" />
        <div>
          <h2>{student.name}</h2>
          <p>
            {student.id} · {classLabel}
          </p>
          <span>Class roll {student.roll}</span>
        </div>
      </div>
      <div className="qr-canvas">
        <canvas ref={canvas} />
        <strong>{student.id}</strong>
        <span>CLASSROOM · STUDENT QR</span>
      </div>
      <div className="form">
        <button
          className="button primary full"
          onClick={() =>
            canvas.current?.toBlob((blob) => {
              if (blob) download(blob, student.id + "-QR.png");
            })
          }
        >
          <Download size={18} />
          Save QR image
        </button>
        <button className="button white full" onClick={printQR}>
          <Printer size={18} />
          Print QR
        </button>
        <button className="button white full" onClick={onScan}>
          <ScanLine size={18} />
          Back to scanner
        </button>
        <span className="form-hint">
          <Info size={15} />
          Keep this QR when the student’s grade or class changes.
        </span>
      </div>
    </Modal>
  );
}
