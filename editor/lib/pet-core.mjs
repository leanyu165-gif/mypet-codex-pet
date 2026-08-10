import sharp from 'sharp';

export const CELL_W = 192;
export const CELL_H = 208;
export const COLS = 8;
export const ROWS = 11;
export const MARGIN = 2; // 内容四周保留的安全边距，避免贴边/接缝

// 引擎每行固定帧数（V2 规范，引擎只播每行前 N 帧）
export const SPEC = {
  idle: 6,
  'running-right': 8,
  'running-left': 8,
  waving: 4,
  jumping: 5,
  failed: 8,
  waiting: 6,
  running: 6,
  review: 6,
};

// 读取一个 GIF 的全部帧为 RGBA raw
export async function readFrames(file) {
  const meta = await sharp(file, { animated: true }).metadata();
  const pages = meta.pages ?? 1;
  // 非动图（JPG / 单帧 PNG）没有 pageHeight，退回整图高度
  const ph = meta.pageHeight ?? meta.height;
  // ensureAlpha()：JPG / 无透明通道的 PNG 会补上 alpha=255，统一成 4 通道，
  // 否则 alphaBox 会把蓝色通道误当 alpha，导致裁切错误
  const { data, info } = await sharp(file, { animated: true, pages: -1 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, ch = info.channels;
  const frames = [];
  for (let p = 0; p < pages; p++) {
    const off = p * ph * w * ch;
    frames.push(Buffer.from(data.subarray(off, off + ph * w * ch)));
  }
  return { frames, w, ph, ch };
}

// 计算一帧的非透明包围盒
export function alphaBox(buf, w, h, ch) {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * ch;
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

// 全帧求并集包围盒，保证动画不漂移
export function analyzeUnion(frames, w, h, ch) {
  let union = null;
  for (const f of frames) {
    const b = alphaBox(f, w, h, ch);
    if (!b) continue;
    union = union
      ? {
          minX: Math.min(union.minX, b.minX), minY: Math.min(union.minY, b.minY),
          maxX: Math.max(union.maxX, b.maxX), maxY: Math.max(union.maxY, b.maxY),
        }
      : b;
  }
  return union;
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
export async function toCell(buf, w, h, ch, box) {
  const { buf: cropped, cw, chh } = cropRaw(buf, w, h, ch, box);
  const fitW = CELL_W - 2 * MARGIN;
  const fitH = CELL_H - 2 * MARGIN;
  const scale = Math.min(fitW / cw, fitH / chh);
  const nw = Math.max(1, Math.round(cw * scale));
  const nh = Math.max(1, Math.round(chh * scale));
  const resized = await sharp(cropped, { raw: { width: cw, height: chh, channels: ch } })
    .resize(nw, nh, { fit: 'fill' })
    .sharpen({ sigma: 1.2 }) // 缩小后锐化，补偿下采样损失的清晰度
    .raw()
    .toBuffer();
  const padL = Math.floor((CELL_W - nw) / 2);
  const padT = Math.floor((CELL_H - nh) / 2);
  const padR = CELL_W - nw - padL;
  const padB = CELL_H - nh - padT;
  return sharp(resized, { raw: { width: nw, height: nh, channels: ch } })
    .extend({ top: padT, bottom: padB, left: padL, right: padR, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

// 沿循环均匀采样到 count 帧（count = 该状态的规范帧数，最多 8）
export function pickFrames(N, count) {
  const idx = [];
  for (let i = 0; i < count; i++) idx.push(Math.round(i * N / count) % N);
  return idx;
}

// 输入：按行序排列的 9 个状态 [{ file, state }]
// 输出：每行 { state, cells: PNG[], pick: 采样帧索引 }（cells 数量 = 该状态规范帧数）
export async function buildStateCells(states) {
  const rows = [];
  for (const { file, state } of states) {
    const { frames, w, ph, ch } = await readFrames(file);
    const union = analyzeUnion(frames, w, ph, ch);
    if (!union) throw new Error(`${file} 全透明，无法生成`);
    const count = SPEC[state] ?? 8;
    const pick = pickFrames(frames.length, count);
    const cells = [];
    for (const p of pick) cells.push(await toCell(frames[p], w, ph, ch, union));
    rows.push({ state, cells, pick });
  }
  return rows;
}

// 把 9 个状态行 + 视线行(9-10，用 idle 占位，避免追踪鼠标时空白) 合成 1536×2288 图集
export async function composeSheet(rows) {
  const composites = [];
  rows.forEach((row, r) => {
    row.cells.forEach((cell, c) => {
      composites.push({ input: cell, left: c * CELL_W, top: r * CELL_H });
    });
  });
  const idle = rows[0]?.cells ?? [];
  for (let r = 9; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      composites.push({ input: idle[c % idle.length], left: c * CELL_W, top: r * CELL_H });
    }
  }
  const base = sharp({
    create: { width: COLS * CELL_W, height: ROWS * CELL_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  });
  const webp = await base.clone().composite(composites).webp({ lossless: true, quality: 100 }).toBuffer();
  const png = await base.clone().composite(composites).png().toBuffer();
  return { webp, png };
}
