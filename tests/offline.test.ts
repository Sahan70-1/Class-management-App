import {test} from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {openDB} from 'idb';
import {seedRecords} from '../src/seed';
import {todayISO,type Operation} from '../src/model';
test('offline action is durable, independent, retained on failure, and acknowledged only after sync',async()=>{
 const browser=new EventTarget();Object.defineProperty(globalThis,'window',{value:browser,configurable:true});Object.defineProperty(globalThis,'navigator',{value:{onLine:false},configurable:true});
 const interval=globalThis.setInterval;globalThis.setInterval=((...args:any[])=>{const timer=(interval as any)(...args);timer.unref();return timer;}) as typeof setInterval;
 const store=await import('../src/store');await store.initialize();const day=todayISO();
 const attendance={id:'S-00001@weekly-9@'+day,studentId:'S-00001',sessionId:'weekly-9@'+day,classId:'grade-9',date:day,at:new Date().toISOString()};
 await store.mutate('attendance',attendance,'staff');await store.sync();
 const db=await openDB('classroom-v1',1);assert.equal(await db.count('outbox'),1);assert.equal((await db.get('records','attendance:'+attendance.id)).value.studentId,'S-00001');
 assert.equal(store.getSnapshot().records.some(r=>r.entity==='fees'&&(r.value as any).studentId==='S-00001'),false);assert.equal(store.getSnapshot().records.some(r=>r.entity==='issues'&&(r.value as any).studentId==='S-00001'),false);
 (navigator as any).onLine=true;globalThis.fetch=async()=>{throw Error('Network interrupted');};await store.sync();assert.equal(await db.count('outbox'),1);assert.equal(store.getSnapshot().lastSync,null);
 globalThis.fetch=async(_input,init)=>{const {operations}=JSON.parse(init!.body as string) as {operations:Operation[]};return Response.json({accepted:operations.map(o=>o.id),conflicts:[],records:[...seedRecords(),...operations],lastSeq:1,full:true,history:[],role:'staff',email:'staff@example.com'});};
 await store.sync();assert.equal(await db.count('outbox'),0);assert.equal(store.getSnapshot().pending.length,0);assert.ok(store.getSnapshot().lastSync);assert.equal(store.getSnapshot().role,'staff');
 await assert.rejects(()=>store.mutate('tutes',{id:'grade-9@'+day.slice(0,7),classId:'grade-9',month:day.slice(0,7),title:'Changed title'},'staff'),/role/);

 assert.equal(await db.get('meta','lastSeq'),1);
 const original=await db.getAll('records');const target=original.find(r=>r.entity==='students');
 let sent:any;
 const respond=(records:any[],lastSeq:number,extra:any={})=>{globalThis.fetch=async(_input,init)=>{sent=JSON.parse(init!.body as string);return Response.json({accepted:[],conflicts:[],records,lastSeq,history:[],role:'staff',email:'staff@example.com',...extra});};};
 respond([{...target,revision:target.revision+1,value:{...target.value,name:'Other device'}}],2);
 await store.sync();assert.equal(sent.lastSeq,1);assert.equal(await db.count('records'),original.length);assert.equal((await db.get('records',target.id)).value.name,'Other device');assert.equal(await db.get('meta','lastSeq'),2);
 respond([],2);await store.sync();assert.equal(sent.lastSeq,2);assert.equal(await db.count('records'),original.length);
 respond([],3,{deleted:[{entity:target.entity,key:target.key}]});await store.sync();assert.equal(await db.get('records',target.id),undefined);
 // Cache loss or corruption forces an authoritative full refresh.
 await db.clear('records');respond(seedRecords(),4,{full:true});await store.sync();assert.equal(sent.lastSeq,0);assert.equal(await db.count('records'),seedRecords().length);
 await db.delete('records','students:S-00001');respond(seedRecords(),4,{full:true});await store.sync();assert.equal(sent.lastSeq,0);assert.ok(await db.get('records','students:S-00001'));
 const broken=await db.get('records','students:S-00001');await db.put('records',{...broken,value:null});await store.sync();assert.equal(sent.lastSeq,0);
 // Invalid responses never acknowledge operations or advance the cursor.
 respond([{entity:'students',key:'bad',value:null,revision:1}],5);await store.sync();assert.equal(await db.get('meta','lastSeq'),4);assert.match(store.getSnapshot().error!,/Invalid sync/);
 // Discarding an optimistic conflict restores the server value even without a new event.
 (navigator as any).onLine=false;
 const latest=await db.get('records','students:S-00001');await store.mutate('students',{...latest.value,name:'Optimistic'},'admin');
 const queued=(await db.getAll('outbox'))[0];
 (navigator as any).onLine=true;
 respond([],5,{conflicts:[{id:queued.id,message:'Newer record'}]});await store.sync();assert.equal((await db.get('records','students:S-00001')).value.name,'Optimistic');assert.equal(await db.count('outbox'),1);
 respond(seedRecords(),5,{full:true});await store.discardConflict(queued.id);assert.equal(sent.lastSeq,0);assert.equal(await db.count('outbox'),0);assert.equal((await db.get('records','students:S-00001')).value.name,latest.value.name);
 db.close();globalThis.setInterval=interval;
});
