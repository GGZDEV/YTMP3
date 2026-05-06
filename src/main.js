const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const ffmpegStatic = require('ffmpeg-static');

const DEFAULT_OPTIONS = {
  downloadDir: path.join(app.getPath('downloads'), 'TubeDL'),
  defaultFormat: 'mp3',
  defaultQuality: {
    mp3: 'best',
    mp4: '720'
  }
};

let mainWindow;
let currentProcess = null;

function ytDlpCommand() {
  const localBinary = path.join(app.getAppPath(), 'bin', 'yt-dlp.exe').replace('app.asar', 'app.asar.unpacked');
  return fsSync.existsSync(localBinary) ? localBinary : 'yt-dlp';
}

function ffmpegPath() {
  if (!ffmpegStatic) return null;
  return ffmpegStatic.replace('app.asar', 'app.asar.unpacked');
}

function optionsPath() {
  return path.join(app.getPath('userData'), 'options.json');
}

async function ensureDownloadDir(downloadDir) {
  await fs.mkdir(downloadDir, { recursive: true });
}

async function readOptions() {
  try {
    const raw = await fs.readFile(optionsPath(), 'utf8');
    return normalizeOptions(JSON.parse(raw));
  } catch {
    await ensureDownloadDir(DEFAULT_OPTIONS.downloadDir);
    return { ...DEFAULT_OPTIONS, defaultQuality: { ...DEFAULT_OPTIONS.defaultQuality } };
  }
}

function normalizeOptions(options) {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    defaultQuality: {
      ...DEFAULT_OPTIONS.defaultQuality,
      ...(options && options.defaultQuality)
    }
  };
}

async function writeOptions(options) {
  const normalized = normalizeOptions(options);
  await ensureDownloadDir(normalized.downloadDir);
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await fs.writeFile(optionsPath(), JSON.stringify(normalized, null, 2));
  return normalized;
}

function createWindow() {
  Menu.setApplicationMenu(null);

  const appIcon = path.join(app.getAppPath(), 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 940,
    height: 700,
    resizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    backgroundColor: '#0d0b10',
    icon: appIcon,
    title: 'TubeDL',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function getFormatArgs(item) {
  if (item.format === 'mp3') {
    const qualityMap = {
      best: '0',
      '320': '0',
      '192': '5',
      '128': '7'
    };

    return [
      '-x',
      '--audio-format',
      'mp3',
      '--audio-quality',
      qualityMap[item.quality] || '0'
    ];
  }

  const formatMap = {
    best: 'bv*+ba/b',
    '1080': 'bv*[height<=1080]+ba/b[height<=1080]',
    '720': 'bv*[height<=720]+ba/b[height<=720]',
    '480': 'bv*[height<=480]+ba/b[height<=480]',
    '360': 'bv*[height<=360]+ba/b[height<=360]'
  };

  return [
    '-f',
    formatMap[item.quality] || formatMap.best,
    '--merge-output-format',
    'mp4'
  ];
}

function sendProgress(payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('download-progress', payload);
}

async function runDownload(item, options) {
  await ensureDownloadDir(options.downloadDir);

  return new Promise((resolve) => {
    const outputTemplate = path.join(options.downloadDir, '%(title).180B [%(id)s].%(ext)s');
    const args = [
      '--newline',
      '--no-playlist',
      '-o',
      outputTemplate,
      ...getFormatArgs(item),
      item.url
    ];
    const ffmpegBinary = ffmpegPath();

    if (ffmpegBinary && fsSync.existsSync(ffmpegBinary)) {
      args.unshift('--ffmpeg-location', path.dirname(ffmpegBinary));
    }

    currentProcess = spawn(ytDlpCommand(), args, {
      windowsHide: true,
      env: {
        ...process.env,
        PATH: ffmpegBinary
          ? `${path.dirname(ffmpegBinary)}${path.delimiter}${process.env.PATH || ''}`
          : process.env.PATH
      }
    });

    let log = '';

    currentProcess.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      log += text;
      const percentMatch = text.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
      const destinationMatch = text.match(/\[download\] Destination: (.+)/);

      if (percentMatch) {
        sendProgress({ id: item.id, status: 'downloading', progress: Number(percentMatch[1]) });
      }

      if (destinationMatch) {
        sendProgress({ id: item.id, filename: path.basename(destinationMatch[1].trim()) });
      }
    });

    currentProcess.stderr.on('data', (chunk) => {
      log += chunk.toString();
    });

    currentProcess.on('error', (error) => {
      currentProcess = null;
      resolve({
        ok: false,
        error: error.code === 'ENOENT'
          ? 'yt-dlp est introuvable. Installe yt-dlp puis relance le téléchargement.'
          : error.message
      });
    });

    currentProcess.on('close', (code) => {
      currentProcess = null;
      resolve({
        ok: code === 0,
        error: code === 0 ? null : cleanError(log) || `yt-dlp a terminé avec le code ${code}.`
      });
    });
  });
}

function cleanError(log) {
  const lines = log
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const errorLine = [...lines].reverse().find((line) => line.toLowerCase().includes('error'));
  return errorLine || lines.at(-1) || '';
}

app.whenReady().then(async () => {
  await writeOptions(await readOptions());
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (currentProcess) currentProcess.kill();
});

ipcMain.handle('options:get', () => readOptions());

ipcMain.handle('options:save', (_event, options) => writeOptions(options));

ipcMain.handle('options:chooseDownloadDir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });

  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('downloads:start', async (_event, items) => {
  const options = await readOptions();
  const results = [];

  for (const item of items) {
    sendProgress({ id: item.id, status: 'downloading', progress: 0 });
    const result = await runDownload(item, options);
    results.push({ id: item.id, ...result });
    sendProgress({
      id: item.id,
      status: result.ok ? 'done' : 'error',
      progress: result.ok ? 100 : 0,
      error: result.error
    });
  }

  return results;
});

ipcMain.handle('downloads:openFolder', async () => {
  const options = await readOptions();
  await ensureDownloadDir(options.downloadDir);
  return shell.openPath(options.downloadDir);
});
