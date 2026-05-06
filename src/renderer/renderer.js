const QUALITY_OPTIONS = {
  mp3: [
    ['best', 'Meilleure'],
    ['320', '320 kbps'],
    ['192', '192 kbps'],
    ['128', '128 kbps']
  ],
  mp4: [
    ['best', 'Meilleure'],
    ['1080', '1080p'],
    ['720', '720p'],
    ['480', '480p'],
    ['360', '360p']
  ]
};

const state = {
  queue: [],
  options: null,
  isDownloading: false
};

const elements = {
  tabs: document.querySelectorAll('.tab'),
  viewTitle: document.querySelector('#view-title'),
  views: {
    download: document.querySelector('#download-view'),
    options: document.querySelector('#options-view')
  },
  addForm: document.querySelector('#add-form'),
  urlInput: document.querySelector('#url-input'),
  formatSelect: document.querySelector('#format-select'),
  qualitySelect: document.querySelector('#quality-select'),
  queueList: document.querySelector('#queue-list'),
  emptyState: document.querySelector('#empty-state'),
  clearButton: document.querySelector('#clear-button'),
  downloadButton: document.querySelector('#download-button'),
  optionsForm: document.querySelector('#options-form'),
  downloadDir: document.querySelector('#download-dir'),
  chooseFolder: document.querySelector('#choose-folder'),
  openFolder: document.querySelector('#open-folder'),
  defaultFormat: document.querySelector('#default-format'),
  defaultMp3Quality: document.querySelector('#default-mp3-quality'),
  defaultMp4Quality: document.querySelector('#default-mp4-quality'),
  optionStatus: document.querySelector('#option-status')
};

function setTab(tabName) {
  elements.tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === tabName));
  Object.entries(elements.views).forEach(([name, view]) => view.classList.toggle('active', name === tabName));
  elements.viewTitle.textContent = tabName === 'options' ? 'Options' : 'Télécharger';
}

function setQualityOptions(format, selectedValue) {
  elements.qualitySelect.innerHTML = '';
  QUALITY_OPTIONS[format].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    elements.qualitySelect.append(option);
  });
  elements.qualitySelect.value = selectedValue || QUALITY_OPTIONS[format][0][0];
}

function isValidYoutubeUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    return ['youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com'].includes(host);
  } catch {
    return false;
  }
}

function addQueueItem(url, format, quality) {
  state.queue.push({
    id: crypto.randomUUID(),
    url,
    format,
    quality,
    status: 'queued',
    progress: 0,
    error: null,
    filename: null
  });
  renderQueue();
}

function renderQueue() {
  elements.queueList.innerHTML = '';
  elements.emptyState.classList.toggle('visible', state.queue.length === 0);

  state.queue.forEach((item) => {
    const row = document.createElement('article');
    row.className = 'queue-item';

    const main = document.createElement('div');
    main.className = 'queue-main';

    const url = document.createElement('p');
    url.className = 'queue-url';
    url.title = item.url;
    url.textContent = item.url;

    const meta = document.createElement('p');
    meta.className = 'queue-meta';
    meta.textContent = `${item.format.toUpperCase()} · ${labelForQuality(item.format, item.quality)}${item.filename ? ` · ${item.filename}` : ''}`;

    const statusRow = document.createElement('div');
    statusRow.className = 'status-row';

    const track = document.createElement('div');
    track.className = 'progress-track';

    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    fill.style.width = `${item.progress || 0}%`;
    track.append(fill);

    const status = document.createElement('span');
    status.className = `status ${item.status}`;
    status.textContent = statusLabel(item);

    statusRow.append(track, status);
    main.append(url, meta, statusRow);

    if (item.error) {
      const error = document.createElement('p');
      error.className = 'queue-meta status error';
      error.textContent = item.error;
      main.append(error);
    }

    const remove = document.createElement('button');
    remove.className = 'ghost remove-button';
    remove.type = 'button';
    remove.textContent = '×';
    remove.title = 'Retirer';
    remove.disabled = state.isDownloading;
    remove.addEventListener('click', () => {
      state.queue = state.queue.filter((candidate) => candidate.id !== item.id);
      renderQueue();
    });

    row.append(main, remove);
    elements.queueList.append(row);
  });

  elements.downloadButton.disabled = state.isDownloading || state.queue.length === 0;
  elements.clearButton.disabled = state.isDownloading || state.queue.length === 0;
}

