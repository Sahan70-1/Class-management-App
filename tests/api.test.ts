import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {todayISO,type Operation} from '../src/model';
test('sync persists independent actions, retries safely, protects roles, and rejects schedule conflicts',async()=>{
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:'dist/server/index.js',compatibilityDate:'2026-10-01',d1Databases:['DB'],bindings:{LOCAL_DEMO:'true'}}));
 try{
 const db=await mf.getD1Database('DB');const journal=JSON.parse(await readFile('drizzle/meta/_journal.json','utf8'));for(const entry of journal.entries){const sql=await readFile('drizzle/'+entry.tag+'.sql','utf8');await db.batch(sql.split('--> statement-breakpoint').map((statement:string)=>db.prepare(statement.trim())).filter(Boolean));}
 const request=async(path:string,body:unknown,email='tutor@local.demo')=>{const response=await mf.dispatchFetch('http://localhost'+path,{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-email':email},body:JSON.stringify(body)});return {status:response.status,body:await response.json() as any};};
 let snapshot=(await request('/api/sync',{operations:[]})).body;
 assert.equal((await mf.dispatchFetch('http://localhost/')).status,200);const zip=new Uint8Array(await (await mf.dispatchFetch('http://localhost/classroom-source.zip')).arrayBuffer());assert.equal(String.fromCharCode(...zip.slice(0,2)),'PK');assert.equal(snapshot.role,'admin');assert.equal(snapshot.records.filter((r:any)=>r.entity==='students').length,12);
 const today=todayISO();const attendance={id:'S-00001@weekly-9@'+today,studentId:'S-00001',sessionId:'weekly-9@'+today,classId:'grade-9',date:today,at:new Date().toISOString()};
 const operation:Operation={id:crypto.randomUUID(),entity:'attendance',key:attendance.id,value:attendance,revision:1,baseRevision:0,at:new Date().toISOString(),actor:'untrusted actor'};
 snapshot=(await request('/api/sync',{operations:[operation]})).body;
 assert.deepEqual(snapshot.accepted,[operation.id]);assert.equal(snapshot.conflicts.length,0);
 assert.equal(snapshot.records.filter((r:any)=>r.entity==='attendance'&&r.value.studentId==='S-00001').length,1);
 assert.equal(snapshot.records.some((r:any)=>r.entity==='fees'&&r.value.studentId==='S-00001'),false);
 assert.equal(snapshot.records.some((r:any)=>r.entity==='issues'&&r.value.studentId==='S-00001'),false);
 assert.equal(snapshot.history[0].actor,'tutor@local.demo');
 snapshot=(await request('/api/sync',{operations:[operation]})).body;
 assert.deepEqual(snapshot.accepted,[operation.id]);assert.equal(snapshot.records.filter((r:any)=>r.entity==='attendance'&&r.value.studentId==='S-00001').length,1);
 const secondScan={...operation,id:crypto.randomUUID()};snapshot=(await request('/api/sync',{operations:[secondScan]})).body;
 assert.deepEqual(snapshot.accepted,[secondScan.id]);assert.equal(snapshot.history.filter((h:any)=>h.entity==='attendance').length,1);
 assert.equal((await request('/api/members',{email:'viewer@example.com',role:'viewer'})).status,200);
 snapshot=(await request('/api/sync',{operations:[{...operation,id:crypto.randomUUID()}]},'viewer@example.com')).body;
 assert.equal(snapshot.accepted.length,0);assert.equal(snapshot.conflicts.length,1);assert.equal(snapshot.role,'viewer');
 assert.equal((await request('/api/members',{email:'outsider@example.com',role:'admin'},'viewer@example.com')).status,403);
 assert.equal((await request('/api/sync',{operations:[]},'outsider@example.com')).status,403);
 const schedule=snapshot.records.find((r:any)=>r.entity==='schedules'&&r.key==='weekly-11');const updated=structuredClone(schedule.value);updated.versions[0].start='15:00';updated.versions[0].end='17:00';
 const edit={...operation,id:crypto.randomUUID(),entity:'schedules',key:schedule.key,value:updated,baseRevision:schedule.revision};
 snapshot=(await request('/api/sync',{operations:[edit]})).body;assert.equal(snapshot.conflicts.length,1);assert.match(snapshot.conflicts[0].message,/overlap/);
 updated.versions[0].start='18:30';updated.versions[0].end='20:00';snapshot=(await request('/api/sync',{operations:[{...edit,id:crypto.randomUUID()}]})).body;
 assert.equal(snapshot.conflicts.length,0);assert.equal(snapshot.records.find((r:any)=>r.entity==='schedules'&&r.key===schedule.key).revision,2);
 snapshot=(await request('/api/sync',{operations:[{...edit,id:crypto.randomUUID()}]})).body;
 assert.equal(snapshot.conflicts.length,1);assert.match(snapshot.conflicts[0].message,/newer/);

 // Separate devices start from a complete snapshot, then consume only changed keys.
 const initial=(await request('/api/sync',{operations:[],lastSeq:0})).body;
 assert.equal(initial.full,true);assert.ok(initial.records.length>12);
 const cursor=initial.lastSeq;
 const idle=(await request('/api/sync',{operations:[],lastSeq:cursor})).body;
 assert.deepEqual(idle.records,[]);assert.equal(idle.lastSeq,cursor);
 const pupil=initial.records.find((r:any)=>r.entity==='students');
 const change={...operation,id:crypto.randomUUID(),entity:'students',key:pupil.key,value:{...pupil.value,name:'Updated on device A'},baseRevision:pupil.revision};
 const changed=(await request('/api/sync',{operations:[change],lastSeq:cursor})).body;
 assert.deepEqual(changed.records.map((r:any)=>r.key),[pupil.key]);assert.ok(changed.lastSeq>cursor);
 const replay=(await request('/api/sync',{operations:[change],lastSeq:changed.lastSeq})).body;
 assert.deepEqual(replay.accepted,[change.id]);assert.deepEqual(replay.records,[]);assert.equal(replay.lastSeq,changed.lastSeq);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM events WHERE operation_id=?').bind(change.id).first() as any).n,1);
 const deviceB=(await request('/api/sync',{operations:[],lastSeq:cursor})).body;
 assert.deepEqual(deviceB.records,changed.records);
 // Concurrent changes to different records converge, including a replacement of an existing value.
 const pupils=initial.records.filter((r:any)=>r.entity==='students').slice(1,3);
 await Promise.all(pupils.map((r:any)=>request('/api/sync',{operations:[{...change,id:crypto.randomUUID(),key:r.key,value:{...r.value,name:'Concurrent '+r.key},baseRevision:r.revision}],lastSeq:changed.lastSeq})));
 const a=(await request('/api/sync',{operations:[],lastSeq:changed.lastSeq})).body;
 const b=(await request('/api/sync',{operations:[],lastSeq:deviceB.lastSeq})).body;
 assert.deepEqual(a.records,b.records);assert.equal(a.lastSeq,b.lastSeq);assert.equal(a.records.length,2);
 // Deletes are not exposed by the API, but an event-backed removal is a tombstone.
 await db.batch([db.prepare("INSERT INTO events(operation_id,entity,record_key,at,actor,description,value) VALUES(?,?,?,?,?,?,?)").bind(crypto.randomUUID(),'students',pupil.key,new Date().toISOString(),'tutor@local.demo','Removed','null'),db.prepare('DELETE FROM records WHERE entity=? AND record_key=?').bind('students',pupil.key)]);
 const removed=(await request('/api/sync',{operations:[],lastSeq:a.lastSeq})).body;
 assert.deepEqual(removed.records,[]);assert.deepEqual(removed.deleted,[{entity:'students',key:pupil.key}]);
 const reset=(await request('/api/sync',{operations:[],lastSeq:removed.lastSeq+100})).body;
 assert.equal(reset.full,true);assert.equal(reset.records.some((r:any)=>r.key===pupil.key),false);
 assert.equal((await request('/api/sync',{operations:[],lastSeq:-1})).status,400);
 {
 assert.equal((await request('/api/members',{email:'staff@example.com',role:'staff'})).status,200);
 const staff='staff@example.com';
 assert.equal((await request('/api/members',{email:'intruder@example.com',role:'admin'},staff)).status,403);
 const op=(entity:string,value:any,baseRevision=0)=>({...operation,id:crypto.randomUUID(),entity,key:value.id,value,baseRevision});
 const group={id:'new-class',grade:'8',name:'Evening mathematics',fee:1500.50,subject:'Mathematics',room:'Main classroom',color:'teal'};
 const pupil={...snapshot.records.find((r:any)=>r.entity==='students').value,id:'S-STAFF',grade:'8',classId:group.id};
 const scheduleValue={id:'new-schedule',classId:group.id,extraDate:today,versions:[{from:today,weekday:0,start:'08:00',end:'10:00'}]};
 const lesson={id:group.id+'@'+today.slice(0,7),classId:group.id,month:today.slice(0,7),title:'Fractions'};
 const registration=op('students',pupil);
 const batch=[op('classes',group),registration,op('schedules',scheduleValue),op('tutes',lesson)];
 snapshot=(await request('/api/sync',{operations:batch},staff)).body;
 assert.equal(snapshot.conflicts.length,0);assert.equal(snapshot.accepted.length,4);
 assert.equal(snapshot.records.find((r:any)=>r.key===group.id).value.grade,'8');
 const retry=(await request('/api/sync',{operations:[registration]},staff)).body;assert.equal(retry.accepted.length,1);
 const editStudent=(await request('/api/sync',{operations:[op('students',{...pupil,name:'Changed'},1)]},staff)).body;assert.match(editStudent.conflicts[0].message,/role/);
 const edited=[op('classes',{...group,name:'Evening maths',fee:2000},1),op('tutes',{...lesson,title:'Fractions and ratios'},1),op('overrides',{id:scheduleValue.id+'@'+today,scheduleId:scheduleValue.id,date:today,start:'10:00',end:'12:00',cancelled:false})];
 snapshot=(await request('/api/sync',{operations:edited},staff)).body;assert.equal(snapshot.conflicts.length,0);assert.equal(snapshot.accepted.length,3);
 const conflict=(await request('/api/sync',{operations:[op('overrides',{...edited[2].value,start:'14:00',end:'16:00'},1)]},staff)).body;assert.match(conflict.conflicts[0].message,/overlap/);
 const stale=(await request('/api/sync',{operations:[op('classes',{...group,name:'Stale'},1)]},staff)).body;assert.match(stale.conflicts[0].message,/newer/);
 for(const fields of [{grade:''},{grade:'14'},{name:'   '},{name:'x'.repeat(101)},{fee:-1},{fee:0},{fee:1.001},{fee:1000001},{fee:'2000'}]){
  const result=(await request('/api/sync',{operations:[op('classes',{...group,...fields,id:crypto.randomUUID()})]},staff)).body;assert.equal(result.accepted.length,0);assert.equal(result.conflicts.length,1);
 }
 const viewer=(await request('/api/sync',{operations:batch.map(o=>({...o,id:crypto.randomUUID()}))},'viewer@example.com')).body;assert.equal(viewer.accepted.length,0);assert.equal(viewer.conflicts.length,4);
 }
 }finally{await mf.dispose();}
});
