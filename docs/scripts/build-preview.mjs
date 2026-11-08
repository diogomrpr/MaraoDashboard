import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import * as mdi from '@mdi/js';
import {parse} from 'yaml';

const docs=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.dirname(docs),frontend=path.join(root,'custom_components/marao_dashboard/frontend');
const mime={'.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf','.css':'text/css','.woff2':'font/woff2'};
const dataURL=async filename=>`data:${mime[path.extname(filename)]||'application/octet-stream'};base64,${(await fs.readFile(filename)).toString('base64')}`;
const staticImport=/import\(new URL\((`[^`]+`|'[^']+'|"[^"]+")(?:\s*\+\s*new URL\(import\.meta\.url\)\.search)?,\s*import\.meta\.url\)(?:\.href)?\)/g;

/** Bundle the existing runtime, adapting only its host/asset boundaries for an opaque frame. */
export async function buildPreview({design=false,published=false}={}){
  const version=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).version;
  const mdiLicense=await fs.readFile(fileURLToPath(import.meta.resolve('@mdi/js/LICENSE')),'utf8');
  const iconMap=Object.fromEntries(Object.entries(mdi).filter(([name,value])=>name.startsWith('mdi')&&typeof value==='string').map(([name,value])=>['mdi:'+name.slice(3).replace(/[A-Z]/g,(letter,i)=>(i?'-':'')+letter.toLowerCase()),value]));
  const editable=design&&!published;
  const editableEntries={MaraoSchedules:'schedules-card.js',MaraoNativeModel:'legacy-model.js',MaraoNativeDashboard:'native-strategy.js',MaraoNativeBootstrap:'native-bootstrap.js',MaraoNativeCards:'native-cards.js',MaraoNativeCardMetadata:'native-card-metadata.js',MaraoOrdinaryMigration:'ordinary-migration-ui.js',MaraoTheme:'native-theme.js',MaraoHistoryData:'history-data.js',MaraoHistoryChart:'history-chart.js'};
  const plugin={name:'marao-offline-preview',setup(builder){
    if(editable){
      builder.onResolve({filter:/Marao\w+\.js$/},args=>{
        const entry=editableEntries[path.basename(args.path,'.js')];
        if(entry)return {path:path.join(root,'frontend_src',entry)};
      });
      builder.onLoad({filter:/marao-dashboard\.yaml$/},async args=>({contents:JSON.stringify(parse(await fs.readFile(args.path,'utf8'))),loader:'json'}));
    }
    builder.onResolve({filter:/^virtual:preview-icons$/},()=>({path:'icons',namespace:'preview'}));
    builder.onLoad({filter:/.*/,namespace:'preview'},()=>({contents:'/*! @license @mdi/js\n'+mdiLicense.replaceAll('*/','* /')+'\n*/\nexport default '+JSON.stringify(iconMap),loader:'js'}));
    builder.onResolve({filter:/MaraoCamera\.js$/},()=>({path:path.join(docs,'playground/preview-assets-camera.js')}));
    builder.onResolve({filter:/Marao(NativeCardEditor|DashboardSettings)\.js$/},()=>({path:'ha-editor',namespace:'ha-preview-boundary'}));
    builder.onLoad({filter:/.*/,namespace:'ha-preview-boundary'},()=>({contents:"export function openDashboardSettings(){throw new Error('Dashboard editing is available in Home Assistant.');}",loader:'js'}));
    builder.onLoad({filter:/\.js$/},async args=>{
      if(!args.path.startsWith(frontend)&&!args.path.startsWith(path.join(root,'frontend_src')))return;
      let source=await fs.readFile(args.path,'utf8');
      const filenames=[...new Set([...source.matchAll(/['"](Marao[\w]+\.js)['"]/g)].map(match=>match[1]))];
      source=source.replace(staticImport,(expression,quoted)=>{
        const input=quoted.slice(1,-1),literal=/^\.\/(Marao\w+\.js)/.exec(input);
        if(literal)return `import(${JSON.stringify('./'+literal[1])})`;
        if(input.startsWith('./${file}'))return `({${filenames.map(file=>JSON.stringify(file)+':()=>import('+JSON.stringify('./'+file)+')').join(',')}})[file]()`;
        throw new Error('Unrecognized runtime import in '+path.basename(args.path)+': '+expression);
      });
      if(path.basename(args.path)==='MaraoCards.js'){
        source=source.replace('lightColorModule ||= import(url.href)','lightColorModule ||= import("./MaraoLightColor.js")').replace('historyChartModule ||= import(url.href)','historyChartModule ||= import("./MaraoHistoryChart.js")').replace('activityModule ||= import(url.href)','activityModule ||= import("./MaraoActivity.js")');
        const files=await fs.readdir(path.join(frontend,'media-apps')),images={};
        for(const file of files)if(/\.(png|svg)$/.test(file))images[file]=await dataURL(path.join(frontend,'media-apps',file));
        source=source.replace('new URL(`./media-apps/${app.file || `${app.id}.png`}${new URL(import.meta.url).search}`, import.meta.url).href',`(${JSON.stringify(images)})[app.file || app.id+'.png']`);
      }
      // The adapter is compile-time only; Home Assistant receives unchanged sources.
      source=source.replace(/\b(?:window|globalThis)\.location\b/g,'globalThis.__maraoPreview.location').replace(/\b(?:window|globalThis)\.history\b/g,'globalThis.__maraoPreview.history').replace(/\b(?:window|globalThis)\.localStorage\b/g,'globalThis.__maraoPreview.storage');
      if(['MaraoFrontendUpdates.js','MaraoFrontendRefresh.js'].includes(path.basename(args.path)))source=source.replace(/\bhost\.fetch\(/g,'globalThis.__maraoPreview.fetch(').replace(/\bhost\.sessionStorage\b/g,'globalThis.__maraoPreview.storage');
      source=source.replace(/(?<![\w$.])location\.(pathname|href|hash|origin|search)/g,'globalThis.__maraoPreview.location.$1');
      if(path.basename(args.path)==='MaraoFloorPlanCard.js')source=source.replace('image.src=`/api/image/serve/${config.image_id}/original`','image.src=globalThis.__maraoPreview.asset("floorplan")');
      if(path.basename(args.path)==='MaraoRuntime.js'){
        const font=await dataURL(path.join(frontend,'fonts/Montserrat.ttf'));
        const css='@font-face{font-family:Montserrat;src:url('+font+') format("truetype");font-weight:100 900;font-display:swap}';
        source=source.replace(/new URL\(`\.\/MaraoFonts\.css[^`]*`,\s*import\.meta\.url\)\.href/,JSON.stringify('data:text/css;base64,'+Buffer.from(css).toString('base64')));
      }
      // Locally owned media-app images are embedded rather than fetched by the frame.
      const assetPattern=/new URL\((['"`])\.\/([^'"`$]+\.(?:svg|png))\1,\s*import\.meta\.url\)\.href/g;
      for(const match of [...source.matchAll(assetPattern)])source=source.replace(match[0],JSON.stringify(await dataURL(path.join(path.dirname(args.path),match[2]))));
      return {contents:source,loader:'js',resolveDir:path.dirname(args.path)};
    });
    builder.onResolve({filter:/^\.\/Marao\w+\.js$/},args=>({path:path.join(frontend,path.basename(args.path))}));
  }};
  const result=await build({entryPoints:[path.join(docs,'playground/preview-entry.js')],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'eof',plugins:[plugin],define:{__MARAO_VERSION__:JSON.stringify(version),__MARAO_DESIGN_PREVIEW__:JSON.stringify(design)},logLevel:'warning'});
  const script=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
  if(/import\(new URL|import\(\w+\.href\)/.test(script))throw new Error('Preview contains an unbundled runtime import: '+script.slice(script.search(/import\(new URL|import\(\w+\.href\)/),script.search(/import\(new URL|import\(\w+\.href\)/)+220));
  const hash=createHash('sha256').update(script).digest('base64');
  const policy=`default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline' data:; img-src data:; font-src data:; media-src data:; connect-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`;
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${policy}"><title>Marao card preview</title><style>html{font-family:Montserrat,system-ui,sans-serif;color:var(--primary-text-color,#263338);background:var(--primary-background-color,#f3f3ee)}body{margin:0;min-width:0;min-height:460px}*{box-sizing:border-box}#status{padding:0 16px 12px;overflow-wrap:anywhere;font-size:14px}#status:empty{display:none}home-assistant{display:block;min-height:420px}</style></head><body><main id="preview"></main><p id="status" role="status"></p><script type="module">${script}</script></body></html>`;
  const output=path.join(docs,published?'public/gallery/frame.html':design?'.design/frame.html':'public/playground/frame.html');await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,html);
  await fs.writeFile(path.join(path.dirname(output),'icons.json'),JSON.stringify({license:mdiLicense,icons:iconMap}));
  return {output,bytes:Buffer.byteLength(html),version};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildPreview().then(result=>console.log(`Built isolated Marao preview (${Math.round(result.bytes/1024)} KiB)`)).catch(error=>{console.error(error);process.exitCode=1;});
