const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ytmp3', {
  getOptions: () => ipcRenderer.invoke('options:get'),
  saveOptions: (options) => ipcRenderer.invoke('options:save', options),
  chooseDownloadDir: () => ipcRenderer.invoke('options:chooseDownloadDir'),
  startDownloads: (items) => ipcRenderer.invoke('downloads:start', items),
  openDownloadFolder: () => ipcRenderer.invoke('downloads:openFolder'),
  onDownloadProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('download-progress', listener);
    return () => ipcRenderer.removeListener('download-progress', listener);
  }
});
