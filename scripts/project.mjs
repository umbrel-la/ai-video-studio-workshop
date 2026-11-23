/** Create a fresh participant workspace without touching existing files. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function initProject(directory,title='Новый ролик',format='vertical'){
  const sizes={vertical:[1080,1920],landscape:[1920,1080],square:[1080,1080]};
  if(!sizes[format])throw new Error('format must be vertical, landscape or square');
  const target=path.resolve(directory);
  // Nonrecursive mkdir deliberately rejects an existing folder, even an empty one.
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.mkdirSync(target);
  const [width,height]=sizes[format];
  const state={schema_version:1,title,status:'brief',format:{width,height,fps:30},sources:[],decisions:[],selected_takes:[],motion_recipes:[],outputs:[],checks:[],next_step:'Уточнить задачу и добавить свои исходники в media/'};
  fs.writeFileSync(path.join(target,'STATE.json'),JSON.stringify(state,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(path.join(target,'BRIEF.md'),`# ${title}\n\nАудитория:\nЦель:\nДлительность:\nЧто зритель должен понять:\nОсновной голос:\nЧто сохранить из исходников:\nСтиль и ограничения:\n`,{flag:'wx'});
  fs.copyFileSync(path.join(root,'motion/v2/plan.example.json'),path.join(target,'motion-plan.json'),fs.constants.COPYFILE_EXCL);
  fs.mkdirSync(path.join(target,'media'));
  fs.mkdirSync(path.join(target,'exports'));
  return state;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const [command,...args]=process.argv.slice(2),options={dir:null,title:'Новый ролик',format:'vertical'};
    for(let i=0;i<args.length;i++){const key=args[i].replace(/^--/,'');if(!Object.hasOwn(options,key)||!args[i+1])throw new Error('Unknown or incomplete argument');options[key]=args[++i];}
    if(!options.dir)throw new Error('Usage: project.mjs init|status --dir <new-folder> [--title text] [--format vertical|landscape|square]');
    const result=command==='init'?initProject(options.dir,options.title,options.format):command==='status'?JSON.parse(fs.readFileSync(path.join(path.resolve(options.dir),'STATE.json'),'utf8')):null;
    if(!result)throw new Error('Expected init or status');
    console.log(JSON.stringify(result,null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
