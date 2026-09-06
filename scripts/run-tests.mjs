import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const run=(args)=>{const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1)};
fs.mkdirSync('.test-build',{recursive:true});
fs.writeFileSync('.test-build/package.json',JSON.stringify({type:'commonjs'}));
run(['node_modules/typescript/bin/tsc','lib/game/data.ts','lib/game/engine.ts','--outDir','.test-build','--module','commonjs','--moduleResolution','node','--target','ES2022','--skipLibCheck','--types','node']);
run(['tests/engine.cjs']);
