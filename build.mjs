import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { CELL_W, COLS, SPEC, buildStateCells, composeSheet } from './editor/lib/pet-core.mjs';

const SRC_DIR = path.join(import.meta.dirname, '素材');
const OUT_DIR = path.join(import.meta.dirname, 'output/mypet');
const PREVIEW_DIR = path.join(import.meta.dirname, '表情包单张预览');
const README_GIF_DIR = path.join(import.meta.dirname, 'assets/readme/animations'); // 动作图鉴用的高清源 GIF

// 9 个状态按行序排列（行 0-8，顺序不能变）
const mapping = [
  { file: '待机.gif',                      state: 'idle',          label: '待机' },
  { file: '向右移动.gif',                   state: 'running-right', label: '向右移动' },
  { file: '向左移动.gif',                   state: 'running-left',  label: '向左移动' },
  { file: '互动.gif',                      state: 'waving',        label: '互动' },
  { file: '任务完成.gif',                   state: 'jumping',       label: '任务完成' },
  { file: '任务失败.gif',                   state: 'failed',        label: '任务失败' },
  { file: '等待确认{博士，这里有一份文件需要您确认}.gif', state: 'waiting', label: '等待确认' },
  { file: '工作中(送信).gif',               state: 'running',       label: '工作中' },
  { file: '检查中{思考.ing}.gif',           state: 'review',        label: '检查中' },
];

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(PREVIEW_DIR, { recursive: true });
fs.mkdirSync(README_GIF_DIR, { recursive: true });

// 动作图鉴用：把源 GIF 等比缩到 512 宽，输出动画 GIF，保留原始清晰度
async function toReadmeGif(file, outPath) {
  const meta = await sharp(file, { animated: true }).metadata();
  const W = 512;
  const w = Math.min(meta.width, W);
  const h = Math.round((meta.pageHeight ?? meta.height) * (w / meta.width));
  await sharp(file, { animated: true }).resize(w, h).gif().toFile(outPath);
}

const rows = await buildStateCells(mapping.map((m) => ({ file: path.join(SRC_DIR, m.file), state: m.state })));
const { webp, png } = await composeSheet(rows);

await fs.promises.writeFile(path.join(OUT_DIR, 'spritesheet.webp'), webp);
await fs.promises.writeFile(path.join(OUT_DIR, 'preview.png'), png);

for (let r = 0; r < mapping.length; r++) {
  const m = mapping[r];
  const { cells, pick } = rows[r];
  // 每个状态输出一张单帧预览，作为表情包素材
  const previewName = `${String(r + 1).padStart(2, '0')}-${m.label}-${m.state}.png`;
  await fs.promises.writeFile(path.join(PREVIEW_DIR, previewName), cells[0]);
  // 动作图鉴用的高清源 GIF（干净文件名，避免 README 里的括号/花括号破坏 markdown 图片链接）
  const gifName = `${String(r + 1).padStart(2, '0')}-${m.label}-${m.state}.gif`;
  await toReadmeGif(path.join(SRC_DIR, m.file), path.join(README_GIF_DIR, gifName));
  console.log(`✓ ${m.label}(${m.state})  规范${SPEC[m.state]}帧 选帧 [${pick.map((p) => p + 1).join(',')}]`);
}

console.log('图集尺寸:', COLS * CELL_W, 'x', 11 * 208);
console.log('输出目录:', OUT_DIR);
