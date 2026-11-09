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
export function Sidebar({mobileMenu,navigate,tab,students,setModal,role}:{mobileMenu: boolean;
navigate: (t: Tab) => void;
tab: Tab;
students: Student[];
setModal: React.Dispatch<React.SetStateAction<string | null>>;
role: Role;}){return (<aside className={"sidebar " + (mobileMenu ? "mobile-open" : "")}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("Today");
          }}
        >
          <span className="brand-mark">
            <GraduationCap size={26} />
          </span>
          <span>
            classroom<span className="brand-dot">.</span>
            <small>LESS ADMIN. MORE TEACHING.</small>
          </span>
        </a>
        <div className="workspace">
          <div className="workspace-avatar">
            <GraduationCap size={19} />
          </div>
          <div>
            <strong>My tuition space</strong>
            <span>Mathematics academy</span>
          </div>
          <Badge tone="mint">PRO</Badge>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav">
          {nav.map(({ name, icon }) => (
            <button
              key={name}
              className={tab === name ? "active" : ""}
              onClick={() => navigate(name)}
            >
              <Icon icon={icon} />
              <span>{name}</span>
              {tab === name && <span className="active-dot" />}
              {name === "Students" && <small>{students.length}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="offline-note">
            <span className="offline-icon">
              <CloudCheck size={22} />
            </span>
            <strong>Ready, even offline.</strong>
            <p>
              Your work stays with you.
              <br />
              We’ll sync when you’re back.
            </p>
            <span>
              <i /> Saved on this device
            </span>
          </div>
          <button
            className="sidebar-settings"
            onClick={() => setModal("settings")}
          >
            <Settings size={18} /> Workspace settings
          </button>
          <div className="tutor">
            <span className="tutor-avatar">T</span>
            <div>
              <strong>My workspace</strong>
              <span>
                {role === "admin"
                  ? "Tutor · Admin"
                  : role === "staff"
                    ? "Attendance staff"
                    : "Reports · Read only"}
              </span>
            </div>
            <button
              aria-label="Account and roles"
              className="icon-button"
              onClick={() => setModal("settings")}
            >
              <Ellipsis size={20} />
            </button>
          </div>
        </div>
      </aside>);}
