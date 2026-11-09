import {type StoreState} from '../store';
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
import {type Issue,type ClassGroup,type Attendance,type Tute,type Fee,type History} from '../model';
export function ReportsTab({reportClass,setReportClass,classes,reportMonth,setReportMonth,students,fees,attendance,tutes,issues,reportType,setReportType,data}:{reportClass: string;
setReportClass: React.Dispatch<React.SetStateAction<string>>;
classes: ClassGroup[];
reportMonth: string;
setReportMonth: React.Dispatch<React.SetStateAction<string>>;
students: Student[];
fees: Fee[];
attendance: Attendance[];
tutes: Tute[];
issues: Issue[];
reportType: string;
setReportType: React.Dispatch<React.SetStateAction<string>>;
data: StoreState;}){return ((
            <>
              <div className="report-toolbar">
                <div>
                  <GraduationCap size={18} />
                  <select
                    aria-label="Report class"
                    value={reportClass}
                    onChange={(e) => setReportClass(e.target.value)}
                  >
                    {classes.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <CalendarDays size={18} />
                  <input
                    aria-label="Report month"
                    type="month"
                    value={reportMonth}
                    onChange={(e) => {
                      if (e.target.value) setReportMonth(e.target.value);
                    }}
                  />
                </div>
                <Badge tone="mint">
                  <RefreshCw size={12} />
                  Includes locally saved updates
                </Badge>
              </div>
              {(() => {
                const roster = students.filter(
                  (s) => s.classId === reportClass,
                );
                const monthFees = fees.filter(
                  (f) => f.classId === reportClass && f.month === reportMonth,
                );
                const monthAttendance = attendance.filter(
                  (a) =>
                    a.classId === reportClass && a.date.startsWith(reportMonth),
                );
                const t = tutes.find(
                  (t) => t.classId === reportClass && t.month === reportMonth,
                );
                const issued = issues.filter((i) => i.tuteId === t?.id);
                return (
                  <>
                    <div className="stats-grid report-stats">
                      <Stat
                        icon={CheckCheck}
                        label="Attendance records"
                        value={monthAttendance.length}
                        foot={monthText(reportMonth)}
                        tone="mint"
                      />
                      <Stat
                        icon={Coins}
                        label="Monthly fees collected"
                        value={
                          <>
                            <small>LKR</small>{" "}
                            {monthFees
                              .reduce((n, f) => n + f.amount, 0)
                              .toLocaleString()}
                          </>
                        }
                        foot={monthFees.length + " payments recorded"}
                        tone="peach"
                      />
                      <Stat
                        icon={BookOpen}
                        label="Tutes distributed"
                        value={
                          <>
                            {issued.length}
                            <small> / {roster.length}</small>
                          </>
                        }
                        foot={t?.title || "No lesson title set"}
                        tone="lilac"
                      />
                      <Stat
                        icon={Users}
                        label="Enrolled students"
                        value={roster.length}
                        foot={
                          classes.find((c) => c.id === reportClass)?.name || ""
                        }
                        tone="blue"
                      />
                    </div>
                    <div className="panel report-panel">
                      <div className="section-heading">
                        <div>
                          <h2>Every student, a clearer picture</h2>
                          <p>
                            {classes.find((c) => c.id === reportClass)?.name} ·{" "}
                            {monthText(reportMonth)}
                          </p>
                        </div>
                        <Badge tone="amber">
                          {
                            roster.filter(
                              (s) =>
                                !monthFees.some((f) => f.studentId === s.id),
                            ).length
                          }{" "}
                          unpaid
                        </Badge>
                      </div>
                      <div className="report-tabs">
                        {[
                          {
                            id: "attendance",
                            label: "Attendance",
                            icon: CheckCheck,
                          },
                          { id: "fees", label: "Monthly fees", icon: Coins },
                          {
                            id: "tutes",
                            label: "Tute distribution",
                            icon: BookOpen,
                          },
                        ].map(({ id, label, icon }) => (
                          <button
                            className={reportType === id ? "active" : ""}
                            key={id}
                            onClick={() => setReportType(id)}
                          >
                            <Icon icon={icon} size={16} />
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>STUDENT</th>
                              <th>STUDENT ID</th>
                              <th>
                                {reportType === "attendance"
                                  ? "CLASSES ATTENDED"
                                  : reportType === "fees"
                                    ? "PAYMENT STATUS"
                                    : "TUTE STATUS"}
                              </th>
                              <th>
                                {reportType === "attendance"
                                  ? "LATEST CHECK-IN"
                                  : reportType === "fees"
                                    ? "AMOUNT"
                                    : "LESSON TITLE"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {roster.map((s) => {
                              const attended = monthAttendance
                                .filter((a) => a.studentId === s.id)
                                .sort((a, b) => b.at.localeCompare(a.at));
                              const fee = monthFees.find(
                                (f) => f.studentId === s.id,
                              );
                              const issue = issued.some(
                                (i) => i.studentId === s.id,
                              );
                              return (
                                <tr key={s.id}>
                                  <td>
                                    <div className="student-cell">
                                      <Avatar student={s} size="small" />
                                      <strong>{s.name}</strong>
                                    </div>
                                  </td>
                                  <td>{s.id}</td>
                                  <td>
                                    {reportType === "attendance" ? (
                                      <Badge
                                        tone={
                                          attended.length ? "mint" : "neutral"
                                        }
                                      >
                                        {attended.length} sessions
                                      </Badge>
                                    ) : reportType === "fees" ? (
                                      <Badge tone={fee ? "mint" : "amber"}>
                                        {fee ? "Paid" : "Unpaid"}
                                      </Badge>
                                    ) : (
                                      <Badge tone={issue ? "mint" : "amber"}>
                                        {issue ? "Issued" : "Not issued"}
                                      </Badge>
                                    )}
                                  </td>
                                  <td>
                                    {reportType === "attendance"
                                      ? attended[0]
                                        ? shortDate(attended[0].date)
                                        : "—"
                                      : reportType === "fees"
                                        ? fee
                                          ? money(fee.amount)
                                          : "—"
                                        : t?.title || "Not set"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="directory-footer">
                        <Info size={15} />
                        Last synced:{" "}
                        {data.lastSync
                          ? new Date(data.lastSync).toLocaleString("en-GB", {
                              timeZone: "Asia/Colombo",
                            })
                          : "Not yet synced"}
                        {data.pending.length > 0 &&
                          ` · ${data.pending.length} local updates pending`}
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          ));}
