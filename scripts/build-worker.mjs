import { build } from 'esbuild';
import {readFile,readdir,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
// Embed the small app shell so the Worker is deployable without an asset binding.
const assets={};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
async function collect(dir){for(const file of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,file.name);if(file.isDirectory())await collect(full);else assets['/'+path.relative('dist/client',full).split(path.sep).join('/')]={body:await readFile(full,'utf8'),type:mime[path.extname(file.name)]||'application/octet-stream'};}}
await collect('dist/client');
await build({stdin:{contents:`import api from './server/index.ts';
const assets=${JSON.stringify(assets)};
export default {fetch(request,env,ctx){const url=new URL(request.url);if(url.pathname.startsWith('/api/'))return api.fetch(request,env,ctx);const asset=assets[url.pathname==='/'?'/index.html':url.pathname]||(request.headers.get('Accept')?.includes('text/html')?assets['/index.html']:null);if(!asset)return new Response('Not found',{status:404});return new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':url.pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff','Service-Worker-Allowed':'/'}});}};`,resolveDir:process.cwd(),sourcefile:'worker-entry.ts'},outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'neutral',target:'es2022'});
await mkdir('dist/.openai',{recursive:true});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
await mkdir('dist/migrations',{recursive:true});
for(const file of await readdir('migrations'))if(file.endsWith('.sql'))await copyFile('migrations/'+file,'dist/migrations/'+file);
