/** Local suggestions for a shot plan; no publishing or file changes. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function review(plan){
  if(!Array.isArray(plan.shots)||!plan.shots.length)throw new Error('shots must be a nonempty list');
  const ids=new Set(),warnings=[];
  plan.shots.forEach((shot,i)=>{
    if(typeof shot.id!=='string'||!shot.id||ids.has(shot.id))throw new Error('Every shot needs a unique nonempty string id');
    ids.add(shot.id);
    const warn=issue=>warnings.push({shot:shot.id,issue});
    if(!shot.takeaway)warn('Describe what the viewer should understand');
    if(!shot.truth_source)warn('Record the fact source or label this as an illustration');
    if(i&&shot.transition&&shot.transition===plan.shots[i-1].transition&&!shot.motif)warn('Repeated adjacent transition; keep deliberately with motif or vary it');
    if(shot.camera&&!shot.camera_reason)warn('Record why this camera move helps the viewer');
  });
  return {shots:plan.shots.length,warnings,editorial_review_required:true,changed_files:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(review(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
