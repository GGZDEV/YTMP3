const TUBEDL_BRIDGE_URL = 'http://127.0.0.1:17335';

const TUBEDL_QUALITY_OPTIONS = {
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

let currentVideoUrl = '';

function isWatchPage() {
  return location.hostname.includes('youtube.com') && location.pathname === '/watch' && new URLSearchParams(location.search).has('v');
}

function canonicalVideoUrl() {
  const videoId = new URLSearchParams(location.search).get('v');
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : location.href;
}

function setQualityOptions(formatSelect, qualitySelect) {
  qualitySelect.innerHTML = '';
  TUBEDL_QUALITY_OPTIONS[formatSelect.value].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    qualitySelect.append(option);
  });
}

function findButtonHost() {
  return document.querySelector('#top-level-buttons-computed')
    || document.querySelector('#owner #subscribe-button')
    || document.querySelector('#actions-inner')
    || document.querySelector('#above-the-fold #actions');
}

async function sendToTubeDL(url, format, quality) {
  const response = await fetch(`${TUBEDL_BRIDGE_URL}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, format, quality })
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || 'TubeDL indisponible.');
  return payload;
}

function createInlineControl() {
  const wrapper = document.createElement('div');
  wrapper.className = 'tubedl-inline';
  wrapper.dataset.tubedl = 'true';

  const mainButton = document.createElement('button');
  mainButton.className = 'tubedl-button';
  mainButton.type = 'button';
  mainButton.textContent = 'Ajouter';

  const popover = document.createElement('div');
  popover.className = 'tubedl-popover';

  const row = document.createElement('div');
  row.className = 'tubedl-row';

  const formatLabel = document.createElement('label');
  formatLabel.textContent = 'Format';
  const formatSelect = document.createElement('select');
  [['mp3', 'MP3'], ['mp4', 'MP4']].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    formatSelect.append(option);
  });
  formatLabel.append(formatSelect);

  const qualityLabel = document.createElement('label');
  qualityLabel.textContent = 'Qualité';
  const qualitySelect = document.createElement('select');
  qualityLabel.append(qualitySelect);

  const addButton = document.createElement('button');
  addButton.className = 'tubedl-add';
  addButton.type = 'button';
  addButton.textContent = 'Ajouter à TubeDL';

  const message = document.createElement('p');
  message.className = 'tubedl-message';
  message.textContent = 'TubeDL doit être ouvert.';

  row.append(formatLabel, qualityLabel);
  popover.append(row, addButton, message);
  wrapper.append(mainButton, popover);

  setQualityOptions(formatSelect, qualitySelect);

  formatSelect.addEventListener('change', () => {
    setQualityOptions(formatSelect, qualitySelect);
  });

  mainButton.addEventListener('click', (event) => {
    event.stopPropagation();
    wrapper.classList.toggle('open');
  });

  addButton.addEventListener('click', async () => {
    addButton.disabled = true;
    message.textContent = 'Envoi...';

    try {
      await sendToTubeDL(canonicalVideoUrl(), formatSelect.value, qualitySelect.value);
      message.textContent = 'Ajouté dans TubeDL.';
      setTimeout(() => wrapper.classList.remove('open'), 900);
    } catch (error) {
      message.textContent = error.message;
    } finally {
      addButton.disabled = false;
    }
  });

  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) wrapper.classList.remove('open');
  });

  return wrapper;
}

function injectTubeDLButton() {
  if (!isWatchPage()) return;
  if (document.querySelector('[data-tubedl="true"]')) return;

  const host = findButtonHost();
  if (!host) return;

  host.append(createInlineControl());
  currentVideoUrl = canonicalVideoUrl();
}

function scheduleInjection() {
  window.requestAnimationFrame(() => {
    injectTubeDLButton();
  });
}

const observer = new MutationObserver(() => {
  const nextUrl = canonicalVideoUrl();
  if (nextUrl !== currentVideoUrl || !document.querySelector('[data-tubedl="true"]')) {
    scheduleInjection();
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
scheduleInjection();
