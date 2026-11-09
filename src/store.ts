import { openDB } from 'idb';
import { recordId,type StoredRecord,type Operation,type Entity,type EntityMap,type History,type Role } from './model';
import {seedRecords} from './seed';
const database=openDB('classroom-v1',1,{upgrade(db){db.createObjectStore('records',{keyPath:'id'});db.createObjectStore('outbox',{keyPath:'id'});db.createObjectStore('meta');}});
export interface StoreState {records:StoredRecord[];pending:Operation[];history:History[];lastSync:string|null;role:Role;email:string;syncing:boolean;error:string|null;online:boolean;ready:boolean;conflicts:string[]}
let state:StoreState={records:[],pending:[],history:[],lastSync:null,role:'admin',email:'Tutor workspace',syncing:false,error:null,online:navigator.onLine,ready:false,conflicts:[]};
const listeners=new Set<()=>void>();
const publish=(patch:Partial<StoreState>)=>{state={...state,...patch};listeners.forEach(l=>l());};
export const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const getSnapshot=()=>state;
export async function initialize(){const db=await database;if(!await db.get('meta','initialized')){const tx=db.transaction(['records','meta'],'readwrite');for(const r of seedRecords())await tx.objectStore('records').put({...r,id:recordId(r.entity,r.key)});await tx.objectStore('meta').put(true,'initialized');await tx.done;}publish({records:await db.getAll('records'),pending:await db.getAll('outbox'),history:await db.get('meta','history')||[],lastSync:await db.get('meta','lastSync')||null,role:await db.get('meta','role')||'admin',email:await db.get('meta','email')||'Tutor workspace',ready:true});await sync();}
let lastOperationTime=0;
export async function mutate<K extends Entity>(entity:K,value:EntityMap[K],role:Role){if(role==='viewer'||(role==='staff'&&!['attendance','fees','issues'].includes(entity)))throw Error('Your role does not allow this change.');const db=await database;const key=value.id;const current=state.records.find(r=>r.entity===entity&&r.key===key);lastOperationTime=Math.max(Date.now(),lastOperationTime+1);const op:Operation={id:crypto.randomUUID(),entity,key,value,revision:(current?.revision||0)+1,baseRevision:current?.revision||0,at:new Date(lastOperationTime).toISOString(),actor:state.email};const tx=db.transaction(['records','outbox','meta'],'readwrite');await tx.objectStore('records').put({...op,id:recordId(entity,key)});await tx.objectStore('outbox').put(op);await tx.objectStore('meta').put(await tx.objectStore('records').count(),'cacheCount');await tx.done;publish({records:[...state.records.filter(r=>!(r.entity===entity&&r.key===key)),op],pending:[...state.pending,op]});void sync();}
let syncPromise:Promise<void>|null=null;
export function sync():Promise<void>{if(syncPromise)return syncPromise;syncPromise=performSync().finally(()=>{syncPromise=null;});return syncPromise;}
const entities=['students','classes','schedules','overrides','attendance','fees','tutes','issues'];
function validRecord(r:StoredRecord){return r&&entities.includes(r.entity)&&typeof r.key==='string'&&r.value?.id===r.key&&Number.isSafeInteger(r.revision)&&r.revision>0;}
async function performSync(){
 if(!navigator.onLine){publish({online:false});return;}
 publish({syncing:true,error:null,online:true});
 try{
  const db=await database;let loops=0;
  do{
   const pending:Operation[]=(await db.getAll('outbox')).sort((a,b)=>a.at.localeCompare(b.at));
   const cached:StoredRecord[]=await db.getAll('records');
   const savedSeq=await db.get('meta','lastSeq');
   const count=await db.get('meta','cacheCount');
   const healthy=cached.length>0&&cached.every(validRecord)&&count===cached.length&&Number.isSafeInteger(savedSeq)&&savedSeq>=0;
   const lastSeq=healthy?savedSeq:0;
   const response=await fetch('/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operations:pending.slice(0,100),lastSeq}),signal:AbortSignal.timeout(18000)});
   if(!response.ok)throw Error(response.status===401?'Sign in online to sync your saved records.':`Sync unavailable (${response.status}). Your changes are saved on this device.`);
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
    await tx.objectStore('meta').put(result.role,'role');
    await tx.objectStore('meta').put(result.email,'email');
    await tx.objectStore('meta').put(await tx.objectStore('records').count(),'cacheCount');
    await tx.objectStore('meta').put(result.lastSeq,'lastSeq');
    await tx.done;
    publish({records:await db.getAll('records'),pending:remaining,history:result.history,lastSync:now,role:result.role,email:result.email,conflicts:result.conflicts.map((c:{id:string;message:string})=>c.id+': '+c.message),error:result.conflicts.length?'Some changes need review. They remain saved on this device.':null});
   }catch(error){try{tx.abort();}catch{/* Already aborted. */}await tx.done.catch(()=>{});throw error;}
   if(result.conflicts.length)break;
  }while((await db.count('outbox'))>0&&++loops<20);
 }catch(error){publish({error:error instanceof Error?error.message:'Sync could not connect. Changes are safe on this device.'});}
 finally{publish({syncing:false});}
}
export async function discardConflict(id:string){const db=await database;const tx=db.transaction(['outbox','meta'],'readwrite');await tx.objectStore('outbox').delete(id);await tx.objectStore('meta').put(0,'lastSeq');await tx.done;publish({pending:await db.getAll('outbox'),conflicts:state.conflicts.filter(c=>!c.startsWith(id))});await sync();}
window.addEventListener('online',()=>void sync());window.addEventListener('offline',()=>publish({online:false}));setInterval(()=>{if(state.ready)void sync();},60000);
