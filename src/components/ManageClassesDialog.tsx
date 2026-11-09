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
export function ManageClassesDialog({setModal,role,setEditing,schedules,date,classes,scheduleEditor,overrides}:{setModal: React.Dispatch<React.SetStateAction<string | null>>;
role: Role;
setEditing: React.Dispatch<React.SetStateAction<Session | null>>;
schedules: Schedule[];
date: string;
classes: ClassGroup[];
scheduleEditor: (session: Session) => void;
overrides: Override[];}){return ((
        <Modal
          title="Manage classes"
          subtitle="Weekly timetables, extra classes and change history"
          onClose={() => setModal(null)}
          wide
        >
          <div className="modal-action-row">
            {role === "admin" && (
              <>
                <button
                  className="button primary"
                  onClick={() => {
                    setEditing(null);
                    setModal("weekly");
                  }}
                >
                  <Plus size={17} />
                  Weekly class
                </button>
                <button
                  className="button white"
                  onClick={() => {
                    setEditing(null);
                    setModal("extra");
                  }}
                >
                  <Plus size={17} />
                  Extra class
                </button>
              </>
            )}
            <button
              className="button white"
              onClick={() => setModal("history")}
            >
              <HistoryIcon size={17} />
              Change history
            </button>
          </div>
          <div className="manage-list">
            {schedules.map((s) => {
              const v =
                [...s.versions]
                  .reverse()
                  .find(
                    (v) => v.from <= date && (!v.until || date <= v.until),
                  ) || s.versions.at(-1)!;
              return (
                <div className="manage-row" key={s.id}>
                  <span className="class-icon teal">
                    <GraduationCap size={23} />
                  </span>
                  <div>
                    <h3>{classes.find((c) => c.id === s.classId)?.name}</h3>
                    <p>
                      {s.extraDate
                        ? shortDate(s.extraDate)
                        : "Every " +
                          [
                            "Sunday",
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                          ][v.weekday]}{" "}
                      · {timeText(v.start)} – {timeText(v.end)}
                    </p>
                    <small>
                      {v.cancelled
                        ? "Cancelled from " + v.from
                        : s.extraDate
                          ? "Extra class"
                          : "Weekly timetable"}
                    </small>
                  </div>
                  {role === "admin" && (
                    <button
                      className="button white"
                      onClick={() => {
                        let d = s.extraDate || date;
                        while (!sessionsFor(d, [s], []).length)
                          d = addDays(d, 1);
                        scheduleEditor(sessionsFor(d, [s], overrides)[0]);
                      }}
                    >
                      Edit
                      <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      ));}
