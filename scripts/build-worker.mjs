import { build } from 'esbuild';
await build({entryPoints:['server/index.ts'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'neutral',target:'es2022'});
