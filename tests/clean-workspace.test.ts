import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';

test('live workspace starts empty, isolates old writes, and syncs the first new class', async () => {
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules:true, scriptPath:'dist/server/index.js', compatibilityDate:'2026-10-01',
    d1Databases:['DB'], bindings:{INITIAL_ADMIN_EMAIL:'owner@example.com'},
  }));
  try {
    const db = await mf.getD1Database('DB');
    const journal = JSON.parse(await readFile('drizzle/meta/_journal.json','utf8'));
    for (const {tag} of journal.entries) {
      const sql = await readFile('drizzle/' + tag + '.sql','utf8');
      await db.batch(sql.split('--> statement-breakpoint').map(s => db.prepare(s.trim())));
    }
    await db.prepare("INSERT INTO records VALUES ('students','sample','{}',1)").run();
    const sync = (body:object) => mf.dispatchFetch('http://localhost/api/sync',{
      method:'POST', headers:{'Content-Type':'application/json','oai-authenticated-user-email':'owner@example.com'},body:JSON.stringify(body),
    });
    const base = {workspaceVersion:2,operations:[],includeProfiles:true};
    assert.equal((await sync({operations:[]})).status,409);
    const first:any = await (await sync(base)).json();
    assert.deepEqual(first.records,[]);assert.deepEqual(first.history,[]);assert.equal(first.role,'admin');
    const group={id:'first',grade:'8',name:'First class',fee:1000,subject:'Maths',room:'',color:'teal'};
    const operation={entity:'classes',id:crypto.randomUUID(),key:group.id,baseRevision:0,value:group};
    const result:any = await (await sync({...base,operations:[operation]})).json();
    assert.deepEqual(result.accepted,[operation.id]);
    const second:any = await (await sync(base)).json();
    assert.deepEqual(second.records.map((r:any)=>r.key),['first']);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM records").first<any>()).n,1);
  } finally {await mf.dispose();}
});
