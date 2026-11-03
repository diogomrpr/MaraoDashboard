const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const esbuild=require('esbuild');
const root=path.resolve(__dirname,'..');
const authoringFiles=['MaraoAuthoring.js','MaraoAuthoringCLI.mjs','MaraoAuthoring.metadata.json','MaraoAuthoring.schema.json','MaraoAuthoring.md'];
async function buildAuthoring(output,version=JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version) {
  const {buildAuthoringMetadata}=await import(pathToFileURL(path.join(__dirname,'authoring-schema.js')));
  const metadata=buildAuthoringMetadata(version);
  const plugins=[{name:'authoring-metadata',setup(build){build.onResolve({filter:/MaraoAuthoring\.metadata\.json$/},()=>({path:'authoring-metadata',namespace:'marao'}));build.onLoad({filter:/.*/,namespace:'marao'},()=>({contents:JSON.stringify(metadata),loader:'json'}));}}];
  fs.mkdirSync(output,{recursive:true});
  for(const [entry,filename]of [['authoring.js','MaraoAuthoring.js'],['authoring-cli.js','MaraoAuthoringCLI.mjs']]) {
    // The core uses browser-safe YAML; the Node entry needs only global stdin/stdout.
    const bundle=await esbuild.build({entryPoints:[path.join(__dirname,entry)],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'eof',plugins});
    fs.writeFileSync(path.join(output,filename),bundle.outputFiles[0].contents);
  }
  fs.writeFileSync(path.join(output,'MaraoAuthoring.metadata.json'),JSON.stringify(metadata)+'\n');
  fs.writeFileSync(path.join(output,'MaraoAuthoring.schema.json'),JSON.stringify(metadata.schema)+'\n');
  fs.copyFileSync(path.join(root,'docs/docs/development/agent-authoring.md'),path.join(output,'MaraoAuthoring.md'));
  return metadata;
}
module.exports={buildAuthoring,authoringFiles};
