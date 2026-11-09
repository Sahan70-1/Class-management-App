// Optional manual integration check: install playwright-core outside the app.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const contexts=await Promise.all([browser.newContext({viewport:{width:390,height:844}}),browser.newContext({viewport:{width:1440,height:1000}})]);
 const pages=await Promise.all(contexts.map(c=>c.newPage()));const errors=[];
 for(const p of pages)p.on('pageerror',e=>errors.push(e.message));
 await Promise.all(pages.map(p=>p.goto('http://127.0.0.1:8787')));
 for(const p of pages)await p.waitForFunction(()=>new Promise(resolve=>{const r=indexedDB.open('classroom-v1');r.onsuccess=()=>{const db=r.result,q=db.transaction('meta').objectStore('meta').get('lastSync');q.onsuccess=()=>{db.close();resolve(!!q.result);};};}));
 for(const p of pages)await p.getByRole('button',{name:'Manage tutes',exact:true}).click();
 const edit=async(p,title)=>{await p.getByLabel('Lesson title').fill(title);const response=p.waitForResponse(r=>r.url().endsWith('/api/sync')&&r.request().method()==='POST');await p.getByRole('button',{name:'Save lesson title',exact:true}).click();const result=await (await response).json();await p.waitForFunction(()=>new Promise(resolve=>{const r=indexedDB.open('classroom-v1');r.onsuccess=()=>{const db=r.result,q=db.transaction('outbox').objectStore('outbox').count();q.onsuccess=()=>{db.close();resolve(q.result===0);};};}));return result;};
 // Establish nonzero cursors even against a freshly seeded database.
 const warm=await edit(pages[0],'Browser baseline '+Date.now());
 await pages[1].evaluate(()=>window.dispatchEvent(new Event('online')));
 await pages[1].waitForFunction(()=>new Promise(resolve=>{const r=indexedDB.open('classroom-v1');r.onsuccess=()=>{const db=r.result,q=db.transaction('meta').objectStore('meta').get('lastSeq');q.onsuccess=()=>{db.close();resolve(q.result>0);};};}));
 const titleA='Two browser check A '+Date.now();const first=await edit(pages[0],titleA);assert.equal(first.conflicts.length,0);
 const pull=async p=>{const wait=p.waitForResponse(r=>r.url().endsWith('/api/sync'));await p.evaluate(()=>window.dispatchEvent(new Event('online')));return (await wait).json();};
 const delta=await pull(pages[1]);assert.equal(delta.records.length,1);await pages[1].getByLabel('Lesson title').filter({visible:true}).waitFor();await pages[1].waitForFunction(t=>document.querySelector('input[placeholder="e.g. Perimeter & area"]')?.value===t,titleA);
 const titleB='Two browser check B '+Date.now();await edit(pages[1],titleB);await pull(pages[0]);await pages[0].waitForFunction(t=>document.querySelector('input[placeholder="e.g. Perimeter & area"]')?.value===t,titleB);
 const idle=await pull(pages[0]);assert.equal(idle.records.length,0);
 const read=p=>p.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('classroom-v1');r.onsuccess=()=>{const db=r.result;const q=db.transaction('records').objectStore('records').getAll();q.onsuccess=()=>{db.close();resolve(q.result.map(({id,entity,key,value,revision})=>({id,entity,key,value,revision})).sort((a,b)=>a.id.localeCompare(b.id)));};q.onerror=()=>reject(q.error);};}));
 assert.deepEqual(await read(pages[0]),await read(pages[1]));assert.deepEqual(errors,[]);
 await pages[0].screenshot({path:'work/sync-mobile.png',fullPage:true});await pages[1].screenshot({path:'work/sync-desktop.png',fullPage:true});
 console.log('PASS: two isolated Chromium sessions, mobile/desktop, UI changes both directions, one-record delta, idle delta empty, identical IndexedDB caches, no page errors.');
}finally{await browser.close();}
