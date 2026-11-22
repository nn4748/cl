const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const svg = fs.readFileSync(ROOT + '/design/icon.svg', 'utf8');
const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const defs = inner.match(/<defs>[\s\S]*?<\/defs>/)[0];
const body = inner.replace(defs, '');
const bgRect = '<rect width="512" height="512" fill="url(#bg)"/>';
const art = body.replace(bgRect, '');
// أيقونة عادية: زوايا مستديرة قليلاً لا (iOS/Android تقص بنفسها) — نتركها مربعة ممتلئة
const iconSvg = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}${bgRect}<g transform="translate(256 ${256 + 8}) scale(${scale}) translate(-256 -256)">${art}</g></svg>`;
const fontCss = `@font-face{font-family:Plex;font-weight:700;src:url(file://${ROOT}/node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-700-normal.woff2)}@font-face{font-family:Plex;font-weight:500;src:url(file://${ROOT}/node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-500-normal.woff2)}`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const shot = async (html, w, h, file) => {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><head><style>${fontCss}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}</style></head><body>${html}</body></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: file, omitBackground: false });
  };
  fs.mkdirSync(ROOT + '/public/icons', { recursive: true });
  fs.writeFileSync(ROOT + '/public/icons/icon.svg', iconSvg(1));
  for (const s of [32, 72, 96, 128, 144, 152, 167, 180, 192, 384, 512]) {
    await shot(iconSvg(1).replace('<svg ', `<svg width="${s}" height="${s}" `), s, s, `${ROOT}/public/icons/icon-${s}.png`);
  }
  for (const s of [192, 512]) {
    await shot(iconSvg(0.78).replace('<svg ', `<svg width="${s}" height="${s}" `), s, s, `${ROOT}/public/icons/maskable-${s}.png`);
  }
  fs.copyFileSync(`${ROOT}/public/icons/icon-180.png`, `${ROOT}/public/apple-touch-icon.png`);
  fs.copyFileSync(`${ROOT}/public/icons/icon-32.png`, `${ROOT}/public/favicon.png`);

  // شاشات البداية لأجهزة Apple (عمودي) — [عرض CSS, ارتفاع CSS, نسبة البكسل]
  const devices = [
    [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3], [375, 812, 3], [414, 896, 3], [414, 896, 2],
    [375, 667, 2], [414, 736, 3], [320, 568, 2], [440, 956, 3], [402, 874, 3],
    [768, 1024, 2], [810, 1080, 2], [820, 1180, 2], [834, 1112, 2], [834, 1194, 2], [1024, 1366, 2],
  ];
  const links = [];
  for (const [w, h, r] of devices) {
    const W = w * r, H = h * r;
    const name = `splash-${W}x${H}.png`;
    const logo = Math.round(Math.min(W, H) * 0.26);
    const html = `<div style="width:${W}px;height:${H}px;background:#F7F3EC;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Plex;direction:rtl">
      <div style="width:${logo}px;height:${logo}px;border-radius:${logo * 0.23}px;overflow:hidden;box-shadow:0 ${logo * 0.08}px ${logo * 0.25}px rgba(59,38,28,.25)">${iconSvg(1).replace('<svg ', `<svg width="${logo}" height="${logo}" `)}</div>
      <div style="margin-top:${logo * 0.28}px;font-size:${logo * 0.3}px;font-weight:700;color:#3B261C">دفتر الحلال</div>
      <div style="margin-top:${logo * 0.04}px;font-size:${logo * 0.12}px;font-weight:500;color:#A67C52">النظام المحاسبي لإدارة مشروع الحلال</div>
    </div>`;
    await shot(html, W, H, `${ROOT}/public/splash/${name}`);
    links.push(`    <link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)" href="/splash/${name}" />`);
  }
  fs.writeFileSync(ROOT + '/design/splash-links.html', [...new Set(links)].join('\n'));
  await b.close();
})();
