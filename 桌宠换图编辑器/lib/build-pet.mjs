import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildStateCells, composeSheet } from './pet-core.mjs';

// 9 个状态按行序排列（行 0-8，顺序不能变）
export const STATE_ORDER = [
  { state: 'idle', label: '待机' },
  { state: 'running-right', label: '向右移动' },
  { state: 'running-left', label: '向左移动' },
  { state: 'waving', label: '互动' },
  { state: 'jumping', label: '任务完成' },
  { state: 'failed', label: '任务失败' },
  { state: 'waiting', label: '等待确认' },
  { state: 'running', label: '工作中' },
  { state: 'review', label: '检查中' },
];

// config: { id, displayName, description, outDir, states: [{ state, file }] }
export async function buildFromConfig(config, onStatus = () => {}) {
  if (!config.states || config.states.length !== STATE_ORDER.length) {
    throw new Error(`需要恰好 ${STATE_ORDER.length} 个状态（当前 ${config.states?.length ?? 0} 个）`);
  }
  const have = new Set(config.states.map((s) => s.state));
  const missing = STATE_ORDER.filter((s) => !have.has(s.state));
  if (missing.length) throw new Error(`缺少状态：${missing.map((m) => m.label).join('、')}`);

  for (const s of config.states) {
    if (!s.file) throw new Error(`状态「${STATE_ORDER.find((x) => x.state === s.state)?.label ?? s.state}」未选择图片`);
    if (!fs.existsSync(s.file)) throw new Error(`找不到文件：${s.file}`);
  }
  if (!config.outDir) throw new Error('未指定输出目录');
  if (!config.id) throw new Error('缺少桌宠 id');
  if (/[\\/:*?"<>|\s]/.test(config.id)) {
    throw new Error(`桌宠 id「${config.id}」包含非法字符（不能用空格和 \\ / : * ? " < > |）`);
  }
  // 全点 id（"."/".."）会被 path.join 折叠到上级目录，禁止，防止路径穿越
  if (/^\.+$/.test(config.id)) {
    throw new Error(`桌宠 id「${config.id}」非法：不能用 . 或 ..（会改变输出目录层级）`);
  }

  const ordered = STATE_ORDER.map((s) => config.states.find((x) => x.state === s.state));

  onStatus('读取素材、按并集对齐动画…');
  const rows = await buildStateCells(ordered.map((s) => ({ file: s.file, state: s.state })));

  onStatus('拼合 1536×2288 图集…');
  const { webp } = await composeSheet(rows);

  fs.mkdirSync(config.outDir, { recursive: true });
  await fs.promises.writeFile(path.join(config.outDir, 'spritesheet.webp'), webp);

  const pet = {
    id: config.id,
    displayName: config.displayName,
    description: config.description,
    spriteVersionNumber: 2,
    spritesheetPath: 'spritesheet.webp',
  };
  await fs.promises.writeFile(path.join(config.outDir, 'pet.json'), JSON.stringify(pet, null, 2));

  onStatus('已写入 spritesheet.webp + pet.json');
  return {
    outDir: config.outDir,
    states: rows.map((r) => ({ state: r.state, frames: r.cells.length, pick: r.pick.map((p) => p + 1) })),
  };
}

// CLI 入口：node 桌宠换图编辑器/lib/build-pet.mjs <config.json>
const isCli = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isCli) {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error('用法：node 桌宠换图编辑器/lib/build-pet.mjs <config.json>');
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  buildFromConfig(config, (msg) => console.log(msg))
    .then((res) => {
      console.log('OK 已输出到：' + res.outDir);
      res.states.forEach((s) => console.log(`  ${s.state}: ${s.frames} 帧`));
    })
    .catch((err) => {
      console.error('ERR ' + (err?.message ?? err));
      process.exit(1);
    });
}
