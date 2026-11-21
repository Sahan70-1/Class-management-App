import { openDB } from 'idb';
import { canWrite,validateProfile,validateClass,validateStudentRemoval,recordId,type StoredRecord,type Operation,type Entity,type EntityMap,type History,type Role } from './model';
import {seedRecords} from './seed';
const database=openDB('classroom-v1',1,{upgrade(db){db.createObjectStore('records',{keyPath:'id'});db.createObjectStore('outbox',{keyPath:'id'});db.createObjectStore('meta');}});
export interface StoreState {accessMessage:string|null;records:StoredRecord[];pending:Operation[];history:History[];lastSync:string|null;role:Role;email:string;syncing:boolean;error:string|null;online:boolean;ready:boolean;conflicts:string[]}
let state:StoreState={accessMessage:null,records:[],pending:[],history:[],lastSync:null,role:'admin',email:'Tutor workspace',syncing:false,error:null,online:navigator.onLine,ready:false,conflicts:[]};
const listeners=new Set<()=>void>();
const publish=(patch:Partial<StoreState>)=>{state={...state,...patch};listeners.forEach(l=>l());};
export const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const getSnapshot=()=>state;
function lockWorkspace(message: string) {
  publish({accessMessage:message, records:[], history:[], pending:[], conflicts:[]});
}
let installationId: string;
async function getInstallationId(): Promise<string> {
  if (installationId) return installationId;
  const db = await database;
  // Serialize the first visit across tabs so one browser has one device entry.
  const tx = db.transaction('meta', 'readwrite');
  let id = await tx.store.get('installationId');
  if (typeof id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    id = crypto.randomUUID();
    await tx.store.put(id, 'installationId');
  }
  await tx.done;
  installationId = id;
  return installationId;
}

export async function initialize(){const db=await database;if(!await db.get('meta','initialized')){const tx=db.transaction(['records','meta'],'readwrite');for(const r of seedRecords())await tx.objectStore('records').put({...r,id:recordId(r.entity,r.key)});await tx.objectStore('meta').put(true,'initialized');await tx.done;}
 const accessMessage = await db.get('meta', 'accessMessage') || null;
 publish({accessMessage,records:accessMessage ? [] : await db.getAll('records'),pending:accessMessage ? [] : await db.getAll('outbox'),history:accessMessage ? [] : await db.get('meta','history')||[],lastSync:await db.get('meta','lastSync')||null,role:await db.get('meta','role')||'admin',email:await db.get('meta','email')||'Tutor workspace',ready:true});await sync();}
let lastOperationTime=0;
export async function mutate<K extends Entity>(entity:K,value:EntityMap[K],role:Role){if(state.accessMessage)throw Error(state.accessMessage);if(!canWrite(role,entity,state.records.some(r=>r.entity===entity&&r.key===value.id),value))throw Error('Your role does not allow this change.');if(entity==='profiles'){const error=validateProfile(value as EntityMap['profiles'],state.email);if(error)throw Error(error);}if(entity==='issues'){const lessonId=(value as EntityMap['issues']).tuteId;const tute=state.records.find(r=>r.entity==='tutes'&&r.key===lessonId)?.value as EntityMap['tutes']|undefined;if(tute?.deleted)throw Error('This tute has been deleted.');}if(entity==='classes'){const error=validateClass(value as EntityMap['classes']);if(error)throw Error(error);}if(entity==='students'){const previous=state.records.find(r=>r.entity==='students'&&r.key===value.id)?.value as EntityMap['students']|undefined;const error=validateStudentRemoval(value as EntityMap['students'],previous,role,state.email);if(error)throw Error(error);}if(['attendance','fees','issues'].includes(entity)){const studentId=(value as EntityMap['attendance']).studentId;const pupil=state.records.find(r=>r.entity==='students'&&r.key===studentId)?.value as EntityMap['students']|undefined;if(pupil?.removedAt)throw Error('This student has been removed.');}const db=await database;const key=value.id;const current=state.records.find(r=>r.entity===entity&&r.key===key);lastOperationTime=Math.max(Date.now(),lastOperationTime+1);const op:Operation={id:crypto.randomUUID(),entity,key,value,revision:(current?.revision||0)+1,baseRevision:current?.revision||0,at:new Date(lastOperationTime).toISOString(),actor:state.email};const tx=db.transaction(['records','outbox','meta'],'readwrite');
 const denied = await tx.objectStore('meta').get('accessMessage');
 if (denied) {
   await tx.done;
   lockWorkspace(denied);
   throw Error(denied);
 }
 await tx.objectStore('records').put({...op,id:recordId(entity,key)});await tx.objectStore('outbox').put(op);await tx.objectStore('meta').put(await tx.objectStore('records').count(),'cacheCount');await tx.done;publish({records:[...state.records.filter(r=>!(r.entity===entity&&r.key===key)),op],pending:[...state.pending,op]});void sync();}
