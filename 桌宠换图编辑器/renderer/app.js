const STATES = [
  { state: 'idle', label: '待机', code: 'idle' },
  { state: 'running-right', label: '向右移动', code: 'running-right' },
  { state: 'running-left', label: '向左移动', code: 'running-left' },
  { state: 'waving', label: '互动', code: 'waving' },
  { state: 'jumping', label: '任务完成', code: 'jumping' },
  { state: 'failed', label: '任务失败', code: 'failed' },
  { state: 'waiting', label: '等待确认', code: 'waiting' },
  { state: 'running', label: '工作中', code: 'running' },
  { state: 'review', label: '检查中', code: 'review' },
];

const slots = {};
const grid = document.getElementById('slots');

for (const s of STATES) {
  const card = document.createElement('div');
  card.className = 'slot';
  card.innerHTML = `
    <div class="slot-head">
      <span class="slot-label">${s.label}</span>
      <span class="slot-code">${s.code}</span>
    </div>
    <div class="slot-preview" data-state="${s.state}"><span class="placeholder">未选择图片</span></div>
    <button class="pick" type="button" data-state="${s.state}">选择图片</button>
    <div class="slot-file" data-state="${s.state}"></div>`;
  grid.appendChild(card);
}

grid.querySelectorAll('.pick').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const state = btn.dataset.state;
    const res = await window.petAPI.pickFile();
    if (!res) return;
    slots[state] = res;
    const preview = grid.querySelector(`.slot-preview[data-state="${state}"]`);
    preview.innerHTML = `<img src="${res.url}" alt="${state}" />`;
    grid.querySelector(`.slot-file[data-state="${state}"]`).textContent = res.path.split(/[\\/]/).pop();
  });
});

const logEl = document.getElementById('log');
function addLog(msg) {
  logEl.textContent += (logEl.textContent ? '\n' : '') + msg;
  logEl.scrollTop = logEl.scrollHeight;
}

// 目标路径预览
const petId = document.getElementById('petId');
const targetPreview = document.getElementById('targetPreview');
const targetCode = document.getElementById('targetCode');
let customPath = '';

async function refreshTarget() {
  const mode = document.querySelector('input[name="target"]:checked').value;
  if (mode === 'install') {
    const dir = await window.petAPI.defaultInstallPath(petId.value.trim() || 'mypet');
    targetPreview.innerHTML = '目标：<code>' + dir.replace(/</g, '&lt;') + '</code>';
  } else {
    targetPreview.innerHTML = customPath
      ? '目标：<code>' + customPath.replace(/</g, '&lt;') + '</code>'
      : '先点击「选择文件夹」';
  }
}

petId.addEventListener('input', refreshTarget);
document.querySelectorAll('input[name="target"]').forEach((r) => r.addEventListener('change', () => {
  document.getElementById('customTarget').classList.toggle('hidden', r.value === 'install');
  refreshTarget();
}));

document.getElementById('pickFolder').addEventListener('click', async () => {
  const dir = await window.petAPI.pickFolder();
  if (!dir) return;
  customPath = dir;
  document.getElementById('customPath').textContent = dir;
  refreshTarget();
});

const buildBtn = document.getElementById('buildBtn');
buildBtn.addEventListener('click', async () => {
  const missing = STATES.filter((s) => !slots[s.state]);
  if (missing.length) {
    addLog('⚠️ 还有未选择图片的状态：' + missing.map((m) => m.label).join('、'));
    return;
  }
  const id = petId.value.trim() || 'mypet';
  if (/[\\/:*?"<>|\s]/.test(id)) {
    addLog('⚠️ 安装目录名含非法字符，不能用空格和 \\ / : * ? " < > |');
    return;
  }
  if (/^\.+$/.test(id)) {
    addLog('⚠️ 安装目录名不能用 . 或 ..');
    return;
  }
  const mode = document.querySelector('input[name="target"]:checked').value;
  if (mode === 'custom' && !customPath) {
    addLog('⚠️ 请先选择输出文件夹');
    return;
  }

  // 输出目录由主进程决定（install → ~/.codex/pets/<id>，custom → 上次选择的文件夹），这里不传路径
  const config = {
    id,
    mode,
    displayName: document.getElementById('petName').value.trim() || '我的桌宠',
    description: document.getElementById('petDesc').value.trim(),
    states: STATES.map((s) => ({ state: s.state, file: slots[s.state].path })),
  };

  addLog('开始生成…');
  buildBtn.disabled = true;
  await window.petAPI.build(config);
});

window.petAPI.onLog(addLog);
window.petAPI.onDone((info) => {
  buildBtn.disabled = false;
  if (info.ok) {
    addLog('✅ 完成！已输出到：' + info.outDir);
    addLog('👉 重新打开 Codex，在「设置 → Pets」刷新列表后选择「' + (document.getElementById('petName').value.trim() || '我的桌宠') + '」');
  } else {
    addLog('❌ 生成失败：' + info.error);
  }
});

refreshTarget();
