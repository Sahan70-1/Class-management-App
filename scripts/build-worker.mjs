import { build } from 'esbuild';
import {readFile,readdir,mkdir,copyFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
// Embed the small app shell so the Worker is deployable without an asset binding.
const assets={};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png'};
async function collect(dir){for(const file of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,file.name);if(file.isDirectory())await collect(full);else {const binary=path.extname(file.name)==='.png';assets['/'+path.relative('dist/client',full).split(path.sep).join('/')]={body:await readFile(full,binary?'base64':'utf8'),binary,type:mime[path.extname(file.name)]||'application/octet-stream'};}}}
await collect('dist/client');
assets['/classroom-source.zip']={body:execFileSync('git',['archive','--format=zip','HEAD'],{maxBuffer:5000000}).toString('base64'),binary:true,type:'application/zip'};
await build({stdin:{contents:`import api from './server/index.ts';
const assets=${JSON.stringify(assets)};
export default {fetch(request,env,ctx){const url=new URL(request.url);if(url.pathname.startsWith('/api/'))return api.fetch(request,env,ctx);const asset=assets[url.pathname==='/'?'/index.html':url.pathname]||(request.headers.get('Accept')?.includes('text/html')?assets['/index.html']:null);if(!asset)return new Response('Not found',{status:404});return new Response(request.method==='HEAD'?null:asset.binary?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':url.pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff','Service-Worker-Allowed':'/'}});}};`,resolveDir:process.cwd(),sourcefile:'worker-entry.ts'},outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'neutral',target:'es2022'});
await mkdir('dist/.openai',{recursive:true});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
await rm('dist/migrations',{recursive:true,force:true});
await mkdir('dist/drizzle/meta',{recursive:true});
for(const file of await readdir('drizzle'))if(file.endsWith('.sql'))await copyFile('drizzle/'+file,'dist/drizzle/'+file);
await copyFile('drizzle/meta/_journal.json','dist/drizzle/meta/_journal.json');
