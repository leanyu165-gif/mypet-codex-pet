const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  pickFile: () => ipcRenderer.invoke('pick-file'),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  defaultInstallPath: (id) => ipcRenderer.invoke('default-install-path', id),
  build: (config) => ipcRenderer.invoke('build', config),
  onLog: (cb) => ipcRenderer.on('build-log', (_e, msg) => cb(msg)),
  onDone: (cb) => ipcRenderer.on('build-done', (_e, info) => cb(info)),
});
