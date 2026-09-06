import {spawnSync} from 'node:child_process';
for(const args of [['node_modules/vite/bin/vite.js','build','--config','vite.offline.config.ts'],['scripts/package-offline.mjs']]){const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1)}