function labelForQuality(format, quality) {
  return QUALITY_OPTIONS[format].find(([value]) => value === quality)?.[1] || quality;
}

function statusLabel(item) {
  if (item.status === 'done') return 'Terminé';
  if (item.status === 'error') return 'Erreur';
  if (item.status === 'downloading') return `${Math.round(item.progress || 0)}%`;
  return 'En attente';
}

async function loadOptions() {
  state.options = await window.ytmp3.getOptions();
  elements.downloadDir.value = state.options.downloadDir;
  elements.defaultFormat.value = state.options.defaultFormat;
  elements.defaultMp3Quality.value = state.options.defaultQuality.mp3;
  elements.defaultMp4Quality.value = state.options.defaultQuality.mp4;
  elements.formatSelect.value = state.options.defaultFormat;
  setQualityOptions(state.options.defaultFormat, state.options.defaultQuality[state.options.defaultFormat]);
}

elements.tabs.forEach((tab) => {
  tab.addEventListener('click', () => setTab(tab.dataset.tab));
});

elements.formatSelect.addEventListener('change', () => {
  const format = elements.formatSelect.value;
  setQualityOptions(format, state.options?.defaultQuality?.[format]);
});

elements.addForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const url = elements.urlInput.value.trim();

  if (!isValidYoutubeUrl(url)) {
    elements.urlInput.setCustomValidity('Colle une URL YouTube valide.');
    elements.urlInput.reportValidity();
    return;
  }

  elements.urlInput.setCustomValidity('');
  addQueueItem(url, elements.formatSelect.value, elements.qualitySelect.value);
  elements.urlInput.value = '';
  elements.urlInput.focus();
});

elements.clearButton.addEventListener('click', () => {
  state.queue = [];
  renderQueue();
});

elements.downloadButton.addEventListener('click', async () => {
  state.isDownloading = true;
  state.queue = state.queue.map((item) => item.status === 'done' ? item : { ...item, status: 'queued', error: null });
  renderQueue();

  const pendingItems = state.queue.filter((item) => item.status !== 'done');
  await window.ytmp3.startDownloads(pendingItems);

  state.isDownloading = false;
  renderQueue();
});

elements.chooseFolder.addEventListener('click', async () => {
  const folder = await window.ytmp3.chooseDownloadDir();
  if (folder) {
    elements.downloadDir.value = folder;
  }
});

elements.openFolder.addEventListener('click', () => {
  window.ytmp3.openDownloadFolder();
});

elements.optionsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  state.options = await window.ytmp3.saveOptions({
    downloadDir: elements.downloadDir.value,
    defaultFormat: elements.defaultFormat.value,
    defaultQuality: {
      mp3: elements.defaultMp3Quality.value,
      mp4: elements.defaultMp4Quality.value
    }
  });

  elements.formatSelect.value = state.options.defaultFormat;
  setQualityOptions(state.options.defaultFormat, state.options.defaultQuality[state.options.defaultFormat]);
  elements.optionStatus.textContent = 'Options enregistrées.';
  setTimeout(() => {
    elements.optionStatus.textContent = '';
  }, 2200);
});

window.ytmp3.onDownloadProgress((payload) => {
  state.queue = state.queue.map((item) => (
    item.id === payload.id
      ? { ...item, ...payload }
      : item
  ));
  renderQueue();
});

loadOptions().then(renderQueue);
