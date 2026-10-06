'use strict';
// Rebuild the included, original demonstration. No network, external source, or installation.
const fs=require('node:fs'),path=require('node:path'),P=require('../src/package.js');
const root=path.resolve(__dirname,'..');
const project=JSON.parse(fs.readFileSync(path.join(root,'examples/demo.chartroom.json'),'utf8'));
for(const target of ['student','teaching']){
 const result=P.build(project,target);
 for(const file of result.files){
  if(!P.safePath(file.path))throw new Error('Unsafe generated path');
  const destination=path.join(root,'demo',target,file.path);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,file.data);
 }
 console.log('Generated demo/'+target+': '+result.files.length+' files; diagnostics '+result.diagnostics.length);
}
