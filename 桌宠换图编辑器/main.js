const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');

let mainWindow = null;
let lastPickedDir = null; // pick-folder 对话框最后选中的目录，build 只允许写到它

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: '桌宠换图编辑器',
    backgroundColor: '#14101f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('pick-file', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: '选择图片（GIF / PNG / WebP）',
    properties: ['openFile'],
    filters: [
      { name: '图片', extensions: ['gif', 'png', 'webp', 'apng', 'jpg', 'jpeg'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  });
  if (res.canceled || !res.filePaths.length) return null;
  const p = res.filePaths[0];
  return { path: p, url: pathToFileURL(p).href };
});

ipcMain.handle('pick-folder', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: '选择输出文件夹',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || !res.filePaths.length) return null;
  lastPickedDir = res.filePaths[0];
  return lastPickedDir;
});

ipcMain.handle('default-install-path', (_e, id) => {
  return path.join(os.homedir(), '.codex', 'pets', String(id || 'mypet'));
});

// 桌宠 id 合法性：非法字符 + 全点（"."/".." 会被 path.join 折叠到上级目录，造成路径穿越）
function validPetId(id) {
  const v = String(id ?? '');
  if (!v) return false;
  if (/[\\/:*?"<>|\s]/.test(v)) return false;
  if (/^\.+$/.test(v)) return false;
  return true;
}

ipcMain.handle('build', async (_e, config) => {
  const send = (msg) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('build-log', msg);
  };
  try {
    // 输出目录由主进程决定，不信任渲染进程传来的任意路径
    if (!config || (config.mode !== 'install' && config.mode !== 'custom')) {
      throw new Error('无效的目标类型');
    }
    let outDir;
    if (config.mode === 'install') {
      if (!validPetId(config.id)) {
        throw new Error('桌宠 id 非法：不能用空格和 \\ / : * ? " < > |，也不能用 . 或 ..');
      }
      outDir = path.join(os.homedir(), '.codex', 'pets', String(config.id));
    } else {
      if (!lastPickedDir) throw new Error('请先选择输出文件夹');
      outDir = lastPickedDir;
    }
    // Windows 下动态 import 必须用 file:// URL，直接传 C:\ 路径会被 ESM loader 拒绝
    const { buildFromConfig } = await import(pathToFileURL(path.join(__dirname, 'lib', 'build-pet.mjs')).href);
    const res = await buildFromConfig({ ...config, outDir }, send);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('build-done', { ok: true, outDir: res.outDir });
    return { ok: true };
  } catch (err) {
    const msg = String(err?.message ?? err);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('build-done', { ok: false, error: msg });
    return { ok: false, error: msg };
  }
});
