/** Verify release imports, routes and local references without downloading anything. */
import fs from 'node:fs';
import path from 'node:path';
import {root,readJSON,sha256,verifyCatalog,inside} from './motion-catalog.mjs';
import {checkPrivacy,releaseFiles} from './privacy-check.mjs';

const imports=readJSON(path.join(root,'IMPORTS.json')).files;
for(const item of imports){
  const file=path.resolve(root,item.path);
  if(!inside(root,file)||!fs.existsSync(file))throw new Error('Missing imported file: '+item.path);
  if(!item.release_sha256)throw new Error('Import manifest not finalized');
  if(sha256(fs.readFileSync(file))!==item.release_sha256)throw new Error('Imported file changed: '+item.path);
  if(item.release_sha256!==item.source_sha256&&!item.adapted)throw new Error('Unrecorded import adaptation: '+item.path);
}
const routes=readJSON(path.join(root,'context/skill-routing-v2.json')).routes;
if(routes.length!==10||new Set(routes.map(route=>route.id)).size!==10)throw new Error('Expected ten distinct motion routes');
for(const route of routes){
  for(const file of [route.skill,route.source_index,...route.read_first])if(!fs.existsSync(path.join(root,file)))throw new Error('Broken route: '+file);
}
const skills=fs.readdirSync(path.join(root,'skills')).filter(name=>fs.existsSync(path.join(root,'skills',name,'SKILL.md')));
if(skills.length!==21)throw new Error('Expected 21 installed skill folders');
const links=[];
for(const {name,buffer} of releaseFiles()){
  // Own maintained docs only; source snapshots retain their original relative links.
  if(!name.endsWith('.md')||name.startsWith('vendor/')||(name.startsWith('skills/')&&!/^skills\/(?:studio-|workshop-studio)/.test(name)))continue;
  for(const match of buffer.toString('utf8').matchAll(/\]\(([^)]+)\)/g)){
    const target=match[1].split('#')[0];
    if(!target||/^(?:https?:|mailto:)/.test(target))continue;
    const file=path.resolve(path.dirname(path.join(root,name)),target);
    if(!inside(root,file)||!fs.existsSync(file))links.push({file:name,target});
  }
}
if(links.length)throw new Error('Broken maintained Markdown links: '+JSON.stringify(links));
const privacy=checkPrivacy();if(!privacy.ok)throw new Error('Release privacy checks failed: '+JSON.stringify(privacy.issues));
const manifest=readJSON(path.join(root,'RELEASE-MANIFEST.json'));
const files=releaseFiles().filter(item=>item.name!=='RELEASE-MANIFEST.json');
if(files.length!==manifest.files.length)throw new Error('Release file count changed; regenerate manifest after review');
for(const item of manifest.files){if(sha256(fs.readFileSync(path.join(root,item.path)))!==item.sha256)throw new Error('Release hash differs: '+item.path);}
console.log(JSON.stringify({ok:true,imports:imports.length,skills:skills.length,catalog:verifyCatalog(),release_files:files.length+1,maintained_links:'valid',privacy:'passed'},null,2));
