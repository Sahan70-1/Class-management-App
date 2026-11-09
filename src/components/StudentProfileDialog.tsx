import {ScheduleHistoryDialog} from './ScheduleHistoryDialog';
import {ManageClassesDialog} from './ManageClassesDialog';
import {ActivityDialog} from './ActivityDialog';
import {BottomNavigation} from './BottomNavigation';
import {SyncDialog} from './SyncDialog';
import {ReportsTab} from './ReportsTab';
import {StudentsTab} from './StudentsTab';
import {ScanTab} from './ScanTab';
import {TodayTab} from './TodayTab';
import {SettingsModal} from './SettingsModal';
import {TuteModal} from './TuteModal';
import {PaymentModal} from './PaymentModal';
import {QRModal} from './QRModal';
import {RegisterModal} from './RegisterModal';
import {FreeTimes} from './FreeTimes';
import {ScheduleModal} from './ScheduleModal';
import {download} from '../utils';
import {Scanner} from './Scanner';
import {StudentCheckin} from './StudentCheckin';
import {ClassIllustration} from './ClassIllustration';
import {MiniCalendar} from './MiniCalendar';
import {Stat} from './Stat';
import {Modal} from './Modal';
import {Badge} from './Badge';
import {Avatar} from './Avatar';
import {Icon} from './Icon';
import {nav} from '../navigation';
import {type Tab} from '../navigation';
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
import {type StoreState} from '../store';
import {type Issue,type ClassGroup,type Attendance,type Tute,type Fee,type History} from '../model';
export function StudentProfileDialog({setModal,student,classes,attendance,fees,issues,role}:{setModal: React.Dispatch<React.SetStateAction<string | null>>;
student: Student;
classes: ClassGroup[];
attendance: Attendance[];
fees: Fee[];
issues: Issue[];
role: Role;}){return ((
        <Modal
          title="Student profile"
          subtitle="Details, attendance, fees and tutes"
          onClose={() => setModal(null)}
        >
          <div className="profile-header">
            <Avatar student={student} size="large" />
            <div>
              <h2>{student.name}</h2>
              <p>
                {student.id} ·{" "}
                {classes.find((c) => c.id === student.classId)?.name}
              </p>
              <small>Class roll {student.roll}</small>
            </div>
          </div>
          <div className="profile-details">
            {[
              ["Student phone", student.phone],
              ["Parent phone", student.parentPhone],
              ["WhatsApp", student.whatsapp],
              ["Address", student.address],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value || "Not provided"}</strong>
              </div>
            ))}
          </div>
          <div className="profile-stats">
            <div>
              <strong>
                {attendance.filter((a) => a.studentId === student.id).length}
              </strong>
              <span>Classes attended</span>
            </div>
            <div>
              <strong>
                {money(
                  fees
                    .filter((f) => f.studentId === student.id)
                    .reduce((n, f) => n + f.amount, 0),
                )}
              </strong>
              <span>Total fees recorded</span>
            </div>
            <div>
              <strong>
                {issues.filter((i) => i.studentId === student.id).length}
              </strong>
              <span>Tutes issued</span>
            </div>
          </div>
          <div className="modal-action-row">
            <button className="button primary" onClick={() => setModal("qr")}>
              <ScanLine size={17} />
              View student QR
            </button>
            {role === "admin" && (
              <button
                className="button white"
                onClick={() => setModal("register")}
              >
                <UserRound size={17} />
                Edit student
              </button>
            )}
          </div>
          <h3 className="spaced-title">Recent payments</h3>
          {fees
            .filter((f) => f.studentId === student.id)
            .sort((a, b) => b.at.localeCompare(a.at))
            .slice(0, 6)
            .map((f) => (
              <div className="detail-row" key={f.id}>
                <span>{monthText(f.month)}</span>
                <strong>{money(f.amount)}</strong>
                <Badge tone="mint">Paid</Badge>
              </div>
            ))}
          {!fees.some((f) => f.studentId === student.id) && (
            <p className="muted">No payments recorded yet.</p>
          )}
        </Modal>
      ));}
