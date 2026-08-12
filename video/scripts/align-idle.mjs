// 把 素材/待机.gif 的内容顶对齐后输出为 PNG 帧序列（去掉 105/108 交替的 3px 抽搐）
// 输出：video/public/aligned/idle/01.png … 08.png
import sharp from 'sharp';
import fs from 'fs';

const SRC = '素材/待机.gif';
const OUT_DIR = 'video/public/aligned/idle';

const meta = await sharp(SRC, { animated: true }).metadata();
const N = meta.pages;
const { data, info } = await sharp(SRC, { animated: true, pages: -1 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width, ch = info.channels, h = meta.pageHeight;

const boxes = [];
for (let p = 0; p < N; p++) {
  const off = p * h * w * ch;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * ch;
    for (let x = 0; x < w; x++) {
      if (data[off + row + x * ch + 3] > 0) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  boxes.push({ minX, minY, maxX, maxY });
}
const union = {
  minX: Math.min(...boxes.map(b => b.minX)), minY: Math.min(...boxes.map(b => b.minY)),
  maxX: Math.max(...boxes.map(b => b.maxX)), maxY: Math.max(...boxes.map(b => b.maxY)),
};
const U = { w: union.maxX - union.minX + 1, h: union.maxY - union.minY + 1 };
console.log('并集窗口', U.w + 'x' + U.h);

fs.mkdirSync(OUT_DIR, { recursive: true });
const tops = [];
for (let p = 0; p < N; p++) {
  const b = boxes[p];
  const off = p * h * w * ch;
  const cw = b.maxX - b.minX + 1, chh = b.maxY - b.minY + 1;
  const crop = Buffer.alloc(cw * chh * ch);
  for (let y = 0; y < chh; y++) {
    const src = off + ((b.minY + y) * w + b.minX) * ch;
    const dst = y * cw * ch;
    data.copy(crop, dst, src, src + cw * ch);
  }
  // 画布 = 并集尺寸；内容顶对齐到 0（x 各帧一致，left=0 即对齐）
  const img = sharp(crop, { raw: { width: cw, height: chh, channels: ch } })
    .extend({ top: 0, bottom: U.h - chh, left: 0, right: U.w - cw, background: { r: 0, g: 0, b: 0, alpha: 0 } });
  await img.png().toFile(`${OUT_DIR}/${String(p + 1).padStart(2, '0')}.png`);

  // 复检内容顶
  const om = await sharp(`${OUT_DIR}/${String(p + 1).padStart(2, '0')}.png`).metadata();
  const od = await sharp(`${OUT_DIR}/${String(p + 1).padStart(2, '0')}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let top = om.height;
  for (let y = 0; y < om.height; y++) {
    const row = y * om.width * od.info.channels;
    let found = false;
    for (let x = 0; x < om.width; x++) if (od.data[row + x * od.info.channels + 3] > 0) { found = true; break; }
    if (found) { top = y; break; }
  }
  tops.push(top);
  console.log(`帧${p} → 01/${String(p + 1).padStart(2, '0')}.png  内容顶 y=${top}`);
}
console.log('顶是否全部对齐:', new Set(tops).size === 1 ? '是 ✓' : '否 ⚠️ ' + tops.join(','));
