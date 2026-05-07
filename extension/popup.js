const BRIDGE_URL = 'http://127.0.0.1:17335';

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

const elements = {
  connectionStatus: document.querySelector('#connection-status'),
  currentUrl: document.querySelector('#current-url'),
  format: document.querySelector('#format'),
  quality: document.querySelector('#quality'),
  download: document.querySelector('#download'),
  message: document.querySelector('#message')
};

let activeUrl = '';

function setQualityOptions(format) {
  elements.quality.innerHTML = '';
  QUALITY_OPTIONS[format].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    elements.quality.append(option);
  });
}

function isYoutubeUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    return ['youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com'].includes(host);
  } catch {
    return false;
  }
}

async function getActiveTabUrl() {
  const tabs = await new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, resolve);
  });
  return tabs[0]?.url || '';
}

async function checkBridge() {
  try {
    const response = await fetch(`${BRIDGE_URL}/health`);
    const payload = await response.json();
    elements.connectionStatus.textContent = payload.ok ? 'App connectée' : 'App indisponible';
    return Boolean(payload.ok);
  } catch {
    elements.connectionStatus.textContent = 'Ouvre TubeDL pour continuer';
    return false;
  }
}

async function init() {
  setQualityOptions(elements.format.value);
  activeUrl = await getActiveTabUrl();
  elements.currentUrl.textContent = activeUrl || 'Aucun onglet actif';
  const bridgeReady = await checkBridge();
  elements.download.disabled = !bridgeReady || !isYoutubeUrl(activeUrl);

  if (!isYoutubeUrl(activeUrl)) {
    elements.message.textContent = 'Ouvre une page YouTube.';
  }
}

elements.format.addEventListener('change', () => {
  setQualityOptions(elements.format.value);
});

elements.download.addEventListener('click', async () => {
  elements.download.disabled = true;
  elements.message.textContent = 'Envoi vers TubeDL...';

  try {
    const response = await fetch(`${BRIDGE_URL}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: activeUrl,
        format: elements.format.value,
        quality: elements.quality.value
      })
    });

    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || 'Erreur inconnue.');

    elements.message.textContent = 'Ajouté à TubeDL.';
  } catch (error) {
    elements.message.textContent = error.message;
    elements.download.disabled = false;
  }
});

init();
