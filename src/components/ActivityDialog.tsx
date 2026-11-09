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
export function ActivityDialog({setModal,data,recent}:{setModal: React.Dispatch<React.SetStateAction<string | null>>;
data: StoreState;
recent: { id: string; at: string; actor: string; description: string; key: string; entity: Entity; pending: boolean; }[];}){return ((
        <Modal
          title="Recent activity"
          subtitle="Changes saved locally and on the server"
          onClose={() => setModal(null)}
        >
          <div className="activity-list modal-list">
            {[
              ...data.pending.map((o) => ({
                id: o.id,
                description: o.entity + " updated · pending sync",
                actor: o.actor,
                at: o.at,
              })),
              ...data.history,
            ]
              .sort((a, b) => b.at.localeCompare(a.at))
              .map((h) => (
                <div className="history-row" key={h.id}>
                  <span className="activity-icon mint">
                    <HistoryIcon size={17} />
                  </span>
                  <div>
                    <strong>{h.description}</strong>
                    <p>{h.actor}</p>
                    <small>
                      {new Date(h.at).toLocaleString("en-GB", {
                        timeZone: "Asia/Colombo",
                      })}
                    </small>
                  </div>
                </div>
              ))}
            {!recent.length && (
              <p className="muted padded">
                No new changes yet. Your activity will appear here.
              </p>
            )}
          </div>
        </Modal>
      ));}
