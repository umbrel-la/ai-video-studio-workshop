/** Search pinned recipes and extract verified text; never execute a recipe. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const readJSON=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export const sha256=buffer=>createHash('sha256').update(buffer).digest('hex');
export function inside(parent,target){const relative=path.relative(parent,target);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);}
export function verifiedFile(record){
  const file=path.resolve(root,record.path);
  if(!inside(root,file)||!fs.existsSync(file)||!inside(fs.realpathSync(root),fs.realpathSync(file)))throw new Error('Missing or unsafe source path');
  if(sha256(fs.readFileSync(file))!==record.sha256)throw new Error('Source hash mismatch: '+record.path);
  return file;
}
export function findRecipes(query='',source=null){
  const words=query.toLowerCase().split(/\s+/).filter(Boolean);
  return readJSON(path.join(root,'motion/catalog-v2.json')).recipes.filter(recipe=>{
    const text=[recipe.id,recipe.title,...recipe.tags].join(' ').toLowerCase();
    return (!source||recipe.source===source)&&words.every(word=>text.includes(word));
  });
}
export function extract(recipe,output){
  const source=verifiedFile(recipe),dest=path.resolve(root,output);
  const first=path.relative(root,dest).split(path.sep)[0];
  if(!inside(root,dest)||!['.local','workspaces'].includes(first))throw new Error('Extract only into .local/ or workspaces/');
  // Check existing ancestors before mkdir: a participant directory may contain symlinks.
  let ancestor=path.dirname(dest);
  while(!fs.existsSync(ancestor))ancestor=path.dirname(ancestor);
  if(!inside(fs.realpathSync(root),fs.realpathSync(ancestor))&&fs.realpathSync(ancestor)!==fs.realpathSync(root))throw new Error('Output escapes the bundle');
  const physical=path.join(fs.realpathSync(ancestor),path.relative(ancestor,dest));
  if(!['.local','workspaces'].includes(path.relative(fs.realpathSync(root),physical).split(path.sep)[0]))throw new Error('Output escapes the ignored workspace');
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,fs.readFileSync(source),{flag:'wx'});
  return path.relative(root,dest).split(path.sep).join('/');
}
export function verifyCatalog(){
  const sources=readJSON(path.join(root,'context/motion-sources.json')).sources;
  let files=0;
  for(const source of sources){
    const index=readJSON(path.join(root,source.index));
    if(index.commit!==source.commit)throw new Error('Source commit mismatch');
    for(const item of index.files){verifiedFile(item);files++;}
    if(index.active_helper)verifiedFile(index.active_helper);
  }
  const recipes=findRecipes();recipes.forEach(verifiedFile);
  return {ok:true,sources:sources.length,files,recipes:recipes.length};
}
function main(args){
  const [command,...rest]=args;
  if(command==='verify')return verifyCatalog();
  if(command==='search'){
    const options={query:'',source:null,limit:20};
    for(let i=0;i<rest.length;i++){
      const key=rest[i].replace(/^--/,'');
      if(!Object.hasOwn(options,key)||rest[i+1]===undefined)throw new Error('Usage: search [--query text] [--source id] [--limit N]');
      options[key]=rest[++i];
    }
    if(!Number.isInteger(Number(options.limit))||Number(options.limit)<0)throw new Error('limit must be a nonnegative integer');
    const recipes=findRecipes(options.query,options.source);
    return {total:recipes.length,recipes:recipes.slice(0,Number(options.limit))};
  }
  if(command==='show'||command==='extract'){
    const recipe=findRecipes().find(item=>item.id===rest[0]);
    if(!recipe)throw new Error('Unknown recipe ID; use search');
    verifiedFile(recipe);
    if(command==='show')return recipe;
    if(rest.length!==3||rest[1]!=='--out')throw new Error('Usage: extract ID --out workspaces/example/reference.html');
    return {path:extract(recipe,rest[2]),adaptation_required:true,executed:false};
  }
  throw new Error('Usage: node scripts/motion-catalog.mjs search|show|extract|verify');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(main(process.argv.slice(2)),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
