export type Role = 'admin' | 'staff' | 'viewer';
export type Entity = 'students' | 'classes' | 'schedules' | 'overrides' | 'attendance' | 'fees' | 'tutes' | 'issues';
export interface Student { id:string; name:string; phone:string; parentPhone:string; whatsapp:string; address:string; grade:string; classId:string; roll:string; photo?:string; color:string; removedAt?:string; removedBy?:string }
export interface ClassGroup { id:string; grade?:string; name:string; subject:string; room:string; fee:number; color:string }
export interface ScheduleVersion { from:string; until?:string; weekday:number; start:string; end:string; cancelled?:boolean }
export interface Schedule { id:string; classId:string; versions:ScheduleVersion[]; extraDate?:string }
export interface Override { id:string; scheduleId:string; date:string; start:string; end:string; cancelled:boolean }
export interface Attendance { id:string; studentId:string; sessionId:string; date:string; classId:string; at:string }
export interface Fee { id:string; studentId:string; classId:string; month:string; amount:number; at:string; method:string }
export interface Tute { id:string; classId:string; month:string; title:string }
export interface Issue { id:string; studentId:string; tuteId:string; at:string }
export interface EntityMap { students:Student; classes:ClassGroup; schedules:Schedule; overrides:Override; attendance:Attendance; fees:Fee; tutes:Tute; issues:Issue }
export interface StoredRecord { entity:Entity; key:string; value:EntityMap[Entity]; revision:number }
export interface Operation extends StoredRecord { id:string; at:string; actor:string; baseRevision:number }
export interface History { id:string; entity:Entity; key:string; at:string; actor:string; description:string }
export interface Session { id:string; scheduleId:string; classId:string; date:string; start:string; end:string; cancelled:boolean; extra:boolean }
export const todayISO=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const monthOf=(date:string)=>date.slice(0,7);
export const dateObject=(date:string)=>new Date(date+'T12:00:00+05:30');
export const addDays=(date:string,n:number)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export const weekday=(date:string)=>new Date(date+'T12:00:00Z').getUTCDay();
export const minutes=(time:string)=>{const [h,m]=time.split(':').map(Number);return h*60+m;};
export const timeText=(time:string)=>new Date('2026-01-01T'+time+':00').toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
export const shortDate=(date:string)=>dateObject(date).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Asia/Colombo'});
export const monthText=(month:string)=>dateObject(month+'-01').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'Asia/Colombo'});
export const money=(amount:number)=>'LKR '+amount.toLocaleString('en-LK');
export const recordId=(entity:Entity,key:string)=>entity+':'+key;
export function values<K extends Entity>(records:StoredRecord[],entity:K):EntityMap[K][]{return records.filter(r=>r.entity===entity).map(r=>r.value as EntityMap[K]);}
export function sessionsFor(date:string,schedules:Schedule[],overrides:Override[]):Session[]{
  return schedules.flatMap(s=>{const v=[...s.versions].reverse().find(v=>v.from<=date&&(!v.until||date<=v.until));if(!v||(s.extraDate?s.extraDate!==date:v.weekday!==weekday(date)))return [];const o=overrides.find(o=>o.scheduleId===s.id&&o.date===date);return [{id:s.id+'@'+date,scheduleId:s.id,classId:s.classId,date,start:o?.start??v.start,end:o?.end??v.end,cancelled:!!v.cancelled||!!o?.cancelled,extra:!!s.extraDate}];}).sort((a,b)=>a.start.localeCompare(b.start));
}
export const overlaps=(a:Pick<Session,'start'|'end'>,b:Pick<Session,'start'|'end'>)=>minutes(a.start)<minutes(b.end)&&minutes(b.start)<minutes(a.end);
export function freeSlots(date:string,duration:number,schedules:Schedule[],overrides:Override[],exclude?:string){const busy=sessionsFor(date,schedules,overrides).filter(s=>!s.cancelled&&s.scheduleId!==exclude);const result:{start:string;end:string}[]=[];const t=(m:number)=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');for(let m=480;m+duration<=1200;m+=30){const slot={start:t(m),end:t(m+duration)};if(!busy.some(s=>overlaps(s,slot)))result.push(slot);}return result;}
export function findConflict(candidate:Schedule,schedules:Schedule[],overrides:Override[]){const start=candidate.extraDate||candidate.versions.at(-1)!.from;for(let i=0;i<(candidate.extraDate?1:370);i++){const date=addDays(start,i);const own=sessionsFor(date,[candidate],overrides).filter(s=>!s.cancelled);const others=sessionsFor(date,schedules.filter(s=>s.id!==candidate.id),overrides).filter(s=>!s.cancelled);for(const a of own)for(const b of others)if(overlaps(a,b))return {date,session:b};}return null;}
export function qrStudentId(raw:string){if(/^S-[A-Za-z0-9-]+$/.test(raw))return raw;try{const data=JSON.parse(raw);return data.app==='classroom'&&data.v===1&&typeof data.id==='string'?data.id:null;}catch{return null;}}

// Legacy class records predate the explicit grade field.
export const classGrade=(c:ClassGroup)=>c.grade??(/^Grade (\d+)$/.exec(c.name)?.[1]||'');
export function canWrite(role:Role,entity:Entity,existing=false,value?:EntityMap[Entity]){
 const entities:Entity[]=['students','classes','schedules','overrides','attendance','fees','tutes','issues'];
 return entities.includes(entity)&&(role==='admin'||(role==='staff'&&!(entity==='students'&&(existing||(value as Student|undefined)?.removedAt!==undefined||(value as Student|undefined)?.removedBy!==undefined))));
}
export function validateClass(value:Pick<ClassGroup,'grade'|'name'|'fee'>):string|null{
 if(typeof value.grade!=='string'||! /^(?:[1-9]|1[0-3])$/.test(value.grade))return 'Choose a grade from 1 to 13.';
 if(typeof value.name!=='string'||!value.name.trim()||value.name.trim().length>100)return 'Class name must contain 1–100 characters.';
 if(typeof value.fee!=='number'||!Number.isFinite(value.fee)||value.fee<=0||value.fee>1000000||Math.abs(value.fee*100-Math.round(value.fee*100))>0.000001)return 'Monthly fee must be between LKR 0.01 and 1,000,000, with at most two decimal places.';
 return null;
}
export function sessionRoster(session:Session,students:Student[],attendance:Attendance[]){
 const marked=new Set(attendance.filter(a=>a.sessionId===session.id).map(a=>a.studentId));
 const rows=students.filter(s=>!s.removedAt&&(s.classId===session.classId||marked.has(s.id))).map(student=>({student,present:marked.has(student.id)}));
 return {rows,total:rows.length,present:rows.filter(r=>r.present).length,notMarked:rows.filter(r=>!r.present).length};
}

export const activeStudentsOnly=(students:Student[])=>students.filter(s=>!s.removedAt);
export function validateStudentRemoval(student:Student,previous:Student|undefined,role:Role,actor:string):string|null{
 const changed=student.removedAt!==previous?.removedAt||student.removedBy!==previous?.removedBy;
 if(changed&&role!=='admin')return 'Only admins can remove or restore a student.';
 if(student.removedAt===undefined&&student.removedBy===undefined)return null;
 if(typeof student.removedAt!=='string'||!Number.isFinite(Date.parse(student.removedAt))||new Date(student.removedAt).toISOString()!==student.removedAt||typeof student.removedBy!=='string'||!student.removedBy.trim())return 'Removal requires an ISO timestamp and the removing admin.';
 if(!previous)return 'Register the student before removing them.';
 if(changed&&student.removedBy!==actor)return 'Removal must identify the signed-in admin.';
 return null;
}
