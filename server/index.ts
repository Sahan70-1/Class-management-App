import {seedRecords} from '../src/seed';
import {values,sessionsFor,findConflict,overlaps,recordId,type StoredRecord,type Operation,type Role,type Entity,type Schedule,type Override} from '../src/model';
interface Env { DB:D1Database; ASSETS:Fetcher; LOCAL_DEMO?:string; INITIAL_ADMIN_EMAIL?:string }
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const validDate=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v));
const validTime=(v:unknown)=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
async function records(db:D1Database):Promise<StoredRecord[]>{const result=await db.prepare('SELECT entity, record_key AS key, value, revision FROM records').all();return result.results.map((r:any)=>({...r,value:JSON.parse(r.value)}));}
function validate(op:Operation,all:StoredRecord[],role:Role):string|null{
 if(!op||typeof op.id!=='string'||op.id.length>100||typeof op.key!=='string'||op.key.length>250||!op.value||op.key!==op.value.id||!Number.isInteger(op.baseRevision)||JSON.stringify(op.value).length>650000)return 'Invalid operation.';
 const allowed:Entity[]=role==='admin'?['students','classes','schedules','overrides','attendance','fees','tutes','issues']:role==='staff'?['attendance','fees','issues']:[];
 if(!allowed.includes(op.entity))return 'Your role does not allow this operation.';
 const v:any=op.value;
 if(op.entity==='students'){if(typeof v.name!=='string'||!v.name.trim()||v.name.length>100||!/^S-[A-Za-z0-9-]+$/.test(v.id)||!values(all,'classes').some(c=>c.id===v.classId))return 'Student name, stable ID and class are required.';if(v.photo&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v.photo))return 'Photo must be a JPEG, PNG or WebP image.';}
 if(op.entity==='classes'&&(!v.name?.trim()||typeof v.fee!=='number'||v.fee<=0))return 'Class name and monthly fee are required.';
 if(['attendance','fees','issues'].includes(op.entity)){
 const student=values(all,'students').find(s=>s.id===v.studentId);if(!student)return 'Student does not exist.';
 if(op.entity==='attendance'){const session=sessionsFor(v.date,values(all,'schedules'),values(all,'overrides')).find(s=>s.id===v.sessionId);if(!validDate(v.date)||!session||session.cancelled||session.classId!==student.classId||v.classId!==session.classId||v.id!==student.id+'@'+session.id)return 'Attendance needs an active session in the student’s class.';}
 if(op.entity==='fees'){const c=values(all,'classes').find(c=>c.id===v.classId);if(!c||student.classId!==c.id||!/^\d{4}-(0[1-9]|1[0-2])$/.test(v.month)||v.amount!==c.fee||v.id!==student.id+'@'+c.id+'@'+v.month||!['Cash','Bank transfer'].includes(v.method))return 'Payment must match the selected class monthly fee.';}
 if(op.entity==='issues'){const t=values(all,'tutes').find(t=>t.id===v.tuteId);if(!t||t.classId!==student.classId||v.id!==student.id+'@'+t.id)return 'Tute must belong to the student’s class.';}
 }
 if(op.entity==='tutes'&&(!v.title?.trim()||v.title.length>150||!values(all,'classes').some(c=>c.id===v.classId)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(v.month)||v.id!==v.classId+'@'+v.month))return 'Tute needs a class, month and lesson title.';
 if(op.entity==='schedules'){
 const s=v as Schedule;if(!values(all,'classes').some(c=>c.id===s.classId)||!Array.isArray(s.versions)||!s.versions.length||s.versions.length>200||s.versions.some(v=>!validDate(v.from)||v.until&&!validDate(v.until)||!validTime(v.start)||!validTime(v.end)||v.start>=v.end||!Number.isInteger(v.weekday)||v.weekday<0||v.weekday>6)||s.extraDate&&!validDate(s.extraDate))return 'Invalid class schedule.';
 for(let i=1;i<s.versions.length;i++)if(!s.versions[i-1].until||s.versions[i-1].until!>=s.versions[i].from)return 'Schedule versions must not overlap.';
 const conflict=findConflict(s,values(all,'schedules'),values(all,'overrides'));if(conflict)return 'Schedule overlaps another class on '+conflict.date+'. Choose a free time.';
 }
 if(op.entity==='overrides'){const o=v as Override;const schedule=values(all,'schedules').find(s=>s.id===o.scheduleId);if(!schedule||!validDate(o.date)||!validTime(o.start)||!validTime(o.end)||o.start>=o.end||typeof o.cancelled!=='boolean'||o.id!==o.scheduleId+'@'+o.date||!sessionsFor(o.date,[schedule],[]).length)return 'Invalid session change.';const busy=sessionsFor(o.date,values(all,'schedules'),values(all,'overrides')).filter(s=>s.scheduleId!==o.scheduleId&&!s.cancelled);if(!o.cancelled&&busy.some(s=>overlaps(s,o)))return 'This time overlaps another class.';}
 return null;
}
export default {async fetch(request:Request,env:Env):Promise<Response>{
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 if(request.method!=='GET'&&request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin.'},403);
 const email=(request.headers.get('oai-authenticated-user-email')||(env.LOCAL_DEMO==='true'?'tutor@local.demo':'')).toLowerCase();if(!email)return json({error:'Sign in with ChatGPT.'},401);
 try{
 let member=await env.DB.prepare('SELECT role FROM members WHERE email=?').bind(email).first<{role:Role}>();
 if(!member){const count=await env.DB.prepare('SELECT COUNT(*) AS count FROM members').first<{count:number}>();if(count?.count===0&&(env.LOCAL_DEMO==='true'||email===env.INITIAL_ADMIN_EMAIL?.toLowerCase())){await env.DB.prepare("INSERT OR IGNORE INTO members (email,role,created_at) SELECT ?, 'admin', ? WHERE NOT EXISTS (SELECT 1 FROM members)").bind(email,new Date().toISOString()).run();member=await env.DB.prepare('SELECT role FROM members WHERE email=?').bind(email).first<{role:Role}>();}}
 if(!member)return json({error:'Ask the tutor to add your email to this workspace.'},403);
 const role=member.role;
 if(url.pathname==='/api/members'){
 if(role!=='admin')return json({error:'Admin access required.'},403);
 if(request.method==='GET')return json((await env.DB.prepare('SELECT email,role FROM members ORDER BY email').all()).results);
 const body:any=await request.json();if(typeof body.email!=='string'||!/^\S+@\S+\.\S+$/.test(body.email)||!['staff','viewer','admin'].includes(body.role))return json({error:'Provide a valid email and role.'},400);
 if(body.email.toLowerCase()===email)return json({error:'You cannot change your own role.'},400);
 await env.DB.prepare('INSERT INTO members(email,role,created_at) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role').bind(body.email.toLowerCase(),body.role,new Date().toISOString()).run();return json({ok:true});
 }
 if(url.pathname!=='/api/sync'||request.method!=='POST')return json({error:'Not found.'},404);
 if(Number(request.headers.get('content-length'))>2500000)return json({error:'Request too large.'},413);
 const body:any=await request.json();if(!Array.isArray(body.operations)||body.operations.length>100)return json({error:'Invalid batch.'},400);
 const existing=await env.DB.prepare('SELECT COUNT(*) AS count FROM records').first<{count:number}>();if(!existing?.count&&role==='admin'){await env.DB.batch(seedRecords().map(r=>env.DB.prepare('INSERT OR IGNORE INTO records(entity,record_key,value,revision) VALUES(?,?,?,?)').bind(r.entity,r.key,JSON.stringify(r.value),r.revision)));}
 let all=await records(env.DB);const accepted:string[]=[],conflicts:{id:string;message:string}[]=[];
 for(const op of body.operations as Operation[]){
 const scheduleOperation=op.entity==='schedules'||op.entity==='overrides';
 const epoch=scheduleOperation?(await env.DB.prepare('SELECT revision FROM schedule_lock WHERE id=1').first<{revision:number}>())!.revision:0;
 if(scheduleOperation)all=await records(env.DB);
 const error=validate(op,all,role);if(error){conflicts.push({id:op?.id||'unknown',message:error});continue;}
 const duplicate=await env.DB.prepare('SELECT 1 FROM events WHERE operation_id=?').bind(op.id).first();if(duplicate){accepted.push(op.id);continue;}
 const current=all.find(r=>r.entity===op.entity&&r.key===op.key);
 if(['attendance','fees','issues'].includes(op.entity)&&current){accepted.push(op.id);continue;}
 if((current?.revision||0)!==op.baseRevision){conflicts.push({id:op.id,message:'A newer '+op.entity+' record was saved on another device. Review before reapplying.'});continue;}
 const at=new Date().toISOString();let description=op.entity==='schedules'?'Weekly timetable changed':op.entity==='overrides'?((op.value as Override).cancelled?'Class session cancelled':'Class session time changed'):op.entity==='attendance'?'Attendance marked':op.entity==='fees'?'Monthly fee recorded':op.entity==='issues'?'Tute issued':op.entity==='students'?'Student details saved':'Lesson title saved';
 if(op.entity==='schedules'){const s=op.value as Schedule;const v=s.versions.at(-1)!;const previous=(current?.value as Schedule|undefined)?.versions.at(-1);const name=values(all,'classes').find(c=>c.id===s.classId)?.name||s.classId;description=name+': '+(v.cancelled?'cancelled':v.start+'–'+v.end)+(s.extraDate?' on '+s.extraDate:' from '+v.from)+(previous?' (previously '+previous.start+'–'+previous.end+')':' · new '+(s.extraDate?'extra':'weekly')+' class');}
 if(op.entity==='overrides'){const o=op.value as Override;const prior=sessionsFor(o.date,values(all,'schedules'),values(all,'overrides')).find(s=>s.scheduleId===o.scheduleId);const name=values(all,'classes').find(c=>c.id===prior?.classId)?.name||o.scheduleId;description=name+' · '+o.date+' only: '+(o.cancelled?'cancelled':o.start+'–'+o.end)+(prior?' (previously '+prior.start+'–'+prior.end+')':'');}
 const payload=JSON.stringify(op.value);
 const result=await env.DB.batch([
 env.DB.prepare('INSERT OR IGNORE INTO events(operation_id,entity,record_key,at,actor,description,value) SELECT ?,?,?,?,?,?,? WHERE COALESCE((SELECT revision FROM records WHERE entity=? AND record_key=?),0)=? AND (?=0 OR (SELECT revision FROM schedule_lock WHERE id=1)=?)').bind(op.id,op.entity,op.key,at,email,description,payload,op.entity,op.key,op.baseRevision,scheduleOperation?1:0,epoch),
 env.DB.prepare('INSERT INTO records(entity,record_key,value,revision) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM events WHERE operation_id=?) ON CONFLICT(entity,record_key) DO UPDATE SET value=excluded.value,revision=excluded.revision').bind(op.entity,op.key,payload,op.baseRevision+1,op.id),
 env.DB.prepare('UPDATE schedule_lock SET revision=revision+1 WHERE id=1 AND ?=1 AND EXISTS(SELECT 1 FROM events WHERE operation_id=?)').bind(scheduleOperation?1:0,op.id)
 ]);
 if(!result[0].meta.changes){conflicts.push({id:op.id,message:'This record changed during sync. Review the newest version.'});continue;}
 accepted.push(op.id);all=[...all.filter(r=>recordId(r.entity,r.key)!==recordId(op.entity,op.key)),{entity:op.entity,key:op.key,value:op.value,revision:op.baseRevision+1}];
 }
 const history=(await env.DB.prepare('SELECT operation_id AS id,entity,record_key AS key,at,actor,description FROM events ORDER BY seq DESC LIMIT 200').all()).results;
 return json({accepted,conflicts,records:await records(env.DB),history,role,email});
 }catch(error){console.error('API error',error instanceof Error?error.message:'unknown');return json({error:'The server could not complete this request. Device changes remain queued.'},500);}
}};
