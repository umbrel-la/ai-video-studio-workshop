/** Install pinned local handwriting dependencies; no global skills or accounts. */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {sha256} from './motion-catalog.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const local=path.join(root,'.local/motion-v2'),check=process.argv.includes('--check');
if(process.argv.slice(2).some(arg=>arg!=='--check'))throw new Error('Usage: node scripts/setup-motion-v2.mjs [--check]');
const inputs=['tools/motion-runtime/package.json','tools/motion-runtime/package-lock.json','motion/v2/tegaki-entry.mjs'];
const signature=sha256(Buffer.concat(inputs.map(name=>fs.readFileSync(path.join(root,name)))));
const bundle=path.join(local,'tegaki-browser.js'),state=path.join(local,'build.json');
function ready(){try{const info=JSON.parse(fs.readFileSync(state,'utf8'));return info.inputs===signature&&sha256(fs.readFileSync(bundle))===info.bundle;}catch{return false;}}
if(!check&&!ready()){
  fs.mkdirSync(local,{recursive:true});
  for(const name of ['package.json','package-lock.json']){
    const source=path.join(root,'tools/motion-runtime',name),target=path.join(local,name);
    if(fs.existsSync(target)&&!fs.readFileSync(source).equals(fs.readFileSync(target)))throw new Error('Local dependency manifest differs; preserve it before changing dependencies');
    fs.copyFileSync(source,target);
  }
  const npm=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
  const result=spawnSync(process.execPath,[npm,'ci','--prefix',local,'--ignore-scripts','--no-audit','--no-fund'],{stdio:'inherit',windowsHide:true});
  if(result.status!==0)throw new Error('Local motion package installation failed');
  const req=createRequire(path.join(local,'package.json'));
  const fonts={name:'local-tegaki-fonts',setup(build){
    build.onLoad({filter:/[\\/]fonts[\\/]caveat[\\/]bundle\.mjs$/},args=>{
      let contents=fs.readFileSync(args.path,'utf8');
      contents=contents.replace(/new URL\("(\.\/[^"]+\.ttf)", import\.meta\.url\)\.href/g,(_,relative)=>JSON.stringify('data:font/ttf;base64,'+fs.readFileSync(path.resolve(path.dirname(args.path),relative)).toString('base64')));
      return {contents,loader:'js',resolveDir:path.dirname(args.path)};
    });
  }};
  await req('esbuild').build({entryPoints:[path.join(root,'motion/v2/tegaki-entry.mjs')],bundle:true,format:'iife',platform:'browser',outfile:bundle,nodePaths:[path.join(local,'node_modules')],legalComments:'eof',plugins:[fonts]});
  fs.writeFileSync(state,JSON.stringify({inputs:signature,bundle:sha256(fs.readFileSync(bundle))}));
}
console.log(JSON.stringify({ready:ready(),localOnly:true,cloudCalls:false,dependencyLifecycleScripts:false}));
if(!ready())process.exitCode=1;
