import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(import.meta.dirname, '素材');
const OUT_DIR = path.join(import.meta.dirname, 'output/mypet');
const CELL_W = 192, CELL_H = 208, COLS = 8;
const MARGIN = 8; // 内容四周保留的安全边距，避免贴边/接缝

// frames = 该状态在 V2 规范中的固定帧数（引擎只播每行前 N 帧）
const mapping = [
  { file: '待机.gif',                      state: 'idle',          label: '待机',     frames: 6 },
  { file: '向右移动.gif',                   state: 'running-right', label: '向右移动', frames: 8 },
  { file: '向左移动.gif',                   state: 'running-left',  label: '向左移动', frames: 8 },
  { file: '互动.gif',                      state: 'waving',        label: '互动',     frames: 4 },
  { file: '任务完成.gif',                   state: 'jumping',       label: '任务完成', frames: 5 },
  { file: '任务失败.gif',                   state: 'failed',        label: '任务失败', frames: 8 },
  { file: '等待确认{博士，这里有一份文件需要您确认}.gif', state: 'waiting', label: '等待确认', frames: 6 },
  { file: '工作中(送信).gif',               state: 'running',       label: '工作中',   frames: 6 },
  { file: '检查中{思考.ing}.gif',           state: 'review',        label: '检查中',   frames: 6 },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

// 读取一个 GIF 的全部帧为 RGBA raw
async function readFrames(file) {
  const meta = await sharp(file, { animated: true }).metadata();
  const pages = meta.pages ?? 1;
  const ph = meta.pageHeight;
  const { data, info } = await sharp(file, { animated: true, pages: -1 }).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, ch = info.channels;
  const frames = [];
  for (let p = 0; p < pages; p++) {
    const off = p * ph * w * ch;
    frames.push(Buffer.from(data.subarray(off, off + ph * w * ch)));
  }
  return { frames, w, ph, ch };
}

// 计算一帧的非透明包围盒
function alphaBox(buf, w, h, ch) {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    let row = y * w * ch;
    for (let x = 0; x < w; x++) {
      if (buf[row + x * ch + (ch - 1)] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

// 从 raw 中裁出矩形区域
function cropRaw(buf, w, h, ch, box) {
  const cw = box.maxX - box.minX + 1;
  const chh = box.maxY - box.minY + 1;
  const out = Buffer.alloc(cw * chh * ch);
  for (let y = 0; y < chh; y++) {
    const src = ((box.minY + y) * w + box.minX) * ch;
    const dst = y * cw * ch;
    buf.copy(out, dst, src, src + cw * ch);
  }
  return { buf: out, cw, chh };
}

// 从 raw 裁剪后等比缩放并居中到 192x208 透明画布，返回 PNG buffer
async function toCell(buf, w, h, ch, box) {
  const { buf: cropped, cw, chh } = cropRaw(buf, w, h, ch, box);
  const fitW = CELL_W - 2 * MARGIN;
  const fitH = CELL_H - 2 * MARGIN;
  const scale = Math.min(fitW / cw, fitH / chh);
  const nw = Math.max(1, Math.round(cw * scale));
  const nh = Math.max(1, Math.round(chh * scale));
  const resized = await sharp(cropped, { raw: { width: cw, height: chh, channels: ch } })
    .resize(nw, nh, { fit: 'fill' })
    .raw()
    .toBuffer();
  const padL = Math.floor((CELL_W - nw) / 2);
  const padT = Math.floor((CELL_H - nh) / 2);
  const padR = CELL_W - nw - padL;
  const padB = CELL_H - nh - padT;
  return await sharp(resized, { raw: { width: nw, height: nh, channels: ch } })
    .extend({ top: padT, bottom: padB, left: padL, right: padR, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

// 沿循环均匀采样到 count 帧（count = 该状态的规范帧数，最多 8）
function pickFrames(N, count) {
  const idx = [];
  for (let i = 0; i < count; i++) idx.push(Math.round(i * N / count) % N);
  return idx;
}

const composites = [];
const rowsMeta = [];
let idleCells = null;

for (let r = 0; r < mapping.length; r++) {
  const { file, state, label, frames: frameCount } = mapping[r];
  const fullPath = path.join(SRC_DIR, file);
  const { frames, w, ph, ch } = await readFrames(fullPath);
  const N = frames.length;

  // 全帧求并集包围盒，保证动画不漂移
  let union = null;
  for (const f of frames) {
    const b = alphaBox(f, w, ph, ch);
    if (!b) continue;
    union = union ? {
      minX: Math.min(union.minX, b.minX), minY: Math.min(union.minY, b.minY),
      maxX: Math.max(union.maxX, b.maxX), maxY: Math.max(union.maxY, b.maxY),
    } : b;
  }
  if (!union) { console.log(`⚠️ ${file} 全透明，跳过`); continue; }

  const pick = pickFrames(N, frameCount);
  const rowCells = [];
  for (let c = 0; c < frameCount; c++) {
    const cellPng = await toCell(frames[pick[c]], w, ph, ch, union);
    rowCells.push(cellPng);
    composites.push({ input: cellPng, left: c * CELL_W, top: r * CELL_H });
  }
  // frameCount 之后的格子保持透明（基底本来就是透明画布，不写入即可）
  if (r === 0) idleCells = rowCells;
  rowsMeta.push({ state, label, row: r, frames: pick.map(p => p + 1) });
  console.log(`✓ ${label}(${state})  规范${frameCount}帧 源${N} → 选帧 [${pick.map(p => p + 1).join(',')}]`);
}

// 补齐 V2 规范的视线行（第 9、10 行）：先用待机动画占位，
// 避免 Codex 追踪鼠标时桌宠变成空白。后续可以换成真正的 16 向视线素材。
for (let r = 9; r < 11; r++) {
  // 视线行暂无真实素材，循环复用 idle 的前 6 帧填满 8 格（保持原来的非空占位）
  for (let c = 0; c < 8; c++) {
    composites.push({ input: idleCells[c % idleCells.length], left: c * CELL_W, top: r * CELL_H });
  }
  rowsMeta.push({ state: `look-${r === 9 ? 'a' : 'b'}`, label: r === 9 ? '视线A' : '视线B', row: r, frames: 'idle占位' });
  console.log(`✓ ${r === 9 ? '视线A' : '视线B'}(look)  待机动画占位`);
}

// V2 规范固定 11 行，高 = 11 * 208 = 2288
const totalH = 11 * CELL_H;
const base = sharp({ create: { width: COLS * CELL_W, height: totalH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
const sheet = await base.composite(composites).webp({ lossless: true, quality: 100 }).toFile(path.join(OUT_DIR, 'spritesheet.webp'));

// 同时导出一份 PNG 预览方便直接查看
await sharp({ create: { width: COLS * CELL_W, height: totalH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(composites).png().toFile(path.join(OUT_DIR, 'preview.png'));

console.log('图集尺寸:', 1536, 'x', totalH);
console.log('输出目录:', OUT_DIR);
