/** Create ten synthetic scenes, with local fonts, handwriting and sound. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {inside,readJSON,root} from './motion-catalog.mjs';
export function build(target){
  target=path.resolve(target);
  if(!inside(root,target))throw new Error('Demo must stay inside this bundle');
  const first=path.relative(root,target).split(path.sep)[0];
  if(!['.local','workspaces'].includes(first))throw new Error('Demo must stay in ignored .local/ or workspaces/');
  if(fs.existsSync(target))throw new Error('Demo directory exists; choose a new --project path');
  let ancestor=path.dirname(target);
  while(!fs.existsSync(ancestor))ancestor=path.dirname(ancestor);
  if(fs.realpathSync(ancestor)!==fs.realpathSync(root)&&!inside(fs.realpathSync(root),fs.realpathSync(ancestor)))throw new Error('Demo escapes the bundle');
  const physical=path.join(fs.realpathSync(ancestor),path.relative(ancestor,target));
  if(!['.local','workspaces'].includes(path.relative(fs.realpathSync(root),physical).split(path.sep)[0]))throw new Error('Demo escapes the ignored workspace');
  const home=path.resolve(process.env.AI_VIDEO_HOME||path.join(os.homedir(),'.ai-video-editing'));
  const runtime=readJSON(path.join(home,'runtime-info.json'));
  const bundle=path.join(root,'.local/motion-v2/tegaki-browser.js');
  for(const file of [runtime.gsap,bundle])if(!file||!fs.existsSync(file))throw new Error('Run node scripts/setup.mjs first');
  const {scenes,css}=readJSON(path.join(root,'motion/demo-scenes.json'));
  const assets=path.join(target,'assets');fs.mkdirSync(assets,{recursive:true});
  fs.mkdirSync(path.join(target,'compositions'));
  const copy=(source,name)=>fs.copyFileSync(source,path.join(assets,name),fs.constants.COPYFILE_EXCL);
  copy(runtime.gsap,'gsap.min.js');copy(bundle,'tegaki-browser.js');
  for(const name of ['NotoSans.ttf','OFL.txt','Caveat-OFL.txt'])copy(path.join(root,'motion/v2/assets',name),name);
  copy(path.join(root,'vendor/motion-v2/tegaki/LICENSE.txt'),'Tegaki-LICENSE.txt');
  copy(path.join(root,'.local/motion-v2/node_modules/tegaki/FONTS-LICENSE.md'),'Tegaki-FONTS-LICENSE.txt');
  const hosts=[],cues=[],plan=[];
  scenes.forEach(([source,label,title,markup,tweens],i)=>{
    const id=`s${String(i+1).padStart(2,'0')}`,start=i*3;
    const html=`<template><style>${css}</style><div id="root" data-composition-id="${id}" data-duration="3" data-width="540" data-height="960"><div class="eyebrow">AI VIDEO STUDIO / WORKSHOP</div><h1 class="heading">${title}</h1><div id="${id}-clip" class="clip stage" data-start="0" data-duration="3" data-track-index="1">${markup}</div><div class="source">${String(i+1).padStart(2,'0')} / ${label}</div><div class="tag">ТЕХНИЧЕСКОЕ ДЕМО • ИЛЛЮСТРАЦИИ</div></div><script>const tl=gsap.timeline({paused:true});${tweens}window.__timelines['${id}']=tl;</script></template>`;
    fs.writeFileSync(path.join(target,'compositions',id+'.html'),html,{flag:'wx'});
    hosts.push(`<div id="host-${id}" class="clip" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${start}" data-duration="3" data-track-index="1" data-track-kind="graphics" data-width="540" data-height="960"></div>`);
    cues.push({id,kind:i===3?'land':'click',t:start+.8,x:270,y:480,w:230,h:120,gain:-12});
    plan.push({id,start,duration:3,source,status:'synthetic engineering adaptation; not a render of the upstream sample'});
  });
  const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>@font-face{font-family:StudioSans;src:url('assets/NotoSans.ttf')}@font-face{font-family:Inter;src:url('assets/NotoSans.ttf')}html,body{margin:0;width:540px;height:960px;overflow:hidden;background:#112139}#root{position:relative;width:540px;height:960px}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="30" data-width="540" data-height="960" data-fps="30">${hosts.join('')}<audio id="motion-cues" class="clip" src="assets/motion-cues.wav" data-start="0" data-duration="30" data-volume="0.4" data-track-index="10"></audio></div><script src="assets/gsap.min.js"></script><script src="assets/tegaki-browser.js"></script><script>window.__timelines=window.__timelines||{};window.__timelines.main=gsap.timeline({paused:true});</script></body></html>`;
  fs.writeFileSync(path.join(target,'index.html'),html,{flag:'wx'});
  fs.writeFileSync(path.join(target,'source-map.json'),JSON.stringify({synthetic:true,scenes:plan},null,2),{flag:'wx'});
  fs.writeFileSync(path.join(assets,'cues.json'),JSON.stringify({canvas:{w:540,h:960},fps:30,duration:30,cues},null,2),{flag:'wx'});
  const result=spawnSync(process.execPath,[path.join(root,'tools/motion-sound/sound-sheet.mjs'),path.join(assets,'cues.json'),'--out',path.join(assets,'motion-cues.wav'),'--json'],{stdio:'inherit',windowsHide:true});
  if(result.status!==0)throw new Error('Sound stem generation failed');
  return {project:path.relative(root,target),duration:30,scenes:10,synthetic:true,cloudCalls:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2);
    if(args.length&&!(args.length===2&&args[0]==='--project'))throw new Error('Usage: build-motion-demo.mjs [--project .local/other-demo]');
    console.log(JSON.stringify(build(path.resolve(root,args[1]||'.local/motion-demo')),null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
