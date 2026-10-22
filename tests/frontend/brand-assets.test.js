import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import YAML from 'yaml';

const read = relative => fs.readFileSync(new URL('../../' + relative, import.meta.url));
const sources = 'custom_components/marao_dashboard/frontend/brand/';

test('landscape theme retains readable text, state colors, chart lines and slider boundaries in both modes', () => {
  const theme=YAML.parse(read('custom_components/marao_dashboard/frontend/themes/MaraoDashboard/marao-dashboard.yaml').toString())['Marao Dashboard'];
  const luminance=hex=>{
    const values=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
    return values.reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
  };
  for(const mode of ['light','dark']){
    const tokens={...theme,...theme.modes[mode]};
    const color=key=>{const value=tokens[key];return value.startsWith('var(')?color(value.slice(6,-1)):value;};
    const contrast=(a,b,minimum)=>{
      const [high,low]=[luminance(color(a)),luminance(color(b))].sort((x,y)=>y-x);
      assert.ok((high+.05)/(low+.05)>=minimum,`${mode}: ${a} against ${b}`);
    };
    for(const surface of ['primary-background-color','ha-card-background','marao-card-background']){
      contrast('primary-text-color',surface,4.5);contrast('subtext-color',surface,4.5);
      for(let index=1;index<=10;index++)contrast('marao-chart-'+index,surface,3);
    }
    contrast('text-primary-color','primary-color',4.5);
    for(const hue of ['green','red','purple'])contrast('active-text-color','color-'+hue,4.5);
    for(const hue of ['blue','yellow','orange','gold','peach'])contrast('color-black','color-'+hue,4.5);
    for(const state of ['neutral','warning','error'])contrast('marao-problem-'+state+'-text','marao-problem-'+state+'-background',4.5);
    for(const adjacent of ['marao-slider-track','marao-slider-fill','marao-slider-thumb','color-blue'])contrast('marao-slider-thumb-border',adjacent,3);
  }
});

test('the existing iconset exposes the canonical compact mark and functional glyphs', async () => {
  const module = read('custom_components/marao_dashboard/frontend/MaraoRuntime.js').toString();
  const context = vm.createContext({ window: {} });
  vm.runInContext(module.slice(module.indexOf('const ICONS ='), module.indexOf('const TRANSLATIONS =')), context);
  const icons = context.window.customIconsets;
  const mark = await icons.marao_dashboard('mountain');
  assert.equal(mark.viewBox, '0 0 24 24');
  assert.equal(mark.path, read(sources + 'mark-monochrome.svg').toString().match(/\bd="([^"]+)"/)[1]);
  assert.ok((await icons.marao_dashboard('back')).path);
  assert.equal(icons.fapro, icons.marao_dashboard);
});

test('canonical artwork renders without fonts and documentation copies stay aligned', () => {
  for (const name of ['logo.svg', 'logo-dark.svg', 'mark.svg', 'mark-dark.svg', 'mark-monochrome.svg']) {
    const svg = read(sources + name).toString();
    assert.match(svg, /<svg\b[^>]*viewBox="0 0 (?:520 280|24 24)"/);
    assert.doesNotMatch(svg, /<text\b|<image\b|<script\b|@font-face|(?:href|src)=["']https?:/);
    if (name.startsWith('logo')) {
      assert.match(svg, /<mask\b/);
      assert.match(svg, /<path fill="black" d="[^"]+"/);
      assert.match(svg, /mask="url\(#wordmark\)"/);
    }
  }
  for (const [source, target] of [['logo.svg', 'logo.svg'], ['logo-dark.svg', 'logo-dark.svg'], ['mark.svg', 'favicon.svg'], ['mark-dark.svg', 'favicon-dark.svg']]) {
    assert.deepEqual(read(sources + source), read('docs/assets/images/' + target));
  }
});

test('native brand images include standard and high-resolution transparent variants', () => {
  for (const dark of [false, true]) for (const type of ['icon', 'logo']) for (const scale of [1, 2]) {
    const name = `${dark ? 'dark_' : ''}${type}${scale === 2 ? '@2x' : ''}.png`;
    const png = read('custom_components/marao_dashboard/brand/' + name);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], name);
    assert.equal(png.subarray(12, 16).toString(), 'IHDR', name);
    assert.equal(png.readUInt32BE(16), (type === 'icon' ? 256 : 520) * scale, name);
    assert.equal(png.readUInt32BE(20), (type === 'icon' ? 256 : 280) * scale, name);
    assert.equal(png[24], 8, name);
    assert.equal(png[25], 6, 'Native images retain an alpha channel: ' + name);
  }
});
