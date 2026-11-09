import {Sidebar} from './Sidebar';
import {StudentProfileDialog} from './StudentProfileDialog';
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
export function Topbar({setMobileMenu,tab,data,setModal}:{setMobileMenu: React.Dispatch<React.SetStateAction<boolean>>;
tab: Tab;
data: StoreState;
setModal: React.Dispatch<React.SetStateAction<string | null>>;}){return (<header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open menu"
              onClick={() => setMobileMenu(true)}
            >
              <Menu />
            </button>
            <span className="desktop-only">Workspace</span>
            <ChevronRight size={14} className="desktop-only" />
            <strong>{tab}</strong>
          </div>
          <div className="topbar-right">
            <button
              className={"sync-button " + (!data.online ? "offline" : "")}
              onClick={() => setModal("sync")}
            >
              <Icon
                icon={
                  !data.online
                    ? CloudOff
                    : data.syncing
                      ? RefreshCw
                      : CloudCheck
                }
                size={18}
                className={data.syncing ? "spinning" : ""}
              />
              <span>
                {!data.online
                  ? "Offline"
                  : data.syncing
                    ? "Syncing"
                    : data.pending.length
                      ? data.pending.length + " pending"
                      : data.lastSync
                        ? "All changes synced"
                        : "Saved locally"}
              </span>
              <i />
            </button>
            <span className="topbar-divider" />
            <button
              className="icon-button notification"
              aria-label="View recent activity"
              onClick={() => setModal("activity")}
            >
              <Bell size={19} />
              {data.pending.length > 0 && <i />}
            </button>
            <button
              className="account-avatar"
              aria-label="Workspace settings"
              onClick={() => setModal("settings")}
            >
              T
            </button>
          </div>
        </header>);}
