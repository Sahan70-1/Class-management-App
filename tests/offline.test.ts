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
 await assert.rejects(()=>store.mutate('tutes',{id:'grade-9@'+day.slice(0,7),classId:'grade-9',month:day.slice(0,7),title:'Changed title'},'viewer'),/role/);

 (navigator as any).onLine=false;
 await store.mutate('classes',{id:'staff-class',grade:'8',name:'Afternoon maths',fee:1200,subject:'Maths',room:'Main',color:'teal'},'staff');
 const seededStudent=seedRecords().find(r=>r.entity==='students')!.value as any;
 await store.mutate('students',{...seededStudent,id:'S-STAFF',classId:'staff-class'},'staff');
 await store.mutate('schedules',{id:'staff-schedule',classId:'staff-class',versions:[{from:day,weekday:1,start:'08:00',end:'10:00'}]},'staff');
 await store.mutate('overrides',{id:'staff-schedule@'+day,scheduleId:'staff-schedule',date:day,start:'09:00',end:'11:00',cancelled:false},'staff');
 await store.mutate('tutes',{id:'staff-class@'+day.slice(0,7),classId:'staff-class',month:day.slice(0,7),title:'New lesson'},'staff');
 assert.equal(await db.count('outbox'),5);
 assert.equal((await db.get('records','classes:staff-class')).value.grade,'8');
 const pending=await db.getAll('outbox');assert.equal(pending.every(o=>o.actor==='staff@example.com'),true);
 await assert.rejects(()=>store.mutate('classes',{id:'bad-class',grade:'8',name:'Bad fee',fee:-1,subject:'Maths',room:'Main',color:'teal'},'staff'),/fee/);
 await assert.rejects(()=>store.mutate('students',{...seededStudent,id:'S-STAFF',classId:'staff-class'},'staff'),/role/);
 (navigator as any).onLine=true;await store.sync();assert.equal(await db.count('outbox'),0);

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

 // Offline removal stays durable and returns through the ordinary incremental merge.
 respond([],5,{role:'admin',email:'tutor@local.demo'});await store.sync();
 (navigator as any).onLine=false;
 const pupil=await db.get('records','students:S-00002');
 const removed={...pupil.value,removedAt:new Date().toISOString(),removedBy:'tutor@local.demo'};
 for(const role of ['staff','viewer'] as const)await assert.rejects(()=>store.mutate('students',removed,role),/role/);
 const history=(await db.getAll('records')).filter(r=>['attendance','fees','issues'].includes(r.entity));
 await store.mutate('students',removed,'admin');assert.equal(await db.count('outbox'),1);assert.equal((await db.get('records','students:S-00002')).value.removedAt,removed.removedAt);
 await store.initialize();assert.ok((store.getSnapshot().records.find(r=>r.key==='S-00002')!.value as any).removedAt);
 await assert.rejects(()=>store.mutate('attendance',{...attendance,id:'new',studentId:'S-00002'},'admin'),/removed/);
 const removal=(await db.getAll('outbox'))[0];respond([{entity:'students',key:removed.id,value:removed,revision:pupil.revision+1}],6,{accepted:[removal.id],role:'admin',email:'tutor@local.demo'});
 (navigator as any).onLine=true;await store.sync();assert.equal(sent.lastSeq,5);assert.equal(sent.operations.length,1);assert.equal(await db.count('outbox'),0);assert.equal(await db.get('meta','lastSeq'),6);
 assert.deepEqual((await db.getAll('records')).filter(r=>['attendance','fees','issues'].includes(r.entity)),history);
 db.close();globalThis.setInterval=interval;
});
