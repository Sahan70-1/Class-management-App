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
export function SyncDialog({setModal,data}:{setModal: React.Dispatch<React.SetStateAction<string | null>>;
data: StoreState;}){return ((
        <Modal
          title="Your work, safely saved"
          subtitle="Device storage & synchronization"
          onClose={() => setModal(null)}
        >
          <div className="sync-detail">
            <span className="large-status mint">
              <CloudCheck size={30} />
            </span>
            <h3>
              {!data.online
                ? "Working offline"
                : data.pending.length
                  ? `${data.pending.length} updates waiting to sync`
                  : "Everything is saved on this device"}
            </h3>
            <p>
              Last successful sync:{" "}
              {data.lastSync
                ? new Date(data.lastSync).toLocaleString("en-GB", {
                    timeZone: "Asia/Colombo",
                  })
                : "Not yet synced"}
            </p>
            {data.error && (
              <div className="callout warning">
                <TriangleAlert size={18} />
                {data.error}
              </div>
            )}
            <p>
              Keep this browser’s storage until all pending changes are synced.
              Other devices receive updates after a successful sync.
            </p>
            {data.conflicts.map((c) => {
              const id = c.split(": ")[0];
              return (
                <div className="conflict-item" key={id}>
                  <p>{c.slice(id.length + 2)}</p>
                  <button
                    className="button white"
                    onClick={() => void discardConflict(id)}
                  >
                    Use server version & discard local change
                  </button>
                </div>
              );
            })}
            <button
              className="button primary full"
              onClick={() => void sync()}
              disabled={!data.online || data.syncing}
            >
              <RefreshCw size={17} className={data.syncing ? "spinning" : ""} />
              {data.syncing ? "Syncing…" : "Sync now"}
            </button>
            {data.error?.includes("Sign in") && (
              <a
                className="button white full"
                href={
                  "/signin-with-chatgpt?return_to=" + encodeURIComponent("/")
                }
                target="_top"
              >
                Sign in to sync
                <ArrowRight size={16} />
              </a>
            )}
          </div>
        </Modal>
      ));}
