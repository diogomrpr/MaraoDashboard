const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const sources = path.join(root, 'custom_components/marao_dashboard/frontend/brand');
const destination = path.join(root, 'custom_components/marao_dashboard/brand');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    const requests = [];
    page.on('request', request => { if (!request.url().startsWith('data:')) requests.push(request.url()); });
    for (const dark of [false, true]) {
      for (const type of ['icon', 'logo']) {
        const svg = fs.readFileSync(path.join(sources, `${type === 'icon' ? 'mark' : 'logo'}${dark ? '-dark' : ''}.svg`), 'utf8');
        assert.doesNotMatch(svg, /<text\b|<image\b|<script\b|@font-face|(?:href|src)=["']https?:/);
        for (const scale of [1, 2]) {
          const width = (type === 'icon' ? 256 : 520) * scale;
          const height = (type === 'icon' ? 256 : 280) * scale;
          await page.setViewportSize({ width, height });
          await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
          const pixels = await page.evaluate(async () => {
            const svg = document.querySelector('svg');
            const image = new Image();
            image.src = 'data:image/svg+xml;base64,' + btoa(new XMLSerializer().serializeToString(svg));
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = innerWidth; canvas.height = innerHeight;
            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0, innerWidth, innerHeight);
            return [...context.getImageData(0, 0, innerWidth, innerHeight).data];
          });
          assert.equal(pixels[3], 0, 'The canvas corner must remain transparent');
          assert.ok(pixels.some((value, index) => index % 4 === 3 && value === 255), 'Artwork must contain solid pixels');
          if (type === 'logo') {
            const alpha = x => pixels[(Math.round(190 * scale) * width + Math.round(x * scale)) * 4 + 3];
            assert.ok(Array.from({ length: 280 }, (_, index) => alpha(120 + index)).filter(value => value === 0).length > 20, 'The lettering must cut through the mountain silhouette');
          }
          const name = `${dark ? 'dark_' : ''}${type}${scale === 2 ? '@2x' : ''}.png`;
          await page.screenshot({ path: path.join(destination, name), omitBackground: true });
        }
      }
    }
    assert.deepEqual(requests, [], 'Artwork export must not request external resources');
    for (const [source, target] of [['logo.svg', 'logo.svg'], ['logo-dark.svg', 'logo-dark.svg'], ['mark.svg', 'favicon.svg'], ['mark-dark.svg', 'favicon-dark.svg']]) {
      fs.copyFileSync(path.join(sources, source), path.join(root, 'docs/assets/images', target));
    }
    console.log('Eight transparent native images and four documentation SVGs exported.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
