/** Inspect the release file set. Reports paths/rules, never matching secret values. */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {root,readJSON,sha256} from './motion-catalog.mjs';

const blockedPath=/^(?:\.local|workspaces|projects|sources|exports|smoke-output|node_modules)(?:\/|$)|(?:^|\/)(?:\.env(?:\..*)?|studio-location\.json|setup-report\.json|runtime-info\.json|credentials|cookies\.txt|id_rsa|id_ed25519)$/i;
const rules=[
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/g],
  ['aws-access-key',/\bAKIA[0-9A-Z]{16}\b/g],
  ['google-api-key',/\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['openai-token',/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{40,}\b/g],
];
export function scanRecord(name,buffer,publicBinaryHashes=new Set()){
  const issues=[];
  if(blockedPath.test(name))issues.push({path:name,rule:'local-or-private-path'});
  if(/\.log$/i.test(name))issues.push({path:name,rule:'local-log'});
  if(/\.(?:mp4|mov|mkv|wav|pdf|docx|zip|sqlite|db|pfx|p12)$/i.test(name))issues.push({path:name,rule:'unexpected-media-or-data'});
  // Public fonts and upstream SFX are accepted by content hash, not filename alone.
  const binary=buffer.includes(0)||/\.(?:mp3|ttf|woff2?|png|jpe?g|gif|webp)$/i.test(name);
  if(binary){if(!publicBinaryHashes.has(sha256(buffer)))issues.push({path:name,rule:'unverified-binary'});return issues;}
  const text=buffer.toString('utf8');
  for(const [rule,regex] of rules){
    regex.lastIndex=0;let match;
    while((match=regex.exec(text))!==null)issues.push({path:name,rule,line:text.slice(0,match.index).split('\n').length});
  }
  return issues;
}
export function releaseFiles(tracked=false){
  if(tracked){
    const result=spawnSync('git',['ls-files','--stage','-z'],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:20*1024*1024});
    if(result.status!==0)throw new Error('Cannot read Git index');
    return result.stdout.split('\0').filter(Boolean).map(record=>{
      const match=record.match(/^(\d+) ([a-f0-9]+) 0\t(.+)$/s);
      if(!match)throw new Error('Unmerged Git index');
      const [,mode,blob,name]=match;
      if(!['100644','100755'].includes(mode))throw new Error('Release contains a non-regular Git entry');
      const buffer=fs.readFileSync(path.join(root,name));
      const actual=createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
      if(actual!==blob)throw new Error('Worktree and staged content differ: '+name);
      return {name,buffer};
    });
  }
  const result=[];
  function walk(directory){
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
      if(['.git','.local','workspaces','node_modules','smoke-output'].includes(entry.name))continue;
      const file=path.join(directory,entry.name),name=path.relative(root,file).split(path.sep).join('/');
      if(entry.isDirectory())walk(file);
      else if(entry.isFile()&&!['setup-report.json'].includes(entry.name)&&!entry.name.toLowerCase().endsWith('.log'))result.push({name,buffer:fs.readFileSync(file)});
      else if(entry.isSymbolicLink())throw new Error('Release contains a symlink');
    }
  }
  walk(root);return result;
}
export function checkPrivacy(tracked=false){
  const imports=readJSON(path.join(root,'IMPORTS.json')).files;
  const known=new Set(imports.filter(item=>item.origin==='public-base'||item.path==='motion/v2/assets/NotoSans.ttf').map(item=>item.source_sha256));
  const files=releaseFiles(tracked),issues=files.flatMap(({name,buffer})=>scanRecord(name,buffer,known));
  if(tracked){
    const expected=new Set([...readJSON(path.join(root,'RELEASE-MANIFEST.json')).files.map(item=>item.path),'RELEASE-MANIFEST.json']);
    if(files.length!==expected.size||files.some(item=>!expected.has(item.name)))throw new Error('Git index differs from the reviewed release file set');
  }
  return {ok:issues.length===0,files:files.length,tracked,issues,scope:'release paths, known binaries and common credential formats; not a complete privacy proof'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const result=checkPrivacy(process.argv.includes('--tracked'));console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;}catch(error){console.error(error.message);process.exitCode=1;}
}