let syncPromise:Promise<void>|null=null;
export function sync():Promise<void>{if(syncPromise)return syncPromise;syncPromise=performSync().finally(()=>{syncPromise=null;});return syncPromise;}
const entities=['students','classes','schedules','overrides','attendance','fees','tutes','issues','profiles'];
function validRecord(r:StoredRecord){return r&&entities.includes(r.entity)&&typeof r.key==='string'&&r.value?.id===r.key&&Number.isSafeInteger(r.revision)&&r.revision>0;}
async function performSync(){
 if(!navigator.onLine){publish({online:false});return;}
 publish({syncing:true,error:null,online:true});
 try{
  const db=await database;let loops=0;
  const deviceId = await getInstallationId();
  do{
   const pending:Operation[]=(await db.getAll('outbox')).sort((a,b)=>a.at.localeCompare(b.at));
   const cached:StoredRecord[]=await db.getAll('records');
   const savedSeq=await db.get('meta','lastSeq');
   const count=await db.get('meta','cacheCount');
   const healthy=cached.length>0&&cached.every(validRecord)&&count===cached.length&&Number.isSafeInteger(savedSeq)&&savedSeq>=0;
   const lastSeq=healthy && await db.get('meta','includesProfiles') ? savedSeq : 0;
   const batch = pending.slice(0, 100);
   const author = batch.find(op => op.actor?.includes('@'))?.actor;
   const operations = author ? batch.filter(op => !op.actor?.includes('@') || op.actor === author) : batch;
   const headers: Record<string,string> = {'Content-Type':'application/json', 'X-Classroom-Device': deviceId};
   if (author) headers['X-Classroom-Account'] = author;
   const response = await fetch('/api/sync', {
     method:'POST', headers, body:JSON.stringify({operations,lastSeq,includeProfiles:true}), signal:AbortSignal.timeout(18000),
   });
   if (!response.ok) {
     if (response.status === 403 || response.status === 409) {
       const reason = await response.json().catch(() => null);
       let message = '';
       if (reason?.code === 'NOT_A_WORKSPACE_MEMBER') message = 'This account does not have access to this workspace. Ask the tutor to add your email.';
       if (reason?.code === 'WORKSPACE_ACCOUNT_CHANGED') message = 'Sign in as ' + author + ' to sync changes saved by that account.';
       if (message) {
         await db.put('meta', message, 'accessMessage');
         lockWorkspace(message);
         throw Error(message);
       }
     }
     throw Error(response.status===401?'Sign in online to sync your saved records.':`Sync unavailable (${response.status}). Your changes are saved on this device.`);
   }
   const result=await response.json();
   if(!Number.isSafeInteger(result.lastSeq)||result.lastSeq<0||!Array.isArray(result.records)||!result.records.every(validRecord)||!Array.isArray(result.accepted)||!Array.isArray(result.conflicts))throw Error('Invalid sync response. Changes remain saved on this device.');
   const tx=db.transaction(['records','outbox','meta'],'readwrite');
   try{
    for(const id of result.accepted)await tx.objectStore('outbox').delete(id);
    const remaining:Operation[]=(await tx.objectStore('outbox').getAll()).sort((a,b)=>a.at.localeCompare(b.at));
    if(lastSeq===0||result.full)await tx.objectStore('records').clear();
    for(const r of result.records)await tx.objectStore('records').put({...r,id:recordId(r.entity,r.key)});
    for(const r of result.deleted||[])await tx.objectStore('records').delete(recordId(r.entity,r.key));
    for(const op of remaining)await tx.objectStore('records').put({...op,id:recordId(op.entity,op.key)});
    const now=result.conflicts.length?state.lastSync:new Date().toISOString();
    await tx.objectStore('meta').put(now,'lastSync');
    await tx.objectStore('meta').put(result.history,'history');
    await tx.objectStore('meta').delete('accessMessage');
    await tx.objectStore('meta').put(result.role,'role');
    await tx.objectStore('meta').put(result.email,'email');
    await tx.objectStore('meta').put(await tx.objectStore('records').count(),'cacheCount');
    await tx.objectStore('meta').put(true,'includesProfiles');
    await tx.objectStore('meta').put(result.lastSeq,'lastSeq');
    await tx.done;
    publish({accessMessage:null,records:await db.getAll('records'),pending:remaining,history:result.history,lastSync:now,role:result.role,email:result.email,conflicts:result.conflicts.map((c:{id:string;message:string})=>c.id+': '+c.message),error:result.conflicts.length?'Some changes need review. They remain saved on this device.':null});
   }catch(error){try{tx.abort();}catch{/* Already aborted. */}await tx.done.catch(()=>{});throw error;}
   if(result.conflicts.length)break;
  }while((await db.count('outbox'))>0&&++loops<20);
 }catch(error){publish({error:error instanceof Error?error.message:'Sync could not connect. Changes are safe on this device.'});}
 finally{publish({syncing:false});}
}
export async function discardConflict(id:string){const db=await database;const tx=db.transaction(['outbox','meta'],'readwrite');await tx.objectStore('outbox').delete(id);await tx.objectStore('meta').put(0,'lastSeq');await tx.done;publish({pending:await db.getAll('outbox'),conflicts:state.conflicts.filter(c=>!c.startsWith(id))});await sync();}
window.addEventListener('online',()=>void sync());window.addEventListener('offline',()=>publish({online:false}));setInterval(()=>{if(state.ready)void sync();},60000);
