import {Topbar} from './Topbar';
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
export function PageHeading({tab,student,role,setCalendar,calendar,date,setStudent,setModal,exportReport}:{tab: Tab;
student: Student | null;
role: Role;
setCalendar: React.Dispatch<React.SetStateAction<boolean>>;
calendar: boolean;
date: string;
setStudent: React.Dispatch<React.SetStateAction<Student | null>>;
setModal: React.Dispatch<React.SetStateAction<string | null>>;
exportReport: () => void;}){return (<div className="page-heading">
            <div>
              <div className="eyebrow">
                {tab === "Today"
                  ? "YOUR DAY, AT A GLANCE"
                  : tab === "Scan"
                    ? "A WARM WELCOME STARTS HERE"
                    : tab === "Students"
                      ? "EVERY STUDENT, IN ONE PLACE"
                      : "THE NUMBERS BEHIND YOUR CLASSES"}
              </div>
              <h1>
                {tab === "Today"
                  ? "Today’s overview"
                  : tab === "Scan"
                    ? student
                      ? "Student check-in"
                      : "Scan a student"
                    : tab === "Students"
                      ? "Your students"
                      : "Reports & insights"}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {tab === "Today"
                  ? "A little less admin. A little more teaching."
                  : tab === "Scan"
                    ? "Check attendance, fees and tutes. One action at a time."
                    : tab === "Students"
                      ? "Familiar faces. Everything you need to know."
                      : "Keep track of progress, payments and everything in between."}
              </p>
            </div>
            <div className="page-heading-actions">
              {role === "viewer" && (
                <Badge tone="violet">
                  <ShieldCheck size={13} /> Read only
                </Badge>
              )}
              {tab === "Today" ? (
                <button
                  className="button white date-button"
                  onClick={() => setCalendar(!calendar)}
                >
                  <CalendarDays size={17} />
                  {dateObject(date).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "Asia/Colombo",
                  })}
                  <ChevronRight size={15} />
                </button>
              ) : tab === "Students" && role === "admin" ? (
                <button
                  className="button primary"
                  onClick={() => {
                    setStudent(null);
                    setModal("register");
                  }}
                >
                  <Plus size={18} /> New student
                </button>
              ) : tab === "Reports" ? (
                <button className="button white" onClick={() => exportReport()}>
                  <Download size={17} />
                  Export report
                </button>
              ) : null}
            </div>
          </div>);}
