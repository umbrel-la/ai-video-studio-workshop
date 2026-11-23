import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {findRecipes,verifiedFile,extract,verifyCatalog,root} from '../scripts/motion-catalog.mjs';
import {review} from '../scripts/motion-variety.mjs';
import {initProject} from '../scripts/project.mjs';
import {installSkills} from '../scripts/setup.mjs';
import {scanRecord} from '../scripts/privacy-check.mjs';

function temporary(run){
  fs.mkdirSync(path.join(root,'.local'),{recursive:true});
  const directory=fs.mkdtempSync(path.join(root,'.local','studio-test-'));
  try{return run(directory);}finally{assert.ok(path.basename(directory).startsWith('studio-test-'));assert.equal(path.dirname(directory),path.join(root,'.local'));fs.rmSync(directory,{recursive:true,force:true});}
}
test('catalog resolves pinned recipes, rejects tampering and verifies every source',()=>{
  const recipe=findRecipes('compare','herk-edit-kit')[0];assert.ok(recipe);assert.ok(fs.existsSync(verifiedFile(recipe)));
  assert.throws(()=>verifiedFile({...recipe,sha256:'0'.repeat(64)}),/hash mismatch/);
  assert.deepEqual(verifyCatalog(),{ok:true,sources:10,files:992,recipes:569});
});
test('extraction is confined and never overwrites existing files',()=>temporary(directory=>{
  const recipe=findRecipes('compare','herk-edit-kit')[0],target=path.join(directory,'reference.html');
  extract(recipe,target);assert.deepEqual(fs.readFileSync(target),fs.readFileSync(verifiedFile(recipe)));
  assert.throws(()=>extract(recipe,target),/EEXIST/);
  assert.throws(()=>extract(recipe,'AGENTS.md'),/Extract only/);
  assert.throws(()=>extract(recipe,'../outside.html'),/Extract only/);
}));
test('extraction rejects a directory link from an ignored folder into maintained files',()=>temporary(directory=>{
  const link=path.join(directory,'linked');
  fs.symlinkSync(path.join(root,'references'),link,process.platform==='win32'?'junction':'dir');
  assert.throws(()=>extract(findRecipes()[0],path.join(link,'unwanted.html')),/escapes/);
  fs.unlinkSync(link);
}));
test('new workspace has no owner defaults and preserves an existing project',()=>temporary(directory=>{
  const target=path.join(directory,'new-project'),state=initProject(target,'Учебный ролик','landscape');
  assert.deepEqual(state.format,{width:1920,height:1080,fps:30});assert.deepEqual(state.sources,[]);assert.deepEqual(state.outputs,[]);
  const before=fs.readFileSync(path.join(target,'STATE.json'));
  assert.throws(()=>initProject(target,'Another'),/EEXIST/);assert.deepEqual(fs.readFileSync(path.join(target,'STATE.json')),before);
}));
test('global motion adapters resolve the full bundle and preserved skills stay intact',()=>temporary(directory=>{
  const source=path.join(directory,'source'),destination=path.join(directory,'skills');
  for(const name of ['studio-example','workshop-studio','ordinary']){fs.mkdirSync(path.join(source,name),{recursive:true});fs.writeFileSync(path.join(source,name,'SKILL.md'),'example');}
  installSkills(source,destination,root);
  for(const name of ['studio-example','workshop-studio'])assert.equal(JSON.parse(fs.readFileSync(path.join(destination,name,'studio-location.json'),'utf8')).bundle_root,root);
  assert.ok(!fs.existsSync(path.join(destination,'ordinary','studio-location.json')));
  const marker=path.join(destination,'studio-example','studio-location.json');fs.writeFileSync(marker,'user-owned');
  assert.equal(installSkills(source,destination,root).installed.length,0);assert.equal(fs.readFileSync(marker,'utf8'),'user-owned');
}));
test('motion review distinguishes missing evidence and deliberate repeated motifs',()=>{
  const shots=[{id:'a',takeaway:'one',truth_source:'synthetic',transition:'cut'},{id:'b',takeaway:'two',transition:'cut',camera:'push'}];
  assert.equal(review({shots}).warnings.length,3);
  Object.assign(shots[1],{truth_source:'verified input',motif:'same action',camera_reason:'read result'});
  assert.deepEqual(review({shots}).warnings,[]);assert.throws(()=>review({shots:[shots[0],shots[0]]}),/unique/);
});
test('sound helper produces deterministic stereo WAV with bounded onsets',()=>temporary(directory=>{
  const outputs=['a.wav','b.wav'].map(name=>path.join(directory,name));
  for(const output of outputs){const result=spawnSync(process.execPath,[path.join(root,'tools/motion-sound/sound-sheet.mjs'),path.join(root,'motion/v2/cues.example.json'),'--out',output,'--json'],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);}
  const audio=fs.readFileSync(outputs[0]);assert.deepEqual(audio,fs.readFileSync(outputs[1]));assert.equal(audio.toString('ascii',0,4),'RIFF');assert.equal(audio.readUInt16LE(22),2);assert.equal(audio.readUInt32LE(24),44100);
  const report=JSON.parse(fs.readFileSync(path.join(directory,'a.report.json'),'utf8'));
  const cues=JSON.parse(fs.readFileSync(path.join(root,'motion/v2/cues.example.json'),'utf8')).cues;
  report.onsets.forEach((onset,i)=>{assert.ok(onset.at>=cues[i].t);assert.ok(onset.at-cues[i].t<=2/30);});
}));
test('privacy scan rejects local settings, unknown binary data and credential-shaped values',()=>{
  assert.ok(scanRecord('context/.env',Buffer.from('ordinary')).length);
  assert.ok(scanRecord('setup.log',Buffer.from('ordinary')).length);
  assert.ok(scanRecord('assets/personal.bin',Buffer.from([0,1,2,3])).length);
  const token=['gh','p_','a'.repeat(36)].join('');
  const result=scanRecord('config.txt',Buffer.from(token));assert.equal(result[0].rule,'github-token');assert.ok(!JSON.stringify(result).includes(token));
  assert.deepEqual(scanRecord('sample.txt',Buffer.from('Ordinary public text')),[]);
});
