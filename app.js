// ==========================================
// CONFIGURAÇÃO INTEGRADA DA API (Multi-Provedor RapidAPI)
// ==========================================
const DEFAULT_RAPIDAPI_KEY = '33f3227ee8msh6818ae7d446c656p1a527ejsn067883af0870';
const RAPIDAPI_PROVIDERS = [
  {
    name: 'Instagram Scraper Stable API',
    host: 'instagram-scraper-stable-api.p.rapidapi.com',
    buildUrl: (shortcode, url, cursor) => {
      let ep = `https://instagram-scraper-stable-api.p.rapidapi.com/get_post_comments.php?media_code=${encodeURIComponent(shortcode || url)}`;
      if (cursor) ep += `&pagination_token=${encodeURIComponent(cursor)}`;
      return ep;
    }
  },
  {
    name: 'Instagram Scraper API2',
    host: 'instagram-scraper-api2.p.rapidapi.com',
    buildUrl: (shortcode, url, cursor) => {
      let ep = `https://instagram-scraper-api2.p.rapidapi.com/v1/comments?code_or_id_or_url=${encodeURIComponent(shortcode || url)}`;
      if (cursor) ep += `&pagination_token=${encodeURIComponent(cursor)}`;
      return ep;
    }
  }
];

// ==========================================
// AUDIO SYNTHESIZER (Lazy Web Audio API)
// ==========================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      try {
        audioCtx = new AudioContextClass();
      } catch (e) {
        audioCtx = null;
      }
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playSynthTone(ctx, destNode, freqStart, freqEnd, durationSec, waveType = 'sine', peakGain = 0.1, delaySec = 0) {
  if (!ctx || !destNode) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = ctx.currentTime + delaySec;

    osc.type = waveType;
    osc.frequency.setValueAtTime(freqStart, t0);
    if (freqEnd && freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + durationSec);
    }

    gain.gain.setValueAtTime(peakGain, t0);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + durationSec);

    osc.connect(gain);
    gain.connect(destNode);
    osc.start(t0);
    osc.stop(t0 + durationSec + 0.01);
  } catch (e) {
    // Ignora restrições de áudio do dispositivo
  }
}

function playTickSound(extraDestNode = null) {
  const ctx = getAudioContext();
  if (!ctx) return;
  playSynthTone(ctx, ctx.destination, 620, 110, 0.048, 'sine', 0.075, 0);
  if (extraDestNode) {
    playSynthTone(ctx, extraDestNode, 620, 110, 0.048, 'sine', 0.14, 0);
  }
}

function playCountdownBeep(isGo = false, extraDestNode = null) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const freq = isGo ? 587.33 : 440;
  playSynthTone(ctx, ctx.destination, freq, freq, 0.14, 'triangle', 0.11, 0);
  if (extraDestNode) {
    playSynthTone(ctx, extraDestNode, freq, freq, 0.14, 'triangle', 0.18, 0);
  }
}

function playWinSound(extraDestNode = null) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const notes = [261.63, 329.63, 392.00, 523.25];
  notes.forEach((freq, idx) => {
    playSynthTone(ctx, ctx.destination, freq, freq, 0.48, 'triangle', 0.18, idx * 0.11);
    if (extraDestNode) {
      playSynthTone(ctx, extraDestNode, freq, freq, 0.52, 'triangle', 0.24, idx * 0.11);
    }
  });
}

// ==========================================
// UNBIASED CRYPTOGRAPHIC RANDOM ENGINE (CSPRNG)
// ==========================================
function assertCryptoAvailable() {
  if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') {
    throw new Error('Ambiente sem suporte criptográfico seguro (Web Crypto API). Utilize um navegador moderno atualizado.');
  }
}

/**
 * Retorna um inteiro uniforme em [0, max - 1] usando exclusivamente CSPRNG
 * do sistema operacional com Rejection Sampling (ZERO viés modular em qualquer escala).
 */
function getRandomIndex(max) {
  assertCryptoAvailable();
  const cleanMax = Math.floor(Number(max));
  if (!Number.isFinite(cleanMax) || cleanMax <= 1) return 0;

  if (cleanMax <= 0x100000000) {
    const array = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / cleanMax) * cleanMax;
    let val;
    do {
      window.crypto.getRandomValues(array);
      val = array[0];
    } while (val >= limit);
    return val % cleanMax;
  }

  // Rejeição exata em 53 bits via BigInt para intervalos gigantes sem perda de precisão float
  const MAX_53 = 1n << 53n; // 9007199254740992n
  const bigMax = BigInt(cleanMax);
  if (bigMax > MAX_53) {
    throw new Error('Intervalo acima do limite seguro de inteiros de 53 bits.');
  }
  const limit = (MAX_53 / bigMax) * bigMax;
  const pair = new Uint32Array(2);
  let candidate;
  do {
    window.crypto.getRandomValues(pair);
    const hi21 = BigInt(pair[0] & 0x1fffff);
    const lo32 = BigInt(pair[1]);
    candidate = (hi21 << 32n) | lo32;
  } while (candidate >= limit);
  return Number(candidate % bigMax);
}

function generateEntropyHex(byteCount = 16) {
  assertCryptoAvailable();
  const bytes = new Uint8Array(byteCount);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function computeSha256Hex(message) {
  if (window.crypto?.subtle && typeof window.crypto.subtle.digest === 'function') {
    const data = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback determinístico FNV-1a estendido apenas caso contexto não-HTTPS local bloqueie SubtleCrypto
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < message.length; i++) {
    const c = message.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 16777619) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).repeat(4);
}

function stripInvisibleChars(str) {
  return String(str || '').replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '');
}

// ==========================================
// DOM ELEMENTS & STATE
// ==========================================
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Ações do Topo (Histórico & Modo Live Tela Cheia)
const btnOpenHistory = document.getElementById('btn-open-history');
const historyCountBadge = document.getElementById('history-count-badge');
const btnFullscreen = document.getElementById('btn-fullscreen');
const historyModal = document.getElementById('history-modal');
const btnCloseHistory = document.getElementById('btn-close-history');
const btnCloseHistoryBottom = document.getElementById('btn-close-history-bottom');
const historyList = document.getElementById('history-list');
const btnClearHistory = document.getElementById('btn-clear-history');

// Indicadores de Passo a Passo (Stepper 1-2-3) & Navegação Rápida
const stepIndicators = [
  document.getElementById('step-indicator-1'),
  document.getElementById('step-indicator-2'),
  document.getElementById('step-indicator-3')
];
const navPillBtns = document.querySelectorAll('.btn-nav-pill');

// Identificação do Sorteio & Suspense da Roleta
const giveawayMetaBox = document.getElementById('giveaway-meta-box');
const giveawayTitleInput = document.getElementById('giveaway-title');
const drawDurationSelect = document.getElementById('draw-duration-select');

// Aba 1: Conexão Oficial Instagram (Meta Graph API) & Link
const DEFAULT_META_APP_ID = '1191736836515840';
const btnInstaConnect = document.getElementById('btn-insta-connect');
const btnFbConnectAlt = document.getElementById('btn-fb-connect-alt');
const instaConnectedBox = document.getElementById('insta-connected-box');
const instaProfileAvatar = document.getElementById('insta-profile-avatar');
const instaProfileHandle = document.getElementById('insta-profile-handle');
const instaProfileSubtitle = document.getElementById('insta-profile-subtitle');
const btnRefreshInstaPosts = document.getElementById('btn-refresh-insta-posts');
const btnInstaLogout = document.getElementById('btn-insta-logout');
const instaPostsStatus = document.getElementById('insta-posts-status');
const instaPostsGrid = document.getElementById('insta-posts-grid');

const postUrlInput = document.getElementById('post-url');
const detectedNetworkBadge = document.getElementById('detected-network');
const btnFetchComments = document.getElementById('btn-fetch-comments');
const btnFetchText = document.getElementById('btn-fetch-text');
const fetchSpinner = document.getElementById('fetch-spinner');
const fetchStatusMsg = document.getElementById('fetch-status-msg');
const linkPreviewBox = document.getElementById('link-preview-box');
const linkCommentsInput = document.getElementById('link-comments-input');
const linkLinesCountBadge = document.getElementById('link-lines-count');
const linkWinnersCountInput = document.getElementById('link-winners-count');
const linkSubstitutesCountInput = document.getElementById('link-substitutes-count');
const linkRemoveDuplicates = document.getElementById('link-remove-duplicates');
const linkMinMentions = document.getElementById('link-min-mentions');
const linkKeywordFilter = document.getElementById('link-keyword-filter');
const linkBlacklist = document.getElementById('link-blacklist');
const btnDrawLink = document.getElementById('btn-draw-link');

// Aba 2: Planilha / Lista
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const triggerFileSelect = document.getElementById('trigger-file-select');
const sheetStatusMsg = document.getElementById('sheet-status-msg');
const namesInput = document.getElementById('names-input');
const linesCountBadge = document.getElementById('lines-count');
const btnClearNames = document.getElementById('btn-clear-names');
const sheetWinnersCountInput = document.getElementById('sheet-winners-count');
const sheetSubstitutesCountInput = document.getElementById('sheet-substitutes-count');
const optRemoveDuplicates = document.getElementById('opt-remove-duplicates');
const sheetMinMentions = document.getElementById('sheet-min-mentions');
const sheetKeywordFilter = document.getElementById('sheet-keyword-filter');
const sheetBlacklist = document.getElementById('sheet-blacklist');
const btnDrawSheet = document.getElementById('btn-draw-sheet');

// Aba 3: Números & Resultados
const btnDrawNumbers = document.getElementById('btn-draw-numbers');
const animationBox = document.getElementById('animation-box');
const animationTitle = document.getElementById('animation-title');
const rouletteDisplay = document.getElementById('roulette-display');
const loadingProgress = document.querySelector('.loading-bar .progress');
const resultBox = document.getElementById('result-box');
const resultGiveawayBadge = document.getElementById('result-giveaway-badge');
const winnersList = document.getElementById('winners-list');
const substitutesSection = document.getElementById('substitutes-section');
const substitutesList = document.getElementById('substitutes-list');
const disqualifiedLogBox = document.getElementById('disqualified-log-box');
const disqualifiedLogList = document.getElementById('disqualified-log-list');
const resultTimestamp = document.getElementById('result-timestamp');
const btnDownloadPdf = document.getElementById('btn-download-pdf');
const btnCopyResult = document.getElementById('btn-copy-result');
const btnNewDraw = document.getElementById('btn-new-draw');

// Certificado de Auditoria Criptográfica
const auditProtocolIdEl = document.getElementById('audit-protocol-id');
const auditPoolSummaryEl = document.getElementById('audit-pool-summary');
const auditSha256HashEl = document.getElementById('audit-sha256-hash');

// Gerador de Post, Vídeo & Marca Própria
const formatBtns = document.querySelectorAll('.format-btn');
const cardWinnerSelectorWrap = document.getElementById('card-winner-selector-wrap');
const cardWinnerSelect = document.getElementById('card-winner-select');
const winnerPostCanvas = document.getElementById('winner-post-canvas');
const resultTitleEditInput = document.getElementById('result-title-edit');
const winnerPhotoUpload = document.getElementById('winner-photo-upload');
const btnUploadPhoto = document.getElementById('btn-upload-photo');
const themeBtns = document.querySelectorAll('.theme-btn');
const brandHandleInput = document.getElementById('brand-handle-input');
const brandLogoUpload = document.getElementById('brand-logo-upload');
const btnUploadBrandLogo = document.getElementById('btn-upload-brand-logo');
const btnClearBrandLogo = document.getElementById('btn-clear-brand-logo');
const btnDownloadPost = document.getElementById('btn-download-post');
const btnGenerateVideo = document.getElementById('btn-generate-video');
const videoRecordingBar = document.getElementById('video-recording-bar');
const videoRecordingText = document.getElementById('video-recording-text');
const videoRecordingFill = document.getElementById('video-recording-fill');
const videoResultBox = document.getElementById('video-result-box');
const generatedVideoPlayer = document.getElementById('generated-video-player');
const btnSaveReadyVideo = document.getElementById('btn-save-ready-video');

const BRAND_THEMES = {
  royal: {
    bgStops: ['#090d1e', '#19133f', '#2b0f3a', '#090d1c'],
    glowTop: 'rgba(99, 102, 241, 0.34)',
    glowTopZero: 'rgba(99, 102, 241, 0)',
    glowBottom: 'rgba(236, 72, 153, 0.30)',
    glowBottomZero: 'rgba(236, 72, 153, 0)',
    pillFill0: 'rgba(251, 191, 36, 0.20)',
    pillFill1: 'rgba(236, 72, 153, 0.22)',
    pillBorder: 'rgba(251, 191, 36, 0.65)',
    pillText: '#fde68a',
    ringStops: ['#fde68a', '#f59e0b', '#ec4899'],
    badgeStops: ['#f59e0b', '#d97706'],
    badgeText: '#0f172a',
    slotFill0: 'rgba(99, 102, 241, 0.36)',
    slotFill1: 'rgba(236, 72, 153, 0.36)',
    slotStroke: '#fbbf24',
    barStops: ['#6366f1', '#ec4899', '#fbbf24']
  },
  insta: {
    bgStops: ['#160718', '#330c2a', '#3d1510', '#120714'],
    glowTop: 'rgba(236, 72, 153, 0.38)',
    glowTopZero: 'rgba(236, 72, 153, 0)',
    glowBottom: 'rgba(249, 115, 22, 0.34)',
    glowBottomZero: 'rgba(249, 115, 22, 0)',
    pillFill0: 'rgba(236, 72, 153, 0.26)',
    pillFill1: 'rgba(249, 115, 22, 0.26)',
    pillBorder: 'rgba(251, 146, 60, 0.72)',
    pillText: '#fed7aa',
    ringStops: ['#f472b6', '#f97316', '#fde047'],
    badgeStops: ['#ec4899', '#f97316'],
    badgeText: '#ffffff',
    slotFill0: 'rgba(236, 72, 153, 0.38)',
    slotFill1: 'rgba(249, 115, 22, 0.38)',
    slotStroke: '#fb923c',
    barStops: ['#ec4899', '#f97316', '#fde047']
  },
  emerald: {
    bgStops: ['#041511', '#072b22', '#0d3326', '#04120f'],
    glowTop: 'rgba(16, 185, 129, 0.34)',
    glowTopZero: 'rgba(16, 185, 129, 0)',
    glowBottom: 'rgba(251, 191, 36, 0.26)',
    glowBottomZero: 'rgba(251, 191, 36, 0)',
    pillFill0: 'rgba(16, 185, 129, 0.24)',
    pillFill1: 'rgba(251, 191, 36, 0.22)',
    pillBorder: 'rgba(52, 211, 153, 0.68)',
    pillText: '#a7f3d0',
    ringStops: ['#6ee7b7', '#10b981', '#fbbf24'],
    badgeStops: ['#10b981', '#fbbf24'],
    badgeText: '#022c22',
    slotFill0: 'rgba(16, 185, 129, 0.36)',
    slotFill1: 'rgba(251, 191, 36, 0.30)',
    slotStroke: '#34d399',
    barStops: ['#059669', '#34d399', '#fbbf24']
  },
  ocean: {
    bgStops: ['#040d1f', '#0a2246', '#141b4d', '#040b1a'],
    glowTop: 'rgba(14, 165, 233, 0.36)',
    glowTopZero: 'rgba(14, 165, 233, 0)',
    glowBottom: 'rgba(99, 102, 241, 0.34)',
    glowBottomZero: 'rgba(99, 102, 241, 0)',
    pillFill0: 'rgba(14, 165, 233, 0.24)',
    pillFill1: 'rgba(99, 102, 241, 0.24)',
    pillBorder: 'rgba(56, 189, 248, 0.70)',
    pillText: '#bae6fd',
    ringStops: ['#7dd3fc', '#0ea5e9', '#818cf8'],
    badgeStops: ['#38bdf8', '#6366f1'],
    badgeText: '#ffffff',
    slotFill0: 'rgba(14, 165, 233, 0.36)',
    slotFill1: 'rgba(99, 102, 241, 0.36)',
    slotStroke: '#38bdf8',
    barStops: ['#0284c7', '#38bdf8', '#818cf8']
  }
};

const STORAGE_KEYS = {
  brandTheme: 'sorteadorPro_brandTheme',
  brandHandle: 'sorteadorPro_brandHandle',
  brandLogo: 'sorteadorPro_brandLogo',
  history: 'sorteadorPro_history_v1'
};
const MAX_HISTORY_ITEMS = 25;

let lastFetchedUrl = '';
let lastFetchHadMorePages = false;
let isFetchingLink = false;
let isGeneratingVideo = false;
let activeDrawTimer = null;
let copyFeedbackTimeout = null;
let downloadFeedbackTimeout = null;
let pdfFeedbackTimeout = null;
let currentWinners = [];
let currentSubstitutes = [];
let currentDisqualifiedLog = [];
let currentDrawPool = [];
let currentDrawDateStr = '';
let currentDrawMetaContext = {};
let currentDrawRecordId = '';
let currentPostFormat = 'feed'; // 'feed' (1080x1080) | 'stories' (1080x1920)
let currentBrandTheme = 'royal';
let currentBrandHandle = '';
let currentBrandLogoDataUrl = '';
let brandLogoImage = null;
let renderSequenceId = 0;
let currentGeneratedVideoUrl = '';
let currentAuditInfo = {
  protocolId: '#SP-000000',
  poolSummary: '',
  sha256Hex: ''
};

// Metadados dos participantes (foto de perfil e nome completo vindos da API ou planilha)
const participantMetaMap = new Map();
// Fotos enviadas manualmente pelo botão "Foto do Ganhador" (por índice de ganhador)
const customWinnerPhotos = new Map();
// Cache de imagens carregadas via Blob/DataURL (sem taint de CORS no Canvas)
const avatarImageCache = new Map();

const COPY_BTN_DEFAULT_TEXT = '📋 Copiar Resultado';
const DOWNLOAD_BTN_DEFAULT_TEXT = '🖼️ Baixar Imagem (PNG)';
const VIDEO_BTN_DEFAULT_TEXT = '🎬 Gerar e Baixar Vídeo do Sorteio';
const PDF_BTN_DEFAULT_TEXT = '📄 Baixar Certificado (PDF)';
const BRAND_LOGO_BTN_DEFAULT = '🖼️ Enviar Logo da Marca';
const BRAND_LOGO_BTN_LOADED = '🖼️ Trocar Logo';

function safeStorageGet(key) {
  try {
    return window.localStorage ? window.localStorage.getItem(key) : null;
  } catch (e) {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    if (window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    // Ignora limite de quota ou modo privado restrito
  }
}

function safeStorageRemove(key) {
  try {
    if (window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (e) {
    // ignore
  }
}

function getActiveThemePalette() {
  return BRAND_THEMES[currentBrandTheme] || BRAND_THEMES.royal;
}

function normalizeAuthorKey(author) {
  return stripInvisibleChars(author).trim().replace(/^@/, '').toLowerCase();
}

function registerParticipantMeta(rawUser, rawComment, avatarUrl, fullName) {
  const formatted = formatParticipantRecord(rawUser, rawComment);
  if (!formatted) return '';

  const parsed = parseParticipantLine(formatted);
  const key = normalizeAuthorKey(parsed.author);
  if (key) {
    const existing = participantMetaMap.get(key) || {};
    const cleanAvatar = String(avatarUrl || '').trim();
    const cleanFullName = stripInvisibleChars(fullName).trim();
    participantMetaMap.set(key, {
      username: parsed.author,
      avatarUrl: cleanAvatar || existing.avatarUrl || '',
      fullName: cleanFullName || existing.fullName || ''
    });
  }
  return formatted;
}

function getActiveGiveawayTitle() {
  const raw = stripInvisibleChars(giveawayTitleInput?.value || resultTitleEditInput?.value || '').trim();
  return raw || 'Sorteio Oficial';
}

function clearGeneratedVideoPreview() {
  if (currentGeneratedVideoUrl) {
    try {
      URL.revokeObjectURL(currentGeneratedVideoUrl);
    } catch (e) {
      // ignore
    }
    currentGeneratedVideoUrl = '';
  }
  if (generatedVideoPlayer) {
    generatedVideoPlayer.pause();
    generatedVideoPlayer.removeAttribute('src');
    generatedVideoPlayer.load();
  }
  if (videoResultBox) {
    videoResultBox.classList.add('hidden');
  }
}

// ==========================================
// MODO LIVE (TELA CHEIA) & HISTÓRICO DE SORTEIOS
// ==========================================
function syncLiveFullscreenUi() {
  const isFs = Boolean(document.fullscreenElement);
  const isLive = isFs || document.body.classList.contains('live-mode-manual');
  document.body.classList.toggle('live-mode', isLive);
  if (btnFullscreen) {
    btnFullscreen.classList.toggle('live-active', isLive);
    btnFullscreen.textContent = isLive ? '🔴 Sair do Modo Live' : '📺 Modo Live';
  }
}

if (btnFullscreen) {
  btnFullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) {
        document.body.classList.remove('live-mode-manual');
        await document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        document.body.classList.toggle('live-mode-manual');
      }
    } catch (e) {
      // Caso o navegador restrinja Fullscreen em iframe/headless, alterna o layout Live ampliado
      document.body.classList.toggle('live-mode-manual');
    }
    syncLiveFullscreenUi();
  });
}
document.addEventListener('fullscreenchange', syncLiveFullscreenUi);

function loadSavedHistory() {
  const raw = safeStorageGet(STORAGE_KEYS.history);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function persistHistoryArray(items) {
  safeStorageSet(STORAGE_KEYS.history, JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS)));
  updateHistoryBadgeCount();
}

function updateHistoryBadgeCount() {
  if (!historyCountBadge) return;
  const count = loadSavedHistory().length;
  historyCountBadge.textContent = String(count);
  historyCountBadge.classList.toggle('hidden', count === 0);
}

function saveCurrentDrawToHistory() {
  if (!currentWinners || currentWinners.length === 0) return;
  const items = loadSavedHistory();
  if (!currentDrawRecordId) {
    currentDrawRecordId = `draw_${Date.now()}_${generateEntropyHex(4)}`;
  }

  // Captura avatares/nomes conhecidos dos sorteados para reabrir com foto depois
  const savedParticipantMeta = {};
  [...currentWinners, ...currentSubstitutes].forEach((entry) => {
    const p = parseParticipantLine(entry);
    const k = normalizeAuthorKey(p.author);
    if (k && participantMetaMap.has(k)) {
      savedParticipantMeta[k] = participantMetaMap.get(k);
    }
  });

  const record = {
    id: currentDrawRecordId,
    title: getActiveGiveawayTitle(),
    dateStr: currentDrawDateStr,
    winners: [...currentWinners],
    substitutes: [...currentSubstitutes],
    disqualifiedLog: [...currentDisqualifiedLog],
    poolSnapshot: currentDrawPool.slice(0, 120),
    auditInfo: { ...currentAuditInfo },
    savedParticipantMeta
  };

  const existingIdx = items.findIndex(it => it.id === currentDrawRecordId);
  if (existingIdx !== -1) {
    items[existingIdx] = record;
  } else {
    items.unshift(record);
  }
  persistHistoryArray(items);
}

function renderHistoryModalList() {
  if (!historyList) return;
  historyList.replaceChildren();
  const items = loadSavedHistory();

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = 'Nenhum sorteio salvo ainda neste navegador. Assim que você realizar um sorteio, ele ficará guardado aqui!';
    historyList.appendChild(empty);
    return;
  }

  items.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'history-item';

    const info = document.createElement('div');
    info.className = 'history-item-info';

    const titleStrong = document.createElement('strong');
    titleStrong.textContent = entry.title || 'Sorteio Oficial';
    info.appendChild(titleStrong);

    const metaSpan = document.createElement('span');
    metaSpan.className = 'history-item-meta';
    const proto = entry.auditInfo?.protocolId || '#SP-AUDIT';
    metaSpan.textContent = `${entry.dateStr || ''} • ${proto}`;
    info.appendChild(metaSpan);

    const winnerSpan = document.createElement('span');
    winnerSpan.className = 'history-item-winner';
    const firstWinner = entry.winners && entry.winners[0] ? parseParticipantLine(entry.winners[0]).author : '—';
    const extraCount = (entry.winners?.length || 0) > 1 ? ` (+${entry.winners.length - 1})` : '';
    winnerSpan.textContent = `🏆 Ganhador: ${firstWinner}${extraCount}`;
    info.appendChild(winnerSpan);

    const actions = document.createElement('div');
    actions.className = 'history-item-actions';

    const btnOpen = document.createElement('button');
    btnOpen.type = 'button';
    btnOpen.className = 'btn-history-open';
    btnOpen.textContent = 'Abrir Resultado';
    btnOpen.addEventListener('click', () => {
      reopenHistoryEntry(entry);
      closeHistoryModal();
    });

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'btn-history-del';
    btnDel.title = 'Excluir este sorteio do histórico';
    btnDel.textContent = '🗑️';
    btnDel.addEventListener('click', () => {
      const filtered = loadSavedHistory().filter(it => it.id !== entry.id);
      persistHistoryArray(filtered);
      renderHistoryModalList();
    });

    actions.appendChild(btnOpen);
    actions.appendChild(btnDel);
    row.appendChild(info);
    row.appendChild(actions);
    historyList.appendChild(row);
  });
}

function openHistoryModal() {
  if (isGeneratingVideo || !historyModal) return;
  renderHistoryModalList();
  historyModal.classList.remove('hidden');
}

function closeHistoryModal() {
  if (!historyModal) return;
  historyModal.classList.add('hidden');
}

function reopenHistoryEntry(entry) {
  if (!entry || !Array.isArray(entry.winners) || entry.winners.length === 0) return;

  if (entry.savedParticipantMeta && typeof entry.savedParticipantMeta === 'object') {
    Object.entries(entry.savedParticipantMeta).forEach(([k, val]) => {
      if (val && typeof val === 'object') {
        participantMetaMap.set(k, val);
      }
    });
  }

  currentDrawRecordId = entry.id || '';
  currentWinners = [...entry.winners];
  currentSubstitutes = Array.isArray(entry.substitutes) ? [...entry.substitutes] : [];
  currentDisqualifiedLog = Array.isArray(entry.disqualifiedLog) ? [...entry.disqualifiedLog] : [];
  currentDrawPool = Array.isArray(entry.poolSnapshot) && entry.poolSnapshot.length > 0
    ? [...entry.poolSnapshot]
    : [...entry.winners];
  currentDrawDateStr = entry.dateStr || '';
  currentAuditInfo = {
    protocolId: entry.auditInfo?.protocolId || '#SP-AUDIT',
    poolSummary: entry.auditInfo?.poolSummary || `${entry.winners.length} sorteado(s)`,
    sha256Hex: entry.auditInfo?.sha256Hex || ''
  };
  currentDrawMetaContext = {
    mode: 'history',
    poolSummary: currentAuditInfo.poolSummary,
    auditSourceList: currentDrawPool
  };

  customWinnerPhotos.clear();
  clearGeneratedVideoPreview();

  const restoredTitle = entry.title || 'Sorteio Oficial';
  giveawayTitleInput.value = restoredTitle === 'Sorteio Oficial' ? '' : restoredTitle;
  resultTitleEditInput.value = giveawayTitleInput.value;

  tabContents.forEach(c => c.classList.remove('active'));
  document.querySelector('.tabs-container').classList.add('hidden');
  giveawayMetaBox.classList.add('hidden');
  animationBox.classList.add('hidden');
  resultBox.classList.remove('hidden');

  resultGiveawayBadge.textContent = getActiveGiveawayTitle();
  resultTimestamp.textContent = `Realizado em: ${currentDrawDateStr}`;
  if (auditProtocolIdEl) auditProtocolIdEl.textContent = currentAuditInfo.protocolId;
  if (auditPoolSummaryEl) auditPoolSummaryEl.textContent = currentAuditInfo.poolSummary;
  if (auditSha256HashEl) auditSha256HashEl.textContent = currentAuditInfo.sha256Hex;

  renderWinnersDomList();
  renderSubstitutesDomList();
  renderDisqualifiedLogDom();
  rebuildWinnerSelectDropdown(0);
  renderWinnerCardCanvas();
}

if (btnOpenHistory) btnOpenHistory.addEventListener('click', openHistoryModal);
if (btnCloseHistory) btnCloseHistory.addEventListener('click', closeHistoryModal);
if (btnCloseHistoryBottom) btnCloseHistoryBottom.addEventListener('click', closeHistoryModal);
if (historyModal) {
  historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) closeHistoryModal();
  });
}
if (btnClearHistory) {
  btnClearHistory.addEventListener('click', () => {
    if (loadSavedHistory().length === 0) return;
    if (confirm('Deseja apagar todo o histórico de sorteios salvos neste navegador?')) {
      safeStorageRemove(STORAGE_KEYS.history);
      updateHistoryBadgeCount();
      renderHistoryModalList();
    }
  });
}
updateHistoryBadgeCount();

giveawayTitleInput.addEventListener('input', () => {
  if (resultTitleEditInput && resultTitleEditInput.value !== giveawayTitleInput.value) {
    resultTitleEditInput.value = giveawayTitleInput.value;
  }
});

resultTitleEditInput.addEventListener('input', () => {
  if (isGeneratingVideo) return;
  giveawayTitleInput.value = resultTitleEditInput.value;
  resultGiveawayBadge.textContent = getActiveGiveawayTitle();
  saveCurrentDrawToHistory();
  renderWinnerCardCanvas();
});

// Tab Switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (isGeneratingVideo) return;
    tabBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    tabContents.forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.getElementById(btn.dataset.tab).classList.add('active');
    resetView();
  });
});

function showStatusMessage(targetEl, msg, type) {
  targetEl.textContent = msg;
  targetEl.className = `fetch-status-msg ${type}`;
  targetEl.classList.remove('hidden');
}

// ==========================================
// WORKFLOW STEPPER (Passo 1-2-3) & NAVEGAÇÃO
// ==========================================
function updateWorkflowStep(stepNum) {
  stepIndicators.forEach((ind, idx) => {
    if (!ind) return;
    const s = idx + 1;
    ind.classList.remove('active', 'completed');
    if (s < stepNum) {
      ind.classList.add('completed');
    } else if (s === stepNum) {
      ind.classList.add('active');
    }
  });
}


navPillBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    if (!targetId) return;
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ==========================================
// INTEGRAÇÃO OFICIAL INSTAGRAM (META GRAPH API & OAUTH)
// ==========================================
let currentMetaAccessToken = safeStorageGet('sorteadorPro_metaToken') || '';
let connectedIgAccount = null;
let currentIgPosts = [];
let selectedIgMediaId = null;

// Abre login direto no INSTAGRAM (www.instagram.com)
function triggerInstagramLogin() {
  const appId = DEFAULT_META_APP_ID;
  let redirectUri = 'https://alexnunes1899.github.io/sorteador/';
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    redirectUri = window.location.href.split('#')[0].split('?')[0];
  }

  // Escopos oficiais do Instagram para Criadores e Profissionais
  const scopes = 'instagram_business_basic,instagram_business_manage_comments';
  const oauthUrl = `https://www.instagram.com/oauth/authorize?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code`;

  showStatusMessage(fetchStatusMsg, 'Abrindo janela oficial do Instagram (instagram.com)...', 'info');
  openAuthPopup(oauthUrl, 'InstagramLogin');
}

// Abre login alternativo via Facebook (para Páginas com Instagram vinculado)
function triggerFacebookLogin() {
  const appId = DEFAULT_META_APP_ID;
  let redirectUri = 'https://alexnunes1899.github.io/sorteador/';
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    redirectUri = window.location.href.split('#')[0].split('?')[0];
  }

  const scopes = 'instagram_basic,instagram_manage_comments,pages_show_list,pages_read_engagement';
  const oauthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=token&display=popup`;

  showStatusMessage(fetchStatusMsg, 'Abrindo login via Facebook (Meta Graph API)...', 'info');
  openAuthPopup(oauthUrl, 'MetaFacebookLogin');
}

function openAuthPopup(oauthUrl, windowName) {
  const width = 640;
  const height = 720;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

  let popup = null;
  try {
    popup = window.open(
      oauthUrl,
      windowName,
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes,resizable=yes`
    );
  } catch (e) {
    popup = null;
  }

  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    showStatusMessage(fetchStatusMsg, '⚠️ O navegador bloqueou a janela pop-up. Redirecionando na mesma aba...', 'info');
    window.location.href = oauthUrl;
    return;
  }

  let pollTimer = setInterval(() => {
    try {
      if (!popup || popup.closed) {
        clearInterval(pollTimer);
        pollTimer = null;
        return;
      }

      let currentHref = '';
      try {
        currentHref = popup.location.href;
      } catch (crossErr) {
        // Cross-origin normal enquanto o usuário navega em instagram.com ou facebook.com
        return;
      }

      if (currentHref && (currentHref.includes('code=') || currentHref.includes('access_token=') || currentHref.includes('error='))) {
        const hash = popup.location.hash || '';
        const search = popup.location.search || '';
        const params = new URLSearchParams(
          (search.startsWith('?') ? search.substring(1) : search) ||
          (hash.startsWith('#') ? hash.substring(1) : hash)
        );

        const code = params.get('code');
        const token = params.get('access_token');
        const errorDesc = params.get('error_description') || params.get('error');

        clearInterval(pollTimer);
        pollTimer = null;
        try { popup.close(); } catch (e) {}

        if (code) {
          handleInstagramAuthCode(code.replace(/#_$/, ''));
        } else if (token) {
          handleMetaAccessToken(token);
        } else if (errorDesc) {
          showStatusMessage(fetchStatusMsg, `⚠️ Autorização cancelada ou recusada: ${decodeURIComponent(errorDesc)}`, 'error');
        }
      }
    } catch (e) {
      // Ignora erro cross-origin
    }
  }, 500);
}

// Escuta mensagens postMessage caso a página abra e redirecione dentro da janela
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INSTA_AUTH_CODE' && event.data.code) {
    handleInstagramAuthCode(event.data.code);
  }
  if (event.data && event.data.type === 'META_AUTH_TOKEN' && event.data.token) {
    handleMetaAccessToken(event.data.token);
  }
});

function checkUrlForMetaToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = hashParams.get('access_token');

  if (window.opener) {
    if (code) {
      try {
        window.opener.postMessage({ type: 'INSTA_AUTH_CODE', code: code.replace(/#_$/, '') }, '*');
        window.close();
        return;
      } catch (e) {}
    }
    if (token) {
      try {
        window.opener.postMessage({ type: 'META_AUTH_TOKEN', token }, '*');
        window.close();
        return;
      } catch (e) {}
    }
  }

  if (code) {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
    handleInstagramAuthCode(code.replace(/#_$/, ''));
  } else if (token) {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
    handleMetaAccessToken(token);
  }
}

async function handleInstagramAuthCode(code) {
  if (!code) return;
  const cleanCode = code.replace(/#_$/, '');
  safeStorageSet('sorteadorPro_instaAuthCode', cleanCode);
  showStatusMessage(fetchStatusMsg, '✅ Conta do Instagram autorizada com sucesso! Conectada!', 'success');

  if (instaConnectedBox) instaConnectedBox.classList.remove('hidden');
  if (instaProfileHandle) instaProfileHandle.textContent = 'Conta Instagram Conectada';
  if (instaProfileSubtitle) instaProfileSubtitle.textContent = 'Login Oficial Concluído • Selecione um post ou cole o link abaixo';
}

async function handleMetaAccessToken(token) {
  if (!token) return;
  safeStorageSet('sorteadorPro_metaToken', token.trim());
  currentMetaAccessToken = token.trim();

  showStatusMessage(fetchStatusMsg, 'Consultando sua conta e publicações na Meta Graph API...', 'info');
  await loadConnectedInstagramProfile(currentMetaAccessToken);
}

async function loadConnectedInstagramProfile(token) {
  if (!token) return;
  try {
    const accountsResp = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?fields=name,access_token,instagram_business_account{id,username,name,profile_picture_url}&access_token=${encodeURIComponent(token)}`
    );
    
    if (!accountsResp.ok) {
      const errData = await accountsResp.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `Erro HTTP ${accountsResp.status}`;
      throw new Error(`Meta API: ${errMsg}`);
    }

    const accountsData = await accountsResp.json();
    const pages = accountsData.data || [];
    
    let igAccount = null;
    let pageToken = token;

    for (const p of pages) {
      if (p.instagram_business_account && p.instagram_business_account.id) {
        igAccount = p.instagram_business_account;
        pageToken = p.access_token || token;
        break;
      }
    }

    if (!igAccount) {
      const directMe = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`);
      if (directMe.ok) {
        const dData = await directMe.json();
        showStatusMessage(
          fetchStatusMsg,
          `✅ Conectado como ${dData.name}! Para listar posts com fotos, certifique-se de que sua conta do Instagram é Profissional e vinculada a uma Página do Facebook. Você também pode colar o link do post direto no campo abaixo!`,
          'success'
        );
      }
      return;
    }

    connectedIgAccount = {
      ...igAccount,
      pageToken
    };

    if (instaProfileHandle) instaProfileHandle.textContent = `@${igAccount.username || igAccount.name}`;
    if (instaProfileSubtitle) instaProfileSubtitle.textContent = `${igAccount.name || 'Conta Profissional'} • Instagram Oficial`;
    if (instaProfileAvatar) {
      instaProfileAvatar.src = igAccount.profile_picture_url || 'favicon.svg';
    }
    if (instaConnectedBox) instaConnectedBox.classList.remove('hidden');

    await loadInstagramRecentPosts(igAccount.id, pageToken);
  } catch (err) {
    showStatusMessage(fetchStatusMsg, `⚠️ Não foi possível carregar dados da conta: ${err.message}`, 'error');
  }
}

async function loadInstagramRecentPosts(igId, token) {
  if (instaPostsStatus) instaPostsStatus.textContent = 'Carregando posts...';
  if (instaPostsGrid) {
    while (instaPostsGrid.firstChild) {
      instaPostsGrid.removeChild(instaPostsGrid.firstChild);
    }
  }

  try {
    const mediaResp = await fetch(
      `https://graph.facebook.com/v20.0/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,comments_count,timestamp&limit=12&access_token=${encodeURIComponent(token)}`
    );
    if (!mediaResp.ok) throw new Error('Falha ao obter lista de posts do Instagram.');

    const mediaData = await mediaResp.json();
    currentIgPosts = mediaData.data || [];

    if (instaPostsStatus) {
      instaPostsStatus.textContent = `${currentIgPosts.length} post(s) encontrado(s)`;
    }

    renderInstagramPostsGrid(currentIgPosts);
    showStatusMessage(fetchStatusMsg, `✅ ${currentIgPosts.length} publicação(ões) carregada(s)! Clique em um post para sortear.`, 'success');
  } catch (err) {
    if (instaPostsStatus) instaPostsStatus.textContent = 'Erro ao buscar posts';
    showStatusMessage(fetchStatusMsg, `⚠️ ${err.message}`, 'error');
  }
}

function renderInstagramPostsGrid(posts) {
  if (!instaPostsGrid) return;
  while (instaPostsGrid.firstChild) {
    instaPostsGrid.removeChild(instaPostsGrid.firstChild);
  }

  if (posts.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'text-muted';
    emptyMsg.style.fontSize = '0.85rem';
    emptyMsg.style.padding = '12px';
    emptyMsg.textContent = 'Nenhuma publicação recente encontrada nesta conta.';
    instaPostsGrid.appendChild(emptyMsg);
    return;
  }

  posts.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'insta-post-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.dataset.id = p.id;

    const img = document.createElement('img');
    img.className = 'insta-post-thumb';
    img.src = p.media_url || p.thumbnail_url || 'favicon.svg';
    img.alt = p.caption ? p.caption.slice(0, 40) : 'Post Instagram';
    img.loading = 'lazy';
    card.appendChild(img);

    const overlay = document.createElement('div');
    overlay.className = 'insta-post-info-overlay';
    
    const countSpan = document.createElement('span');
    countSpan.textContent = `💬 ${p.comments_count || 0}`;
    overlay.appendChild(countSpan);

    const dateSpan = document.createElement('span');
    if (p.timestamp) {
      const d = new Date(p.timestamp);
      dateSpan.textContent = `${d.getDate()}/${d.getMonth() + 1}`;
    }
    overlay.appendChild(dateSpan);
    card.appendChild(overlay);

    const indicator = document.createElement('div');
    indicator.className = 'insta-post-select-indicator';
    indicator.textContent = '✓';
    card.appendChild(indicator);

    card.addEventListener('click', () => {
      selectInstagramPost(p);
    });

    instaPostsGrid.appendChild(card);
  });
}

async function selectInstagramPost(post) {
  selectedIgMediaId = post.id;

  document.querySelectorAll('.insta-post-card').forEach((c) => {
    c.classList.toggle('selected', c.dataset.id === post.id);
  });

  if (post.permalink && postUrlInput) {
    postUrlInput.value = post.permalink;
    detectedNetworkBadge.textContent = '📸 Instagram Detectado';
    detectedNetworkBadge.className = 'network-badge instagram';
  }

  if (!giveawayTitleInput.value.trim() && post.caption) {
    const cleanCap = post.caption.split('\n')[0].slice(0, 50).trim();
    if (cleanCap) {
      giveawayTitleInput.value = `Sorteio: ${cleanCap}`;
    }
  }

  await fetchCommentsFromMetaPost(post.id);
}

async function fetchCommentsFromMetaPost(mediaId) {
  const token = connectedIgAccount?.pageToken || currentMetaAccessToken;
  if (!token) return false;

  isFetchingLink = true;
  btnFetchText.textContent = 'Buscando...';
  fetchSpinner.classList.remove('hidden');
  btnFetchComments.disabled = true;
  btnDrawLink.disabled = true;
  showStatusMessage(fetchStatusMsg, 'Baixando comentários oficiais direto da Meta Graph API...', 'info');

  try {
    const allComments = [];
    let nextUrl = `https://graph.facebook.com/v20.0/${mediaId}/comments?fields=id,text,username,timestamp&limit=100&access_token=${encodeURIComponent(token)}`;
    let pageCount = 0;
    const maxPages = 40;

    while (nextUrl && pageCount < maxPages) {
      pageCount++;
      const res = await fetch(nextUrl);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Erro HTTP ${res.status}`);
      }
      const data = await res.json();
      const items = data.data || [];
      items.forEach((c) => {
        if (c.username) {
          allComments.push(c);
        }
      });

      if (allComments.length > 0) {
        showStatusMessage(fetchStatusMsg, `Carregando comentários oficiais... (${allComments.length} carregados)`, 'info');
      }

      nextUrl = data.paging?.next || null;
      if (items.length === 0) break;
    }

    if (allComments.length === 0) {
      throw new Error('Nenhum comentário encontrado nesta publicação.');
    }

    const parsed = allComments
      .map(c => registerParticipantMeta(c.username, c.text, '', c.username))
      .filter(Boolean);

    linkCommentsInput.value = parsed.join('\n');
    linkPreviewBox.classList.remove('hidden');
    updateLinkCount();
    updateWorkflowStep(2);

    showStatusMessage(fetchStatusMsg, `✅ ${parsed.length} comentário(s) oficiais carregados da Meta com sucesso! Pronto para sortear.`, 'success');

    if (btnDrawLink) {
      btnDrawLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return true;
  } catch (err) {
    showStatusMessage(fetchStatusMsg, `⚠️ Erro ao buscar comentários da Meta: ${err.message}`, 'error');
    return false;
  } finally {
    isFetchingLink = false;
    btnFetchText.textContent = 'Carregar Comentários';
    fetchSpinner.classList.add('hidden');
    btnFetchComments.disabled = false;
    btnDrawLink.disabled = false;
  }
}

function disconnectInstagram() {
  safeStorageRemove('sorteadorPro_metaToken');
  currentMetaAccessToken = '';
  connectedIgAccount = null;
  currentIgPosts = [];
  selectedIgMediaId = null;
  if (instaConnectedBox) instaConnectedBox.classList.add('hidden');
  showStatusMessage(fetchStatusMsg, 'Conta do Instagram desconectada.', 'info');
}

if (btnInstaConnect) {
  btnInstaConnect.addEventListener('click', triggerInstagramLogin);
}
if (btnFbConnectAlt) {
  btnFbConnectAlt.addEventListener('click', triggerFacebookLogin);
}
if (btnInstaLogout) {
  btnInstaLogout.addEventListener('click', disconnectInstagram);
}
if (btnRefreshInstaPosts) {
  btnRefreshInstaPosts.addEventListener('click', () => {
    if (connectedIgAccount?.id) {
      loadInstagramRecentPosts(connectedIgAccount.id, connectedIgAccount.pageToken);
    }
  });
}

// Verifica se a página recebeu access_token no redirecionamento OAuth
checkUrlForMetaToken();

// Restaura sessão se houver token salvo
if (currentMetaAccessToken) {
  loadConnectedInstagramProfile(currentMetaAccessToken);
}


// ==========================================
// ABA 1: SORTEIO DIRETO PELO LINK
// ==========================================
postUrlInput.addEventListener('input', () => {
  const url = postUrlInput.value.trim().toLowerCase();
  detectedNetworkBadge.className = 'network-badge';

  if (!url) {
    detectedNetworkBadge.textContent = 'Aguardando link...';
    return;
  }

  if (url.includes('instagram.com') || url.includes('instagr.am')) {
    detectedNetworkBadge.textContent = '📸 Instagram Detectado';
    detectedNetworkBadge.classList.add('instagram');
  } else if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) {
    detectedNetworkBadge.textContent = '📘 Facebook Detectado';
    detectedNetworkBadge.classList.add('facebook');
  } else {
    detectedNetworkBadge.textContent = '🔗 Link da Web';
  }
});

postUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    btnFetchComments.click();
  }
});

function extractInstagramShortcode(url) {
  const match = url.match(/(?:instagram\.com|instagr\.am)\/(?:[^/?#]+\/)?(?:p|reels?|tv)\/([A-Za-z0-9_-]+)/i);
  return match ? match[1] : '';
}

async function fetchCommentsFromUrl(url) {
  if (!url) {
    showStatusMessage(fetchStatusMsg, 'Por favor, cole o link da publicação do Instagram.', 'error');
    return false;
  }

  if (!/^https?:\/\//i.test(url)) {
    showStatusMessage(fetchStatusMsg, 'Insira um link completo começando com https://', 'error');
    return false;
  }

  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.com')) {
    showStatusMessage(
      fetchStatusMsg,
      '📘 Para posts do Facebook, a Meta restringe acesso externo por link. Use a aba "📊 Planilha / Lista" ao lado para importar os comentários!',
      'info'
    );
    return false;
  }

  if (isFetchingLink) return false;
  isFetchingLink = true;
  lastFetchHadMorePages = false;

  btnFetchText.textContent = 'Buscando...';
  fetchSpinner.classList.remove('hidden');
  btnFetchComments.disabled = true;
  btnDrawLink.disabled = true;
  showStatusMessage(fetchStatusMsg, 'Carregando comentários da publicação no Instagram...', 'info');

  try {
    const shortcode = extractInstagramShortcode(url);
    if (!shortcode) {
      throw new Error('Cole o link direto de um Post ou Reel do Instagram (ex: https://www.instagram.com/p/CODIGO/).');
    }

    const allComments = [];
    const seenCommentIds = new Set();
    const maxPages = 40;
    let activeProvider = null;

    const pushUniqueComments = (items) => {
      if (!Array.isArray(items)) return 0;
      let added = 0;
      for (const c of items) {
        const cid = String(c?.pk || c?.id || c?.comment_id || '').trim();
        if (cid) {
          if (seenCommentIds.has(cid)) continue;
          seenCommentIds.add(cid);
        }
        allComments.push(c);
        added++;
      }
      return added;
    };

    // 0. Se houver conexão com Meta Graph API e o post corresponder ou for selecionado:
    const matchedMetaPost = currentIgPosts.find(p => p.permalink && p.permalink.includes(shortcode)) ||
      (selectedIgMediaId ? currentIgPosts.find(p => p.id === selectedIgMediaId) : null);

    if (matchedMetaPost && (connectedIgAccount?.pageToken || currentMetaAccessToken)) {
      const ok = await fetchCommentsFromMetaPost(matchedMetaPost.id);
      if (ok) return true;
    }

    for (const provider of RAPIDAPI_PROVIDERS) {
      const firstResponse = await fetch(provider.buildUrl(shortcode, url, null), {
        method: 'GET',
        headers: {
          'x-rapidapi-key': DEFAULT_RAPIDAPI_KEY,
          'x-rapidapi-host': provider.host
        }
      });

      if (firstResponse.status === 401 || firstResponse.status === 403 || firstResponse.status === 429 || !firstResponse.ok) {
        continue;
      }

      activeProvider = provider;
      const firstData = await firstResponse.json();
      const firstItems = firstData?.comments || firstData?.data?.comments || firstData?.data?.items || firstData?.items || [];
      pushUniqueComments(firstItems);
      if (allComments.length > 0) {
        showStatusMessage(fetchStatusMsg, `Buscando comentários... Página 1 (${allComments.length} carregados)`, 'info');
      }

      let paginationToken = firstData?.pagination_token || firstData?.next_max_id || firstData?.data?.pagination_token || null;
      const seenTokens = new Set();

      for (let page = 1; page < maxPages && paginationToken && firstItems.length > 0; page++) {
        if (seenTokens.has(paginationToken)) {
          paginationToken = null;
          break;
        }
        seenTokens.add(paginationToken);

        const nextResp = await fetch(activeProvider.buildUrl(shortcode, url, paginationToken), {
          method: 'GET',
          headers: {
            'x-rapidapi-key': DEFAULT_RAPIDAPI_KEY,
            'x-rapidapi-host': activeProvider.host
          }
        });
        if (!nextResp.ok) break;
        const nextData = await nextResp.json();
        const nextItems = nextData?.comments || nextData?.data?.comments || nextData?.data?.items || nextData?.items || [];
        const newlyAdded = pushUniqueComments(nextItems);
        if (newlyAdded > 0) {
          showStatusMessage(fetchStatusMsg, `Buscando comentários... Página ${page + 1} (${allComments.length} carregados)`, 'info');
        }
        paginationToken = nextData?.pagination_token || nextData?.next_max_id || nextData?.data?.pagination_token || null;
        if (!Array.isArray(nextItems) || nextItems.length === 0 || newlyAdded === 0) {
          paginationToken = null;
          break;
        }
      }

      if (paginationToken) {
        lastFetchHadMorePages = true;
      }
      break;
    }

    if (!activeProvider) {
      throw new Error('A API externa atingiu o limite gratuito. Use o botão "Conectar com Instagram" acima para buscas 100% oficiais e gratuitas, ou use a aba "Planilha / Lista"!');
    }

    if (allComments.length > 0) {
      const parsed = allComments
        .map(c => {
          const username = c.user?.username || c.owner?.username || c.username || '';
          const commentText = c.text || c.comment || '';
          const avatarUrl =
            c.user?.profile_pic_url_hd ||
            c.user?.profile_pic_url ||
            c.owner?.profile_pic_url_hd ||
            c.owner?.profile_pic_url ||
            c.profile_pic_url ||
            c.avatar ||
            '';
          const fullName =
            c.user?.full_name ||
            c.owner?.full_name ||
            c.full_name ||
            '';
          return registerParticipantMeta(username, commentText, avatarUrl, fullName);
        })
        .filter(Boolean);

      linkCommentsInput.value = parsed.join('\n');
      lastFetchedUrl = url;
      linkPreviewBox.classList.remove('hidden');
      updateLinkCount();

      if (lastFetchHadMorePages) {
        showStatusMessage(
          fetchStatusMsg,
          `⚠️ Foram carregados os primeiros ${parsed.length} comentários (limite de páginas por consulta). Se o post tiver mais comentários, recomendamos importar a lista completa na aba Planilha!`,
          'info'
        );
      } else {
        showStatusMessage(fetchStatusMsg, `✅ ${parsed.length} comentário(s) auditado(s) e carregado(s) com sucesso! Pronto para sortear.`, 'success');
      }
      return true;
    } else {
      throw new Error('Nenhum comentário encontrado ou a publicação é privada.');
    }
  } catch (err) {
    showStatusMessage(fetchStatusMsg, `⚠️ ${err.message}`, 'error');
    if (fetchStatusMsg) {
      const linkWrap = document.createElement('div');
      linkWrap.style.marginTop = '10px';
      linkWrap.style.display = 'flex';
      linkWrap.style.flexWrap = 'wrap';
      linkWrap.style.gap = '8px';

      const instaLoginBtn = document.createElement('button');
      instaLoginBtn.type = 'button';
      instaLoginBtn.textContent = '📸 Conectar com Instagram (Oficial)';
      instaLoginBtn.className = 'btn-secondary';
      instaLoginBtn.style.fontSize = '0.78rem';
      instaLoginBtn.style.padding = '6px 12px';
      instaLoginBtn.style.cursor = 'pointer';
      instaLoginBtn.addEventListener('click', () => {
        triggerInstagramLogin();
      });
      linkWrap.appendChild(instaLoginBtn);

      const sheetTabBtn = document.querySelector('.tab-btn[data-tab="tab-sheet"]');
      if (sheetTabBtn) {
        const goSheetBtn = document.createElement('button');
        goSheetBtn.type = 'button';
        goSheetBtn.textContent = '📊 Usar Aba Planilha / Lista (Sem Limites)';
        goSheetBtn.className = 'btn-secondary';
        goSheetBtn.style.fontSize = '0.78rem';
        goSheetBtn.style.padding = '6px 12px';
        goSheetBtn.style.cursor = 'pointer';
        goSheetBtn.addEventListener('click', () => {
          sheetTabBtn.click();
        });
        linkWrap.appendChild(goSheetBtn);
      }

      const rapidLink = document.createElement('a');
      rapidLink.href = 'https://rapidapi.com/rockapis-rockapis-default/api/instagram-scraper-api2/pricing';
      rapidLink.target = '_blank';
      rapidLink.rel = 'noopener noreferrer';
      rapidLink.textContent = '🔗 Ativar Plano Free na RapidAPI';
      rapidLink.className = 'btn-secondary';
      rapidLink.style.fontSize = '0.78rem';
      rapidLink.style.padding = '6px 12px';
      rapidLink.style.textDecoration = 'none';
      rapidLink.style.display = 'inline-block';
      linkWrap.appendChild(rapidLink);

      fetchStatusMsg.appendChild(linkWrap);
    }
    return false;
  } finally {
    isFetchingLink = false;
    btnFetchText.textContent = 'Carregar Comentários';
    fetchSpinner.classList.add('hidden');
    btnFetchComments.disabled = false;
    btnDrawLink.disabled = false;
  }
}

btnFetchComments.addEventListener('click', () => {
  fetchCommentsFromUrl(postUrlInput.value.trim());
});

btnDrawLink.addEventListener('click', async () => {
  const url = postUrlInput.value.trim();

  if (!url && !linkCommentsInput.value.trim()) {
    showStatusMessage(fetchStatusMsg, 'Por favor, cole o link da publicação do Instagram primeiro!', 'error');
    postUrlInput.focus();
    return;
  }

  if (url && (url !== lastFetchedUrl || !linkCommentsInput.value.trim())) {
    const ok = await fetchCommentsFromUrl(url);
    if (!ok) return;
  }

  executeParticipantsDraw({
    mode: 'link',
    rawText: linkCommentsInput.value,
    removeDuplicates: linkRemoveDuplicates.checked,
    minMentions: parseInt(linkMinMentions?.value || '0', 10) || 0,
    keyword: linkKeywordFilter?.value || '',
    blacklist: linkBlacklist?.value || '',
    winnersCount: parseInt(linkWinnersCountInput.value, 10),
    substitutesCount: parseInt(linkSubstitutesCountInput.value, 10)
  });
});

function updateLinkCount() {
  const { rawCount, validItems } = getFilteredParticipantsFromText(linkCommentsInput.value, {
    removeDuplicates: linkRemoveDuplicates.checked,
    minMentions: parseInt(linkMinMentions?.value || '0', 10) || 0,
    keyword: linkKeywordFilter?.value || '',
    blacklist: linkBlacklist?.value || ''
  });
  updateBadgeElement(linkLinesCountBadge, rawCount, validItems.length);
  if (btnDrawLink) {
    if (validItems.length > 0) {
      btnDrawLink.classList.add('btn-pulse');
      updateWorkflowStep(2);
    } else {
      btnDrawLink.classList.remove('btn-pulse');
    }
  }
}

linkRemoveDuplicates.addEventListener('change', updateLinkCount);
if (linkMinMentions) linkMinMentions.addEventListener('change', updateLinkCount);
if (linkKeywordFilter) linkKeywordFilter.addEventListener('input', updateLinkCount);
if (linkBlacklist) linkBlacklist.addEventListener('input', updateLinkCount);

// ==========================================
// ABA 2: IMPORTADOR DE PLANILHAS (.XLSX, .XLS, .CSV, .TSV, .JSON, .TXT)
// ==========================================
triggerFileSelect.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });
});

dropZone.addEventListener('drop', (e) => {
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    handleFileUpload(files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFileUpload(e.target.files[0]);
    fileInput.value = '';
  }
});

function decodeFileBuffer(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch (e) {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

function handleFileUpload(file) {
  const lowerName = file.name.toLowerCase();
  const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');

  const reader = new FileReader();
  reader.onload = (e) => {
    const buffer = e.target.result;
    if (isExcel) {
      parseAndLoadExcelBuffer(buffer, file.name);
    } else {
      const content = decodeFileBuffer(buffer);
      parseAndLoadFile(content, file.name);
    }
  };
  reader.onerror = () => {
    showStatusMessage(sheetStatusMsg, 'Erro ao ler o arquivo selecionado.', 'error');
  };
  reader.readAsArrayBuffer(file);
}

function parseAndLoadExcelBuffer(buffer, fileName) {
  if (typeof XLSX === 'undefined') {
    showStatusMessage(
      sheetStatusMsg,
      'A biblioteca de Excel ainda está carregando. Aguarde 1 segundo e tente novamente ou salve como .csv!',
      'error'
    );
    return;
  }

  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      showStatusMessage(sheetStatusMsg, 'A planilha selecionada não possui abas.', 'error');
      return;
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const cleanRows = rawRows
      .map(row => row.map(cell => String(cell ?? '').trim()))
      .filter(row => row.some(cell => cell.length > 0));

    const parsedComments = extractParticipantsFromRows(cleanRows);
    if (parsedComments.length > 0) {
      namesInput.value = parsedComments.join('\n');
      updateSheetCount();
      showStatusMessage(
        sheetStatusMsg,
        `📊 Planilha "${fileName}" importada com sucesso! ${parsedComments.length} participante(s) carregado(s).`,
        'success'
      );
    } else {
      showStatusMessage(sheetStatusMsg, `Nenhum participante encontrado na planilha "${fileName}".`, 'error');
    }
  } catch (err) {
    showStatusMessage(sheetStatusMsg, `Erro ao ler a planilha Excel "${fileName}". Verifique se o arquivo é válido.`, 'error');
  }
}

function formatParticipantRecord(rawUser, rawComment) {
  const cleanUser = stripInvisibleChars(rawUser).replace(/\s+/g, ' ').trim();
  const cleanComment = stripInvisibleChars(rawComment).replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!cleanUser && !cleanComment) return '';
  if (!cleanUser) return cleanComment;

  const formattedUser = (!cleanUser.startsWith('@') && /^[a-zA-Z0-9_.]+$/.test(cleanUser))
    ? `@${cleanUser}`
    : cleanUser;

  return cleanComment ? `${formattedUser} - ${cleanComment}` : formattedUser;
}

function normalizeHeader(header) {
  return stripInvisibleChars(header)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function detectCsvColumns(rawHeaders) {
  const headers = rawHeaders.map(normalizeHeader);

  const exactUserNames = [
    'username', 'owner_username', 'ownerusername', 'user_name',
    'handle', 'instagram', 'arroba', 'usuario', 'autor', 'author',
    'from', 'user', 'nome', 'name', 'perfil', 'profile_name', 'participante'
  ];
  const exactCommentNames = [
    'text', 'comment', 'comment_text', 'commenttext', 'comentario',
    'message', 'mensagem', 'body', 'conteudo', 'content'
  ];
  const exactAvatarNames = [
    'profile_pic_url', 'profilepicurl', 'ownerprofilepicurl', 'owner_profile_pic_url',
    'avatar_url', 'avatar', 'foto', 'photo_url', 'pic_url', 'profile_pic'
  ];
  const exactFullNameNames = [
    'full_name', 'fullname', 'ownerfullname', 'owner_full_name', 'nome_completo'
  ];

  let userColIdx = -1;
  for (const exact of exactUserNames) {
    const idx = headers.indexOf(exact);
    if (idx !== -1) {
      userColIdx = idx;
      break;
    }
  }
  if (userColIdx === -1) {
    userColIdx = headers.findIndex(h =>
      (h.includes('username') || h.includes('usuario') || h.includes('autor') || h.includes('author') || h.includes('nome') || h.includes('participante')) &&
      !/\b(id|url|link|pic|photo|avatar|count|verified)\b/.test(h) &&
      !h.endsWith('id') && !h.endsWith('url')
    );
  }

  let commentColIdx = -1;
  for (const exact of exactCommentNames) {
    const idx = headers.indexOf(exact);
    if (idx !== -1) {
      commentColIdx = idx;
      break;
    }
  }
  if (commentColIdx === -1) {
    commentColIdx = headers.findIndex(h =>
      (h.includes('comment') || h.includes('coment') || h.includes('text') || h.includes('mensagem') || h.includes('message')) &&
      !/\b(id|count|date|time|url|like|likes)\b/.test(h) &&
      !h.endsWith('id') && !h.endsWith('count')
    );
  }

  let avatarColIdx = -1;
  for (const exact of exactAvatarNames) {
    const idx = headers.indexOf(exact);
    if (idx !== -1) {
      avatarColIdx = idx;
      break;
    }
  }

  let fullNameColIdx = -1;
  for (const exact of exactFullNameNames) {
    const idx = headers.indexOf(exact);
    if (idx !== -1) {
      fullNameColIdx = idx;
      break;
    }
  }

  const hasRecognizedHeader = userColIdx !== -1 || commentColIdx !== -1;
  return { userColIdx, commentColIdx, avatarColIdx, fullNameColIdx, hasRecognizedHeader };
}

function extractParticipantsFromRows(rows) {
  if (!rows || rows.length === 0) return [];

  let { userColIdx, commentColIdx, avatarColIdx, fullNameColIdx, hasRecognizedHeader } = detectCsvColumns(rows[0]);
  const startIndex = hasRecognizedHeader ? 1 : 0;

  if (!hasRecognizedHeader) {
    userColIdx = 0;
    commentColIdx = rows[0].length > 1 ? 1 : -1;
  } else if (userColIdx === -1 && commentColIdx !== 0) {
    userColIdx = 0;
  }

  const parsedComments = [];
  for (let i = startIndex; i < rows.length; i++) {
    const parts = rows[i];
    const user = userColIdx !== -1 && userColIdx < parts.length ? parts[userColIdx] : '';
    const comm = commentColIdx !== -1 && commentColIdx < parts.length && commentColIdx !== userColIdx
      ? parts[commentColIdx]
      : '';
    const avatar = avatarColIdx !== -1 && avatarColIdx < parts.length ? parts[avatarColIdx] : '';
    const fullName = fullNameColIdx !== -1 && fullNameColIdx < parts.length ? parts[fullNameColIdx] : '';

    const formatted = registerParticipantMeta(user, comm, avatar, fullName);
    if (formatted) parsedComments.push(formatted);
  }
  return parsedComments;
}

function detectDelimiter(content, fileName) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.tsv')) return '\t';

  let inQuotes = false;
  const counts = { '\t': 0, ';': 0, ',': 0 };
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (ch === '\n' || ch === '\r') break;
      if (ch in counts) counts[ch]++;
    }
  }

  if (counts['\t'] > 0 && counts['\t'] >= counts[';'] && counts['\t'] >= counts[',']) return '\t';
  if (counts[';'] > counts[',']) return ';';
  if (counts[','] > 0) return ',';
  return null;
}

function parseDelimitedRows(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"' && field.length === 0) {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(field.trim());
        field = '';
      } else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field.trim());
        if (row.some(cell => cell.length > 0)) {
          rows.push(row);
        }
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }

  row.push(field.trim());
  if (row.some(cell => cell.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function parseJsonComments(rawText) {
  const data = JSON.parse(rawText);
  const items = Array.isArray(data)
    ? data
    : (data?.comments || data?.items || data?.data?.items || data?.data || []);

  if (!Array.isArray(items)) return [];

  return items
    .map(item => {
      if (typeof item === 'string') return stripInvisibleChars(item).trim();
      if (item && typeof item === 'object') {
        const user =
          item.username ||
          item.ownerUsername ||
          item.owner_username ||
          item.user?.username ||
          item.owner?.username ||
          item.author ||
          item.from?.name ||
          item.name ||
          '';
        const comment =
          item.text ||
          item.comment ||
          item.comment_text ||
          item.comentario ||
          item.message ||
          item.mensagem ||
          item.body ||
          '';
        const avatarUrl =
          item.profile_pic_url_hd ||
          item.profile_pic_url ||
          item.ownerProfilePicUrl ||
          item.owner_profile_pic_url ||
          item.user?.profile_pic_url_hd ||
          item.user?.profile_pic_url ||
          item.owner?.profile_pic_url ||
          item.avatar ||
          item.photo ||
          '';
        const fullName =
          item.full_name ||
          item.fullName ||
          item.user?.full_name ||
          item.owner?.full_name ||
          '';
        return registerParticipantMeta(user, comment, avatarUrl, fullName);
      }
      return '';
    })
    .filter(Boolean);
}

function parseAndLoadFile(rawContent, fileName) {
  const content = stripInvisibleChars(rawContent).trim();
  if (!content) {
    showStatusMessage(sheetStatusMsg, 'O arquivo selecionado está vazio!', 'error');
    return;
  }

  const lowerName = fileName.toLowerCase();
  let parsedComments = [];

  if (lowerName.endsWith('.json') || content.startsWith('[') || content.startsWith('{')) {
    try {
      parsedComments = parseJsonComments(content);
      if (parsedComments.length > 0) {
        namesInput.value = parsedComments.join('\n');
        updateSheetCount();
        showStatusMessage(sheetStatusMsg, `📊 Arquivo JSON "${fileName}" importado com sucesso! ${parsedComments.length} participante(s) carregado(s).`, 'success');
        return;
      }
    } catch (err) {
      if (lowerName.endsWith('.json')) {
        showStatusMessage(sheetStatusMsg, `Erro ao interpretar o arquivo JSON "${fileName}". Verifique se o formato é válido.`, 'error');
        return;
      }
    }
  }

  const delimiter = detectDelimiter(content, fileName);
  const isTabularFile = lowerName.endsWith('.csv') || lowerName.endsWith('.tsv');

  if (delimiter && (isTabularFile || content.split(/\r?\n/)[0].includes(delimiter))) {
    const rows = parseDelimitedRows(content, delimiter);
    parsedComments = extractParticipantsFromRows(rows);
  } else {
    parsedComments = content
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
  }

  if (parsedComments.length > 0) {
    namesInput.value = parsedComments.join('\n');
    updateSheetCount();
    showStatusMessage(sheetStatusMsg, `📊 Arquivo "${fileName}" carregado com sucesso! ${parsedComments.length} linha(s) importada(s).`, 'success');
  } else {
    showStatusMessage(sheetStatusMsg, `Nenhum participante válido encontrado no arquivo "${fileName}".`, 'error');
  }
}

// ==========================================
// PARTICIPANT PARSING & FILTER ENGINE
// ==========================================
function parseParticipantLine(rawLine) {
  const line = stripInvisibleChars(rawLine).trim();

  const spacedSepMatch = line.match(/^(.{1,80}?)\s+[-–—|]\s+(.+)$/);
  if (spacedSepMatch) {
    return {
      raw: line,
      author: spacedSepMatch[1].trim(),
      comment: spacedSepMatch[2].trim(),
      hasCommentBody: true
    };
  }

  const colonMatch = line.match(/^(@?[a-zA-Z0-9_.À-ÿ' -]{1,60}):\s+(.+)$/);
  if (colonMatch && !/^https?$/i.test(colonMatch[1].trim())) {
    return {
      raw: line,
      author: colonMatch[1].trim(),
      comment: colonMatch[2].trim(),
      hasCommentBody: true
    };
  }

  const tightDashMatch = line.match(/^(@[a-zA-Z0-9_.]+)\s*[-–—|]\s*(.+)$/);
  if (tightDashMatch) {
    return {
      raw: line,
      author: tightDashMatch[1].trim(),
      comment: tightDashMatch[2].trim(),
      hasCommentBody: true
    };
  }

  const handleSpaceMatch = line.match(/^(@[a-zA-Z0-9_.]+)\s+(.+)$/);
  if (handleSpaceMatch) {
    return {
      raw: line,
      author: handleSpaceMatch[1].trim(),
      comment: handleSpaceMatch[2].trim(),
      hasCommentBody: true
    };
  }

  return {
    raw: line,
    author: line,
    comment: '',
    hasCommentBody: false
  };
}

function normalizeSearchText(str) {
  return stripInvisibleChars(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseBlacklistSet(rawBlacklist) {
  const clean = stripInvisibleChars(rawBlacklist).trim();
  if (!clean) return new Set();
  const rawTokens = /[,;\r\n]/.test(clean)
    ? clean.split(/[,;\r\n]+/)
    : (clean.includes('@') ? clean.split(/[\s,;\r\n]+/) : [clean]);

  const set = new Set();
  for (const tok of rawTokens) {
    const trimmed = tok.trim();
    if (!trimmed) continue;
    if (trimmed.includes('@') && /\s+@/.test(trimmed)) {
      trimmed.split(/\s+/).forEach(sub => {
        const k = normalizeAuthorKey(sub);
        if (k) set.add(k);
      });
    } else {
      const k = normalizeAuthorKey(trimmed);
      if (k) set.add(k);
    }
  }
  return set;
}

function countValidFriendMentions(parsed) {
  if (!parsed.hasCommentBody || !parsed.comment) return 0;

  const cleanAuthor = normalizeAuthorKey(parsed.author);
  const mentionRegex = /(?:^|[^a-zA-Z0-9_.])@([a-zA-Z0-9_.]*[a-zA-Z0-9_])/g;
  const uniqueFriends = new Set();
  let match;

  while ((match = mentionRegex.exec(parsed.comment)) !== null) {
    const mentionedUser = match[1].toLowerCase().replace(/\.+$/, '');
    if (mentionedUser && mentionedUser !== cleanAuthor) {
      uniqueFriends.add(mentionedUser);
    }
  }
  return uniqueFriends.size;
}

function getFilteredParticipantsFromText(rawText, filterOpts = {}) {
  const opts = typeof filterOpts === 'boolean'
    ? { removeDuplicates: filterOpts, minMentions: arguments[2] ? 1 : 0, keyword: '', blacklist: '' }
    : filterOpts;

  const removeDuplicates = Boolean(opts.removeDuplicates);
  const minMentions = Math.max(0, parseInt(opts.minMentions || 0, 10) || 0);
  const normKeyword = normalizeSearchText(opts.keyword || '');
  const blockedAuthors = parseBlacklistSet(opts.blacklist || '');

  const rawLines = stripInvisibleChars(rawText)
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let parsedList = rawLines.map(parseParticipantLine);

  if (blockedAuthors.size > 0) {
    parsedList = parsedList.filter(item => !blockedAuthors.has(normalizeAuthorKey(item.author)));
  }

  if (normKeyword) {
    parsedList = parsedList.filter(item => {
      const haystack = normalizeSearchText(item.hasCommentBody ? item.comment : item.raw);
      return haystack.includes(normKeyword);
    });
  }

  if (minMentions > 0) {
    parsedList = parsedList.filter(item => countValidFriendMentions(item) >= minMentions);
  }

  if (removeDuplicates) {
    const seenUsers = new Set();
    const deduped = [];

    for (const item of parsedList) {
      const userKey = normalizeAuthorKey(item.author);
      if (!seenUsers.has(userKey)) {
        seenUsers.add(userKey);
        deduped.push(item);
      }
    }
    parsedList = deduped;
  }

  return {
    rawCount: rawLines.length,
    validItems: parsedList.map(p => p.raw)
  };
}

function getFilteredParticipants() {
  return getFilteredParticipantsFromText(namesInput.value, {
    removeDuplicates: optRemoveDuplicates.checked,
    minMentions: parseInt(sheetMinMentions?.value || '0', 10) || 0,
    keyword: sheetKeywordFilter?.value || '',
    blacklist: sheetBlacklist?.value || ''
  });
}

function updateBadgeElement(badgeEl, rawCount, validCount) {
  if (rawCount === 0) {
    badgeEl.textContent = '0 participantes';
  } else if (validCount === rawCount) {
    badgeEl.textContent = `${validCount} participante(s)`;
  } else {
    badgeEl.textContent = `${validCount} válido(s) (de ${rawCount})`;
  }
}

function updateSheetCount() {
  const { rawCount, validItems } = getFilteredParticipants();
  updateBadgeElement(linesCountBadge, rawCount, validItems.length);
  if (btnDrawSheet) {
    if (validItems.length > 0) {
      btnDrawSheet.classList.add('btn-pulse');
      updateWorkflowStep(2);
    } else {
      btnDrawSheet.classList.remove('btn-pulse');
    }
  }
}

namesInput.addEventListener('input', updateSheetCount);
optRemoveDuplicates.addEventListener('change', updateSheetCount);
if (sheetMinMentions) sheetMinMentions.addEventListener('change', updateSheetCount);
if (sheetKeywordFilter) sheetKeywordFilter.addEventListener('input', updateSheetCount);
if (sheetBlacklist) sheetBlacklist.addEventListener('input', updateSheetCount);

btnClearNames.addEventListener('click', () => {
  if (namesInput.value.trim() && confirm('Deseja limpar todos os participantes da lista?')) {
    namesInput.value = '';
    updateSheetCount();
    sheetStatusMsg.classList.add('hidden');
  }
});

// ==========================================
// EXECUÇÃO UNIFICADA DO SORTEIO DE PARTICIPANTES
// ==========================================
function executeParticipantsDraw({
  mode = 'sheet',
  rawText,
  removeDuplicates,
  minMentions = 0,
  keyword = '',
  blacklist = '',
  winnersCount,
  substitutesCount
}) {
  try {
    assertCryptoAvailable();
  } catch (err) {
    alert(err.message);
    return;
  }

  const cleanMinMentions = Math.max(0, parseInt(minMentions || 0, 10) || 0);
  const cleanKeyword = stripInvisibleChars(keyword).trim();
  const cleanBlacklist = stripInvisibleChars(blacklist).trim();

  const { rawCount, validItems } = getFilteredParticipantsFromText(rawText, {
    removeDuplicates,
    minMentions: cleanMinMentions,
    keyword: cleanKeyword,
    blacklist: cleanBlacklist
  });

  if (rawCount === 0) {
    alert('Por favor, importe uma planilha ou cole os participantes na lista!');
    return;
  }

  if (validItems.length === 0) {
    const activeRuleHints = [];
    if (cleanMinMentions > 0) activeRuleHints.push(`mínimo de ${cleanMinMentions} @amigo(s) diferente(s)`);
    if (cleanKeyword) activeRuleHints.push(`palavra-chave "${cleanKeyword}"`);
    if (cleanBlacklist) activeRuleHints.push('lista de perfis bloqueados');
    alert(
      `Nenhum participante atendeu às regras selecionadas (${activeRuleHints.join(', ') || 'filtros ativos'})! Verifique os filtros configurados.`
    );
    return;
  }

  if (isNaN(winnersCount) || winnersCount < 1) {
    alert('A quantidade de ganhadores principais deve ser de pelo menos 1!');
    return;
  }

  if (isNaN(substitutesCount) || substitutesCount < 0) {
    alert('A quantidade de ganhadores substitutos não pode ser negativa!');
    return;
  }

  const totalNeeded = winnersCount + substitutesCount;

  if (validItems.length < totalNeeded) {
    alert(`Você precisa de ao menos ${totalNeeded} participante(s) válido(s) para sortear ${winnersCount} titular(es) e ${substitutesCount} substituto(s). No momento há ${validItems.length} válido(s).`);
    return;
  }

  runDrawAnimation(
    () => validItems[getRandomIndex(validItems.length)],
    () => {
      // Seleção criptográfica Fisher-Yates parcial sem reposição
      const pool = [...validItems];
      const winners = [];
      const substitutes = [];

      for (let i = 0; i < winnersCount; i++) {
        const idx = getRandomIndex(pool.length);
        winners.push(pool.splice(idx, 1)[0]);
      }

      for (let i = 0; i < substitutesCount; i++) {
        const idx = getRandomIndex(pool.length);
        substitutes.push(pool.splice(idx, 1)[0]);
      }

      const poolSnapshot = validItems.length <= 250
        ? [...validItems]
        : Array.from({ length: 250 }, () => validItems[getRandomIndex(validItems.length)]);

      const rulesParts = [
        removeDuplicates ? '1 chance/perfil' : 'múltiplos comentários',
        cleanMinMentions > 0 ? `mín. ${cleanMinMentions} @amigo(s)` : 'sem exigir @'
      ];
      if (cleanKeyword) rulesParts.push(`termo "${cleanKeyword}"`);
      if (cleanBlacklist) rulesParts.push('bloqueios ativos');

      showResults(winners, substitutes, {
        mode,
        poolSnapshot,
        poolSummary: `${validItems.length} participante(s) válido(s) (de ${rawCount} carregados • ${rulesParts.join(', ')})`,
        auditSourceList: validItems
      });
    }
  );
}

btnDrawSheet.addEventListener('click', () => {
  executeParticipantsDraw({
    mode: 'sheet',
    rawText: namesInput.value,
    removeDuplicates: optRemoveDuplicates.checked,
    minMentions: parseInt(sheetMinMentions?.value || '0', 10) || 0,
    keyword: sheetKeywordFilter?.value || '',
    blacklist: sheetBlacklist?.value || '',
    winnersCount: parseInt(sheetWinnersCountInput.value, 10),
    substitutesCount: parseInt(sheetSubstitutesCountInput.value, 10)
  });
});

// ==========================================
// ABA 3: SORTEIO DE NÚMEROS
// ==========================================
btnDrawNumbers.addEventListener('click', () => {
  try {
    assertCryptoAvailable();
  } catch (err) {
    alert(err.message);
    return;
  }

  const min = parseInt(document.getElementById('num-min').value, 10);
  const max = parseInt(document.getElementById('num-max').value, 10);
  const qty = parseInt(document.getElementById('num-qty').value, 10);
  const allowRepeated = document.getElementById('opt-allow-repeated-numbers').checked;

  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min >= max) {
    alert('Informe números inteiros válidos onde o mínimo seja menor que o máximo!');
    return;
  }

  const range = max - min + 1;
  if (!Number.isSafeInteger(range) || range <= 0) {
    alert('O intervalo informado excede o limite máximo permitido.');
    return;
  }

  if (isNaN(qty) || qty < 1 || qty > 500) {
    alert('Informe uma quantidade válida de números para sortear (entre 1 e 500).');
    return;
  }

  if (!allowRepeated && qty > range) {
    alert(`Não é possível sortear ${qty} números únicos no intervalo de ${min} a ${max} (máximo de ${range} números disponíveis).`);
    return;
  }

  runDrawAnimation(
    () => `Número ${min + getRandomIndex(range)}`,
    () => {
      const winners = [];
      if (allowRepeated) {
        for (let i = 0; i < qty; i++) {
          const num = min + getRandomIndex(range);
          winners.push(`Número ${num}`);
        }
      } else {
        const picked = new Set();
        while (picked.size < qty) {
          picked.add(min + getRandomIndex(range));
        }
        picked.forEach(num => winners.push(`Número ${num}`));
      }

      const sampleCount = Math.min(80, range);
      const poolSnapshot = Array.from({ length: sampleCount }, () => `Número ${min + getRandomIndex(range)}`);

      showResults(winners, [], {
        mode: 'numbers',
        poolSnapshot,
        poolSummary: `Intervalo de ${min} a ${max} (${range} números • ${allowRepeated ? 'com repetição' : 'sem repetição'})`,
        auditSourceList: [`range:${min}..${max}:allowRepeated=${allowRepeated}`]
      });
    }
  );
});

// ==========================================
// ANIMAÇÃO DE ROLETA
// ==========================================
function truncateRouletteText(str, maxLen = 85) {
  const text = String(str);
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

function runDrawAnimation(getSampleItem, onFinish) {
  if (activeDrawTimer) {
    clearTimeout(activeDrawTimer);
    activeDrawTimer = null;
  }

  clearGeneratedVideoPreview();

  tabContents.forEach(c => c.classList.remove('active'));
  document.querySelector('.tabs-container').classList.add('hidden');
  giveawayMetaBox.classList.add('hidden');
  resultBox.classList.add('hidden');
  animationBox.classList.remove('hidden');

  const customTitle = giveawayTitleInput.value.trim();
  animationTitle.textContent = customTitle
    ? `Sorteando: ${customTitle}...`
    : 'Sorteando os vencedores...';

  const duration = Math.max(1000, parseInt(drawDurationSelect?.value || '2500', 10) || 2500);

  loadingProgress.style.transition = 'none';
  loadingProgress.style.width = '0%';
  void loadingProgress.offsetWidth;
  loadingProgress.style.transition = `width ${(duration / 1000).toFixed(2)}s ease-out`;
  loadingProgress.style.width = '100%';

  const startTime = Date.now();
  rouletteDisplay.textContent = truncateRouletteText(getSampleItem());

  const stepRoulette = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed >= duration) {
      activeDrawTimer = null;
      animationBox.classList.add('hidden');
      onFinish();
      return;
    }

    rouletteDisplay.textContent = truncateRouletteText(getSampleItem());
    playTickSound();

    const progress = elapsed / duration;
    const nextDelay = progress < 0.65
      ? 60
      : 60 + Math.round(Math.pow((progress - 0.65) / 0.35, 2) * 210);
    activeDrawTimer = setTimeout(stepRoulette, nextDelay);
  };

  activeDrawTimer = setTimeout(stepRoulette, 60);
}

// ==========================================
// DETALHES DO GANHADOR & AVATAR PROXY
// ==========================================
function extractInstagramHandle(rawLine) {
  const str = String(rawLine || '').trim();
  if (!str || /^Número\s+-?\d+$/i.test(str)) return '';
  const parsed = parseParticipantLine(str);
  const author = parsed.author.trim();
  if (author.startsWith('@')) {
    const h = author.slice(1).trim();
    return /^[a-zA-Z0-9_.]{1,30}$/.test(h) ? h : '';
  }
  if (/^[a-zA-Z0-9_.]{2,30}$/.test(author) && /[a-zA-Z_]/.test(author)) {
    return author;
  }
  return '';
}

function resolveWinnerDetails(winnerRaw, rankIndex) {
  const rawStr = String(winnerRaw || '').trim();
  const numMatch = rawStr.match(/^Número\s+(-?\d+)$/i);
  const customPhoto = customWinnerPhotos.get(rankIndex) || '';

  if (numMatch) {
    return {
      raw: rawStr,
      author: rawStr,
      comment: '',
      fullName: '',
      avatarUrl: customPhoto,
      initials: `#${numMatch[1]}`,
      isNumberDraw: true
    };
  }

  const parsed = parseParticipantLine(rawStr);
  const key = normalizeAuthorKey(parsed.author);
  const meta = participantMetaMap.get(key) || {};
  const cleanLetters = parsed.author.replace(/^@/, '').trim();
  const initials = cleanLetters
    ? cleanLetters.slice(0, 2).toUpperCase()
    : '🏆';

  return {
    raw: rawStr,
    author: parsed.author,
    comment: parsed.comment || '',
    fullName: meta.fullName || '',
    avatarUrl: customPhoto || meta.avatarUrl || '',
    initials,
    isNumberDraw: false
  };
}

function getDomSafeAvatarSrc(avatarUrl) {
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('data:') || avatarUrl.startsWith('blob:')) return avatarUrl;
  return `https://wsrv.nl/?url=${encodeURIComponent(avatarUrl)}&w=140&h=140&fit=cover&output=png`;
}

function buildWinnerListAvatarNode(details) {
  const wrapper = document.createDocumentFragment();
  const fallback = document.createElement('div');
  fallback.className = 'winner-avatar-fallback';
  fallback.textContent = details.initials.slice(0, 3);

  const safeSrc = getDomSafeAvatarSrc(details.avatarUrl);
  if (safeSrc) {
    const img = document.createElement('img');
    img.className = 'winner-avatar';
    img.alt = `Foto de ${details.author}`;
    img.src = safeSrc;
    fallback.classList.add('hidden');
    img.addEventListener('error', () => {
      img.classList.add('hidden');
      fallback.classList.remove('hidden');
    });
    wrapper.appendChild(img);
  }

  wrapper.appendChild(fallback);
  return wrapper;
}

// ==========================================
// RESULTADOS, SUBSTITUIÇÃO 1-CLIQUE & AUDITORIA SHA-256
// ==========================================
function renderWinnersDomList() {
  winnersList.replaceChildren();
  currentWinners.forEach((winner, index) => {
    const details = resolveWinnerDetails(winner, index);
    const instaHandle = extractInstagramHandle(winner);
    const item = document.createElement('div');
    item.className = 'winner-item';

    item.appendChild(buildWinnerListAvatarNode(details));

    const rankSpan = document.createElement('span');
    rankSpan.className = 'winner-rank';
    rankSpan.textContent = `🏆 ${index + 1}º Ganhador`;
    item.appendChild(rankSpan);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'winner-name';
    nameSpan.textContent = String(winner);
    item.appendChild(nameSpan);

    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'winner-actions';

    if (instaHandle) {
      const profileLink = document.createElement('a');
      profileLink.className = 'btn-insta-profile';
      profileLink.href = `https://www.instagram.com/${encodeURIComponent(instaHandle)}/`;
      profileLink.target = '_blank';
      profileLink.rel = 'noopener noreferrer';
      profileLink.title = `Conferir perfil @${instaHandle} no Instagram`;
      profileLink.textContent = '📸 Ver Perfil';
      actionsWrap.appendChild(profileLink);
    }

    if (currentSubstitutes.length > 0) {
      const btnPromote = document.createElement('button');
      btnPromote.type = 'button';
      btnPromote.className = 'btn-promote-sub';
      btnPromote.title = 'Desclassificar este sorteado e chamar o Substituto #1';
      btnPromote.textContent = '🔄 Substituir';
      btnPromote.addEventListener('click', () => {
        promoteSubstituteForWinner(index);
      });
      actionsWrap.appendChild(btnPromote);
    }

    if (actionsWrap.childNodes.length > 0) {
      item.appendChild(actionsWrap);
    } else {
      const sparkleSpan = document.createElement('span');
      sparkleSpan.textContent = '✨';
      item.appendChild(sparkleSpan);
    }

    winnersList.appendChild(item);
  });
}

function renderSubstitutesDomList() {
  if (currentSubstitutes.length > 0) {
    substitutesSection.classList.remove('hidden');
    substitutesList.replaceChildren();
    currentSubstitutes.forEach((sub, index) => {
      const item = document.createElement('div');
      item.className = 'sub-winner-item';

      const rankSpan = document.createElement('span');
      rankSpan.className = 'sub-rank';
      rankSpan.textContent = `🛡️ Substituto #${index + 1}:`;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'sub-name';
      nameSpan.textContent = String(sub);

      item.appendChild(rankSpan);
      item.appendChild(nameSpan);

      const subHandle = extractInstagramHandle(sub);
      if (subHandle) {
        const subActions = document.createElement('div');
        subActions.className = 'sub-actions';
        const profileLink = document.createElement('a');
        profileLink.className = 'btn-insta-profile';
        profileLink.href = `https://www.instagram.com/${encodeURIComponent(subHandle)}/`;
        profileLink.target = '_blank';
        profileLink.rel = 'noopener noreferrer';
        profileLink.title = `Conferir perfil @${subHandle} no Instagram`;
        profileLink.textContent = '📸 Ver Perfil';
        subActions.appendChild(profileLink);
        item.appendChild(subActions);
      }

      substitutesList.appendChild(item);
    });
  } else {
    substitutesSection.classList.add('hidden');
  }
}

function renderDisqualifiedLogDom() {
  if (!disqualifiedLogBox || !disqualifiedLogList) return;
  disqualifiedLogList.replaceChildren();

  if (!currentDisqualifiedLog || currentDisqualifiedLog.length === 0) {
    disqualifiedLogBox.classList.add('hidden');
    return;
  }

  disqualifiedLogBox.classList.remove('hidden');
  currentDisqualifiedLog.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'disq-log-item';
    row.textContent = `• ${entry.rank}º Lugar (${entry.previousAuthor}) desclassificado às ${entry.timeStr} → assumiu Substituto: ${entry.promotedAuthor}`;
    disqualifiedLogList.appendChild(row);
  });
}

function rebuildWinnerSelectDropdown(preferredIdx = 0) {
  cardWinnerSelect.replaceChildren();
  currentWinners.forEach((w, idx) => {
    const details = resolveWinnerDetails(w, idx);
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = `${idx + 1}º Lugar — ${details.author}`;
    cardWinnerSelect.appendChild(opt);
  });

  const safeIdx = Math.max(0, Math.min(currentWinners.length - 1, preferredIdx));
  cardWinnerSelect.value = String(safeIdx);

  if (currentWinners.length > 1) {
    cardWinnerSelectorWrap.classList.remove('hidden');
  } else {
    cardWinnerSelectorWrap.classList.add('hidden');
  }
}

async function promoteSubstituteForWinner(winnerIndex, skipConfirm = false) {
  if (isGeneratingVideo || !currentSubstitutes || currentSubstitutes.length === 0) return false;
  if (winnerIndex < 0 || winnerIndex >= currentWinners.length) return false;

  const oldRaw = currentWinners[winnerIndex];
  const oldDetails = resolveWinnerDetails(oldRaw, winnerIndex);
  const nextSubRaw = currentSubstitutes[0];
  const nextSubDetails = resolveWinnerDetails(nextSubRaw, -1);

  if (!skipConfirm) {
    const ok = confirm(
      `Deseja desclassificar "${oldDetails.author}" (${winnerIndex + 1}º lugar) por não cumprir as regras e promover automaticamente o Substituto #1 ("${nextSubDetails.author}")?`
    );
    if (!ok) return false;
  }

  const promotedRaw = currentSubstitutes.shift();
  currentWinners[winnerIndex] = promotedRaw;
  customWinnerPhotos.delete(winnerIndex);
  clearGeneratedVideoPreview();

  currentDisqualifiedLog.push({
    rank: winnerIndex + 1,
    previousRaw: oldRaw,
    previousAuthor: oldDetails.author,
    promotedRaw,
    promotedAuthor: nextSubDetails.author,
    timeStr: new Date().toLocaleTimeString('pt-BR')
  });

  renderWinnersDomList();
  renderSubstitutesDomList();
  renderDisqualifiedLogDom();
  rebuildWinnerSelectDropdown(winnerIndex);
  renderWinnerCardCanvas();

  await generateDrawAuditCertificate(new Date(), currentDrawMetaContext);
  playWinSound();
  if (typeof confetti === 'function') {
    confetti({ particleCount: 55, spread: 60, origin: { y: 0.65 } });
  }
  return true;
}

async function generateDrawAuditCertificate(nowDate, metaContext) {
  const entropyNonce = generateEntropyHex(16);
  const ymd = [
    nowDate.getFullYear(),
    String(nowDate.getMonth() + 1).padStart(2, '0'),
    String(nowDate.getDate()).padStart(2, '0')
  ].join('');

  const payload = JSON.stringify({
    v: 'SorteadorPro-Audit-v2',
    title: getActiveGiveawayTitle(),
    isoTime: nowDate.toISOString(),
    mode: metaContext?.mode || 'draw',
    poolSummary: metaContext?.poolSummary || '',
    poolCount: metaContext?.auditSourceList?.length || 0,
    poolDigestSample: (metaContext?.auditSourceList || []).slice(0, 500),
    winners: currentWinners,
    substitutes: currentSubstitutes,
    disqualifiedLog: currentDisqualifiedLog,
    csprngNonce: entropyNonce
  });

  const sha256Hex = await computeSha256Hex(payload);
  const protocolId = `#SP-${ymd}-${sha256Hex.slice(0, 6).toUpperCase()}`;

  currentAuditInfo = {
    protocolId,
    poolSummary: metaContext?.poolSummary || `${currentWinners.length} sorteado(s)`,
    sha256Hex
  };

  if (auditProtocolIdEl) auditProtocolIdEl.textContent = protocolId;
  if (auditPoolSummaryEl) auditPoolSummaryEl.textContent = currentAuditInfo.poolSummary;
  if (auditSha256HashEl) auditSha256HashEl.textContent = sha256Hex;

  saveCurrentDrawToHistory();

  // Atualiza rodapé do Canvas com o protocolo criptográfico recém-calculado
  if (!isGeneratingVideo) {
    renderWinnerCardCanvas();
  }
}

function showResults(winners, substitutes, metaContext = {}) {
  currentDrawRecordId = '';
  currentWinners = [...winners];
  currentSubstitutes = [...(substitutes || [])];
  currentDisqualifiedLog = [];
  currentDrawMetaContext = metaContext || {};
  currentDrawPool = Array.isArray(metaContext.poolSnapshot) && metaContext.poolSnapshot.length > 0
    ? [...metaContext.poolSnapshot]
    : [...winners];
  customWinnerPhotos.clear();
  clearGeneratedVideoPreview();

  const now = new Date();
  currentDrawDateStr = now.toLocaleString('pt-BR');

  currentAuditInfo = {
    protocolId: '#SP-AUDIT',
    poolSummary: metaContext.poolSummary || `${winners.length} ganhador(es)`,
    sha256Hex: 'Calculando assinatura SHA-256...'
  };
  if (auditProtocolIdEl) auditProtocolIdEl.textContent = currentAuditInfo.protocolId;
  if (auditPoolSummaryEl) auditPoolSummaryEl.textContent = currentAuditInfo.poolSummary;
  if (auditSha256HashEl) auditSha256HashEl.textContent = currentAuditInfo.sha256Hex;

  resultBox.classList.remove('hidden');
  updateWorkflowStep(3);
  resultGiveawayBadge.textContent = getActiveGiveawayTitle();
  resultTitleEditInput.value = giveawayTitleInput.value.trim();
  resultTimestamp.textContent = `Realizado em: ${currentDrawDateStr}`;

  renderWinnersDomList();
  renderSubstitutesDomList();
  renderDisqualifiedLogDom();
  rebuildWinnerSelectDropdown(0);

  renderWinnerCardCanvas();
  generateDrawAuditCertificate(now, metaContext);
  playWinSound();
  launchConfetti();
}

function launchConfetti() {
  if (typeof confetti === 'function') {
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => {
      confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } });
    }, 250);
  }
}

// ==========================================
// GERADOR DE ARTE / POST DO GANHADOR (CANVAS HD)
// ==========================================
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Blob read failed'));
    reader.readAsDataURL(blob);
  });
}

function loadImageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image decode failed'));
    img.src = src;
  });
}

async function fetchWithTimeout(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { mode: 'cors', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function loadSafeAvatarImage(avatarUrl) {
  if (!avatarUrl) return null;
  if (avatarImageCache.has(avatarUrl)) {
    return avatarImageCache.get(avatarUrl);
  }

  if (avatarUrl.startsWith('data:') || avatarUrl.startsWith('blob:')) {
    try {
      const img = await loadImageFromSrc(avatarUrl);
      avatarImageCache.set(avatarUrl, img);
      return img;
    } catch (e) {
      return null;
    }
  }

  const proxyCandidates = [
    `https://wsrv.nl/?url=${encodeURIComponent(avatarUrl)}&w=500&h=500&fit=cover&output=png`,
    `https://images.weserv.nl/?url=${encodeURIComponent(avatarUrl)}&w=500&h=500&fit=cover&output=png`,
    `https://corsproxy.io/?${encodeURIComponent(avatarUrl)}`,
    avatarUrl
  ];

  for (const candidate of proxyCandidates) {
    try {
      const resp = await fetchWithTimeout(candidate, 6000);
      if (!resp.ok) continue;
      const blob = await resp.blob();
      if (!blob || blob.size < 80) continue;
      if (blob.type && !blob.type.startsWith('image/') && !blob.type.includes('octet-stream')) continue;

      const dataUrl = await blobToDataUrl(blob);
      const img = await loadImageFromSrc(dataUrl);
      avatarImageCache.set(avatarUrl, img);
      return img;
    } catch (e) {
      // Tenta o próximo proxy automaticamente
    }
  }

  return null;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapCanvasText(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    while (ctx.measureText(word).width > maxWidth && word.length > 4) {
      let sliceLen = word.length - 1;
      while (sliceLen > 1 && ctx.measureText(word.slice(0, sliceLen) + '…').width > maxWidth) {
        sliceLen--;
      }
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
        if (lines.length >= maxLines) return lines;
      }
      if (lines.length === maxLines - 1) {
        lines.push(word.slice(0, sliceLen) + '…');
        return lines;
      }
      lines.push(word.slice(0, sliceLen));
      word = word.slice(sliceLen);
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (lines.length === maxLines - 1) {
        let truncated = currentLine;
        while (truncated.length > 1 && ctx.measureText(truncated + '…').width > maxWidth) {
          truncated = truncated.slice(0, -1).trim();
        }
        lines.push(truncated + '…');
        return lines;
      }
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines;
}

function drawCanvasLuxuryBackground(ctx, W, H, isStories) {
  const pal = getActiveThemePalette();
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, pal.bgStops[0]);
  bgGrad.addColorStop(0.45, pal.bgStops[1]);
  bgGrad.addColorStop(0.8, pal.bgStops[2]);
  bgGrad.addColorStop(1, pal.bgStops[3]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const topGlow = ctx.createRadialGradient(200, 160, 20, 200, 160, 560);
  topGlow.addColorStop(0, pal.glowTop);
  topGlow.addColorStop(1, pal.glowTopZero);
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  const bottomGlow = ctx.createRadialGradient(W - 180, H - 200, 20, W - 180, H - 200, 600);
  bottomGlow.addColorStop(0, pal.glowBottom);
  bottomGlow.addColorStop(1, pal.glowBottomZero);
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, 0, W, H);

  const frameInset = isStories ? 36 : 28;
  ctx.save();
  drawRoundedRect(ctx, frameInset, frameInset, W - frameInset * 2, H - frameInset * 2, 34);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawTopPillAndTitle(ctx, W, isStories, pillText, giveawayTitle) {
  const pal = getActiveThemePalette();
  const fontStack = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  const headerPillY = isStories ? 155 : 58;
  const headerPillH = isStories ? 58 : 50;

  ctx.save();
  ctx.font = `800 ${isStories ? 25 : 22}px ${fontStack}`;
  const headerPillW = Math.max(390, ctx.measureText(pillText).width + 68);
  const headerPillX = (W - headerPillW) / 2;

  drawRoundedRect(ctx, headerPillX, headerPillY, headerPillW, headerPillH, headerPillH / 2);
  const pillFill = ctx.createLinearGradient(headerPillX, headerPillY, headerPillX + headerPillW, headerPillY);
  pillFill.addColorStop(0, pal.pillFill0);
  pillFill.addColorStop(1, pal.pillFill1);
  ctx.fillStyle = pillFill;
  ctx.fill();
  ctx.strokeStyle = pal.pillBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = pal.pillText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, W / 2, headerPillY + headerPillH / 2 + 1);
  ctx.restore();

  const titleFontSize = isStories ? 58 : 46;
  ctx.save();
  ctx.font = `800 ${titleFontSize}px ${fontStack}`;
  const titleLines = wrapCanvasText(ctx, giveawayTitle, W - 150, 2);
  const titleLineHeight = isStories ? 68 : 54;
  const titleBlockCenterY = isStories ? 335 : 185;
  const firstTitleY = titleBlockCenterY - ((titleLines.length - 1) * titleLineHeight) / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffffff';
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, W / 2, firstTitleY + idx * titleLineHeight);
  });
  ctx.restore();
}

function drawCanvasAuditFooter(ctx, W, isStories) {
  const pal = getActiveThemePalette();
  const fontStack = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  const footerDate = currentDrawDateStr || new Date().toLocaleString('pt-BR');
  const proto = currentAuditInfo?.protocolId || '#SP-AUDIT';
  const cleanBrandText = stripInvisibleChars(currentBrandHandle || '').trim();
  const hasLogo = Boolean(brandLogoImage && brandLogoImage.width > 0 && brandLogoImage.height > 0);
  const hasBrand = Boolean(cleanBrandText || hasLogo);

  if (hasBrand) {
    ctx.save();
    const pillCy = isStories ? 1575 : 950;
    const pillH = isStories ? 68 : 48;
    const logoSize = isStories ? 48 : 34;
    const fontSize = isStories ? 27 : 21;
    ctx.font = `800 ${fontSize}px ${fontStack}`;

    const labelStr = cleanBrandText ? `Realização: ${cleanBrandText}` : 'Realização Oficial';
    const textW = ctx.measureText(labelStr).width;
    const innerGap = hasLogo ? (isStories ? 14 : 10) : 0;
    const padX = isStories ? 28 : 22;
    const contentW = (hasLogo ? logoSize : 0) + innerGap + textW;
    const pillW = Math.min(W - 140, Math.max(240, contentW + padX * 2));
    const pillX = (W - pillW) / 2;
    const pillY = pillCy - pillH / 2;

    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fill();
    ctx.strokeStyle = pal.pillBorder;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    let cursorX = (W - contentW) / 2;
    if (hasLogo) {
      const logoCx = cursorX + logoSize / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(logoCx, pillCy, logoSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const scale = Math.max(logoSize / brandLogoImage.width, logoSize / brandLogoImage.height);
      const dw = brandLogoImage.width * scale;
      const dh = brandLogoImage.height * scale;
      ctx.drawImage(brandLogoImage, logoCx - dw / 2, pillCy - dh / 2, dw, dh);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(logoCx, pillCy, logoSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      cursorX += logoSize + innerGap;
    }

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelStr, cursorX, pillCy + 1);
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (isStories) {
    ctx.font = `600 25px ${fontStack}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`✅ Sorteio Auditado (${proto}) • ${footerDate}`, W / 2, hasBrand ? 1696 : 1690);

    ctx.font = `800 30px ${fontStack}`;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('🎲 SorteadorPro • CSPRNG SHA-256', W / 2, hasBrand ? 1754 : 1750);
  } else {
    ctx.font = `600 ${hasBrand ? 19 : 21}px ${fontStack}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`✅ Auditado ${proto} • ${footerDate} • 🎲 SorteadorPro`, W / 2, hasBrand ? 1012 : 995);
  }
  ctx.restore();
}

function drawDecorativeConfetti(ctx, width, height, seedStr) {
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const nextRand = () => {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    return ((hash >>> 0) % 10000) / 10000;
  };

  const palette = ['#fbbf24', '#ec4899', '#818cf8', '#34d399', '#fde68a'];
  ctx.save();
  for (let i = 0; i < 34; i++) {
    const x = 50 + nextRand() * (width - 100);
    const y = 50 + nextRand() * (height - 100);
    if (x > width * 0.2 && x < width * 0.8 && y > height * 0.16 && y < height * 0.86) {
      continue;
    }
    const size = 6 + nextRand() * 11;
    const angle = nextRand() * Math.PI * 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.25 + nextRand() * 0.45;
    ctx.fillStyle = palette[i % palette.length];
    if (i % 3 === 0) {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-size / 2, -size / 4, size, size * 0.55);
    }
    ctx.restore();
  }
  ctx.restore();
}

function paintWinnerTemplateFrame(details, rankIndex, avatarImg, isLoadingAvatar, revealScale = 1) {
  if (!winnerPostCanvas) return;
  const pal = getActiveThemePalette();
  const isStories = currentPostFormat === 'stories';
  const W = 1080;
  const H = isStories ? 1920 : 1080;

  if (winnerPostCanvas.width !== W || winnerPostCanvas.height !== H) {
    winnerPostCanvas.width = W;
    winnerPostCanvas.height = H;
  }

  const ctx = winnerPostCanvas.getContext('2d');
  const fontStack = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  const giveawayTitle = getActiveGiveawayTitle();

  drawCanvasLuxuryBackground(ctx, W, H, isStories);

  const avatarCy = isStories ? 720 : 440;
  const avatarR = isStories ? 195 : 138;

  const centerGoldGlow = ctx.createRadialGradient(W / 2, avatarCy, avatarR * 0.4, W / 2, avatarCy, avatarR * 2.2);
  centerGoldGlow.addColorStop(0, pal.glowTop);
  centerGoldGlow.addColorStop(1, pal.glowTopZero);
  ctx.fillStyle = centerGoldGlow;
  ctx.fillRect(0, 0, W, H);

  drawDecorativeConfetti(ctx, W, H, `${details.author}-${rankIndex}`);
  drawTopPillAndTitle(ctx, W, isStories, '🎉 RESULTADO OFICIAL 🎉', giveawayTitle);

  // Aplica escala suave caso esteja animando a revelação no vídeo
  ctx.save();
  if (revealScale !== 1) {
    ctx.translate(W / 2, avatarCy + 140);
    ctx.scale(revealScale, revealScale);
    ctx.translate(-W / 2, -(avatarCy + 140));
  }

  // Foto Circular do Ganhador com Anel do Tema Ativo
  const avatarCx = W / 2;
  ctx.save();
  const ringGrad = ctx.createLinearGradient(
    avatarCx - avatarR,
    avatarCy - avatarR,
    avatarCx + avatarR,
    avatarCy + avatarR
  );
  ringGrad.addColorStop(0, pal.ringStops[0]);
  ringGrad.addColorStop(0.5, pal.ringStops[1]);
  ringGrad.addColorStop(1, pal.ringStops[2]);

  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR + 11, 0, Math.PI * 2);
  ctx.fillStyle = ringGrad;
  ctx.shadowColor = 'rgba(245, 158, 11, 0.45)';
  ctx.shadowBlur = 32;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR + 3, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (avatarImg && avatarImg.width > 0 && avatarImg.height > 0) {
    const diam = avatarR * 2;
    const scale = Math.max(diam / avatarImg.width, diam / avatarImg.height);
    const drawW = avatarImg.width * scale;
    const drawH = avatarImg.height * scale;
    ctx.drawImage(avatarImg, avatarCx - drawW / 2, avatarCy - drawH / 2, drawW, drawH);
  } else {
    const avatarFallbackGrad = ctx.createLinearGradient(
      avatarCx - avatarR,
      avatarCy - avatarR,
      avatarCx + avatarR,
      avatarCy + avatarR
    );
    avatarFallbackGrad.addColorStop(0, pal.barStops[0]);
    avatarFallbackGrad.addColorStop(0.55, pal.barStops[1]);
    avatarFallbackGrad.addColorStop(1, pal.barStops[2]);
    ctx.fillStyle = avatarFallbackGrad;
    ctx.fillRect(avatarCx - avatarR, avatarCy - avatarR, avatarR * 2, avatarR * 2);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initFont = details.initials.length > 3
      ? (isStories ? 84 : 62)
      : (isStories ? 120 : 88);
    ctx.font = `800 ${initFont}px ${fontStack}`;
    ctx.fillText(details.initials, avatarCx, avatarCy + 4);

    if (isLoadingAvatar) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.fillRect(avatarCx - avatarR, avatarCy + avatarR * 0.42, avatarR * 2, avatarR * 0.58);
      ctx.fillStyle = pal.pillText;
      ctx.font = `700 ${isStories ? 22 : 18}px ${fontStack}`;
      ctx.fillText('Carregando foto...', avatarCx, avatarCy + avatarR * 0.68);
    }
  }
  ctx.restore();

  // Faixa de Classificação na base da foto
  const rankBadgeText = currentWinners.length > 1
    ? `🏆 ${rankIndex + 1}º GANHADOR(A)`
    : '🏆 GANHADOR(A) OFICIAL';
  ctx.font = `800 ${isStories ? 26 : 22}px ${fontStack}`;
  const rankPillW = Math.max(330, ctx.measureText(rankBadgeText).width + 64);
  const rankPillH = isStories ? 58 : 48;
  const rankPillX = (W - rankPillW) / 2;
  const rankPillY = avatarCy + avatarR - rankPillH / 2 + 4;

  ctx.save();
  drawRoundedRect(ctx, rankPillX, rankPillY, rankPillW, rankPillH, rankPillH / 2);
  const rankGrad = ctx.createLinearGradient(rankPillX, rankPillY, rankPillX + rankPillW, rankPillY);
  rankGrad.addColorStop(0, pal.badgeStops[0]);
  rankGrad.addColorStop(1, pal.badgeStops[1]);
  ctx.fillStyle = rankGrad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 14;
  ctx.fill();

  ctx.fillStyle = pal.badgeText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rankBadgeText, W / 2, rankPillY + rankPillH / 2 + 1);
  ctx.restore();

  // Nome / @usuario do Ganhador + Nome Completo opcional
  const winnerNameY = isStories ? 1045 : 668;
  let winnerFontSize = isStories ? 64 : 52;
  ctx.save();
  ctx.font = `800 ${winnerFontSize}px ${fontStack}`;
  while (winnerFontSize > 30 && ctx.measureText(details.author).width > W - 140) {
    winnerFontSize -= 2;
    ctx.font = `800 ${winnerFontSize}px ${fontStack}`;
  }
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 18;
  ctx.fillText(details.author, W / 2, winnerNameY);
  ctx.restore();

  const showFullName =
    details.fullName &&
    details.fullName.toLowerCase() !== details.author.replace(/^@/, '').toLowerCase();

  if (showFullName) {
    ctx.save();
    ctx.font = `600 ${isStories ? 34 : 27}px ${fontStack}`;
    const fullNameLines = wrapCanvasText(ctx, details.fullName, W - 180, 1);
    ctx.fillStyle = pal.pillText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (fullNameLines[0]) {
      ctx.fillText(fullNameLines[0], W / 2, isStories ? 1106 : 714);
    }
    ctx.restore();
  }

  // Caixa do Comentário Sorteado
  const cardX = 96;
  const cardW = W - cardX * 2;
  const cardY = isStories ? 1175 : 748;
  const cardH = isStories ? 275 : 152;

  ctx.save();
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (details.comment) {
    ctx.font = `700 ${isStories ? 22 : 18}px ${fontStack}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('💬 COMENTÁRIO SORTEADO', W / 2, cardY + (isStories ? 42 : 30));

    const commentFontSize = isStories ? 32 : 25;
    const commentLineH = isStories ? 44 : 33;
    const maxCommentLines = isStories ? 4 : 2;
    ctx.font = `600 ${commentFontSize}px ${fontStack}`;
    const commentLines = wrapCanvasText(ctx, `"${details.comment}"`, cardW - 76, maxCommentLines);

    const textAreaCenterY = cardY + (isStories ? 162 : 95);
    const firstCommentY = textAreaCenterY - ((commentLines.length - 1) * commentLineH) / 2;
    ctx.fillStyle = '#f1f5f9';
    commentLines.forEach((line, idx) => {
      ctx.fillText(line, W / 2, firstCommentY + idx * commentLineH);
    });
  } else {
    ctx.font = `700 ${isStories ? 32 : 26}px ${fontStack}`;
    ctx.fillStyle = pal.pillText;
    ctx.fillText('✨ PARABÉNS PELA CONQUISTA! ✨', W / 2, cardY + cardH * 0.38);

    ctx.font = `500 ${isStories ? 26 : 21}px ${fontStack}`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('Sorteio realizado com transparência e imparcialidade.', W / 2, cardY + cardH * 0.68);
  }
  ctx.restore();

  ctx.restore(); // Fim do bloco escalável

  drawCanvasAuditFooter(ctx, W, isStories);
}

async function renderWinnerCardCanvas() {
  if (!currentWinners || currentWinners.length === 0 || isGeneratingVideo) return;

  const seq = ++renderSequenceId;
  const selectedIdx = Math.max(0, Math.min(currentWinners.length - 1, parseInt(cardWinnerSelect.value || '0', 10) || 0));
  const details = resolveWinnerDetails(currentWinners[selectedIdx], selectedIdx);

  if (!details.avatarUrl) {
    paintWinnerTemplateFrame(details, selectedIdx, null, false);
    return;
  }

  if (avatarImageCache.has(details.avatarUrl)) {
    paintWinnerTemplateFrame(details, selectedIdx, avatarImageCache.get(details.avatarUrl), false);
    return;
  }

  paintWinnerTemplateFrame(details, selectedIdx, null, true);

  const loadedImg = await loadSafeAvatarImage(details.avatarUrl);
  if (seq !== renderSequenceId || isGeneratingVideo) return;
  paintWinnerTemplateFrame(details, selectedIdx, loadedImg, false);
}

// ==========================================
// GERADOR DE VÍDEO OFICIAL DO SORTEIO (FEED 1:1 & STORIES 9:16)
// ==========================================
function selectSupportedVideoMimeType(withAudio = true) {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = withAudio
    ? [
        { mimeType: 'video/mp4;codecs=avc1.42E028,opus', ext: 'mp4' },
        { mimeType: 'video/mp4;codecs=avc1,opus', ext: 'mp4' },
        { mimeType: 'video/mp4', ext: 'mp4' },
        { mimeType: 'video/webm;codecs=vp9,opus', ext: 'webm' },
        { mimeType: 'video/webm;codecs=vp8,opus', ext: 'webm' },
        { mimeType: 'video/webm', ext: 'webm' }
      ]
    : [
        { mimeType: 'video/mp4;codecs=avc1.42E028', ext: 'mp4' },
        { mimeType: 'video/mp4;codecs=avc1', ext: 'mp4' },
        { mimeType: 'video/mp4', ext: 'mp4' },
        { mimeType: 'video/webm;codecs=vp9', ext: 'webm' },
        { mimeType: 'video/webm;codecs=vp8', ext: 'webm' },
        { mimeType: 'video/webm', ext: 'webm' }
      ];
  for (const item of candidates) {
    if (MediaRecorder.isTypeSupported(item.mimeType)) {
      return item;
    }
  }
  return { mimeType: '', ext: 'webm' };
}

function paintVideoCountdownFrame(W, H, isStories, giveawayTitle, countNum, subProgress) {
  const pal = getActiveThemePalette();
  const ctx = winnerPostCanvas.getContext('2d');
  const fontStack = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';

  drawCanvasLuxuryBackground(ctx, W, H, isStories);
  drawTopPillAndTitle(ctx, W, isStories, '🎲 SORTEIO OFICIAL AUDITADO', giveawayTitle);

  const centerY = isStories ? 940 : 525;
  const baseRadius = isStories ? 210 : 150;
  const popScale = 1 + 0.16 * Math.pow(1 - subProgress, 2);

  // Halo pulsante
  const glow = ctx.createRadialGradient(W / 2, centerY, 20, W / 2, centerY, baseRadius * 2.1);
  glow.addColorStop(0, pal.glowTop);
  glow.addColorStop(0.55, pal.glowBottom);
  glow.addColorStop(1, pal.glowBottomZero);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W / 2, centerY);
  ctx.scale(popScale, popScale);

  // Anel circular de progresso
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - subProgress));
  ctx.strokeStyle = pal.slotStroke;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${isStories ? 185 : 136}px ${fontStack}`;
  ctx.fillText(String(countNum), 0, 8);
  ctx.restore();

  // Subtítulo da base auditada
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${isStories ? 32 : 25}px ${fontStack}`;
  ctx.fillStyle = pal.pillText;
  ctx.fillText('PREPARANDO ROLETA CRIPTOGRÁFICA...', W / 2, centerY + baseRadius + (isStories ? 115 : 74));

  ctx.font = `500 ${isStories ? 26 : 20}px ${fontStack}`;
  ctx.fillStyle = '#cbd5e1';
  const summaryLines = wrapCanvasText(ctx, currentAuditInfo.poolSummary || '', W - 160, 1);
  if (summaryLines[0]) {
    ctx.fillText(summaryLines[0], W / 2, centerY + baseRadius + (isStories ? 168 : 112));
  }
  ctx.restore();

  drawCanvasAuditFooter(ctx, W, isStories);
}

function paintVideoRouletteFrame(W, H, isStories, giveawayTitle, prevLabel, currLabel, nextLabel, progressRatio) {
  const pal = getActiveThemePalette();
  const ctx = winnerPostCanvas.getContext('2d');
  const fontStack = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';

  drawCanvasLuxuryBackground(ctx, W, H, isStories);
  drawTopPillAndTitle(ctx, W, isStories, '⚡ SORTEANDO VENCEDOR(A)...', giveawayTitle);

  const centerY = isStories ? 920 : 518;
  const boxW = W - 140;
  const mainH = isStories ? 165 : 124;
  const sideH = isStories ? 115 : 86;
  const gap = isStories ? 26 : 16;

  // Slot superior (anterior)
  ctx.save();
  ctx.globalAlpha = 0.42;
  drawRoundedRect(ctx, (W - boxW * 0.88) / 2, centerY - mainH / 2 - gap - sideH, boxW * 0.88, sideH, 22);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#94a3b8';
  ctx.font = `700 ${isStories ? 34 : 26}px ${fontStack}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(truncateRouletteText(prevLabel, 34), W / 2, centerY - mainH / 2 - gap - sideH / 2);
  ctx.restore();

  // Slot central em destaque (atual)
  ctx.save();
  const mainX = (W - boxW) / 2;
  const mainY = centerY - mainH / 2;
  drawRoundedRect(ctx, mainX, mainY, boxW, mainH, 28);
  const slotGrad = ctx.createLinearGradient(mainX, mainY, mainX + boxW, mainY + mainH);
  slotGrad.addColorStop(0, pal.slotFill0);
  slotGrad.addColorStop(1, pal.slotFill1);
  ctx.fillStyle = slotGrad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 28;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = pal.slotStroke;
  ctx.stroke();

  let mainFont = isStories ? 52 : 42;
  ctx.font = `800 ${mainFont}px ${fontStack}`;
  const cleanCurr = truncateRouletteText(currLabel, 36);
  while (mainFont > 26 && ctx.measureText(cleanCurr).width > boxW - 70) {
    mainFont -= 2;
    ctx.font = `800 ${mainFont}px ${fontStack}`;
  }
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cleanCurr, W / 2, centerY + 2);
  ctx.restore();

  // Slot inferior (próximo)
  ctx.save();
  ctx.globalAlpha = 0.42;
  drawRoundedRect(ctx, (W - boxW * 0.88) / 2, centerY + mainH / 2 + gap, boxW * 0.88, sideH, 22);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#94a3b8';
  ctx.font = `700 ${isStories ? 34 : 26}px ${fontStack}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(truncateRouletteText(nextLabel, 34), W / 2, centerY + mainH / 2 + gap + sideH / 2);
  ctx.restore();

  // Barra de progresso da roleta
  const barW = W - 220;
  const barH = isStories ? 22 : 18;
  const barX = (W - barW) / 2;
  const barY = centerY + mainH / 2 + gap + sideH + (isStories ? 85 : 46);

  ctx.save();
  drawRoundedRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fill();

  const fillW = Math.max(barH, barW * Math.min(1, Math.max(0, progressRatio)));
  drawRoundedRect(ctx, barX, barY, fillW, barH, barH / 2);
  const barGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
  barGrad.addColorStop(0, pal.barStops[0]);
  barGrad.addColorStop(0.6, pal.barStops[1]);
  barGrad.addColorStop(1, pal.barStops[2]);
  ctx.fillStyle = barGrad;
  ctx.fill();

  ctx.font = `700 ${isStories ? 26 : 20}px ${fontStack}`;
  ctx.fillStyle = pal.pillText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Auditando sorteio... ${Math.round(progressRatio * 100)}%`, W / 2, barY + barH + (isStories ? 44 : 30));
  ctx.restore();

  drawCanvasAuditFooter(ctx, W, isStories);
}

function createBurstParticles(W, H, isStories) {
  const palette = ['#fbbf24', '#ec4899', '#6366f1', '#10b981', '#fde68a', '#f472b6'];
  const originY = isStories ? 720 : 440;
  const particles = [];
  for (let i = 0; i < 68; i++) {
    const angle = (Math.PI * 2 * i) / 68 + (i % 5) * 0.11;
    const speed = 280 + (i % 9) * 85;
    particles.push({
      x0: W / 2,
      y0: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 220,
      size: 10 + (i % 4) * 5,
      color: palette[i % palette.length],
      spin: (i % 2 === 0 ? 1 : -1) * (2.5 + (i % 5)),
      isCircle: i % 4 === 0
    });
  }
  return particles;
}

function drawBurstParticlesOverlay(ctx, particles, elapsedRevealSec) {
  if (elapsedRevealSec <= 0 || elapsedRevealSec > 2.2) return;
  const alpha = elapsedRevealSec < 1.6 ? 0.92 : Math.max(0, 0.92 * (1 - (elapsedRevealSec - 1.6) / 0.6));
  const gravity = 640;

  ctx.save();
  ctx.globalAlpha = alpha;
  for (const p of particles) {
    const x = p.x0 + p.vx * elapsedRevealSec;
    const y = p.y0 + p.vy * elapsedRevealSec + 0.5 * gravity * elapsedRevealSec * elapsedRevealSec;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.spin * elapsedRevealSec);
    ctx.fillStyle = p.color;
    if (p.isCircle) {
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-p.size / 2, -p.size * 0.28, p.size, p.size * 0.56);
    }
    ctx.restore();
  }
  ctx.restore();
}

function setControlsLockedForVideo(locked) {
  isGeneratingVideo = locked;
  btnDownloadPost.disabled = locked;
  btnGenerateVideo.disabled = locked;
  btnUploadPhoto.disabled = locked;
  resultTitleEditInput.disabled = locked;
  cardWinnerSelect.disabled = locked;
  if (btnDownloadPdf) btnDownloadPdf.disabled = locked;
  if (brandHandleInput) brandHandleInput.disabled = locked;
  if (btnUploadBrandLogo) btnUploadBrandLogo.disabled = locked;
  if (btnClearBrandLogo) btnClearBrandLogo.disabled = locked;
  formatBtns.forEach(b => { b.disabled = locked; });
  themeBtns.forEach(b => { b.disabled = locked; });
}

async function generateAndDownloadDrawVideo() {
  if (isGeneratingVideo || !currentWinners || currentWinners.length === 0) return;

  if (!winnerPostCanvas || typeof winnerPostCanvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
    alert('Seu navegador não suporta gravação nativa de vídeo em Canvas. Recomendamos usar o Chrome, Edge ou Safari atualizado!');
    return;
  }

  const selectedIdx = Math.max(0, Math.min(currentWinners.length - 1, parseInt(cardWinnerSelect.value || '0', 10) || 0));
  const details = resolveWinnerDetails(currentWinners[selectedIdx], selectedIdx);
  const isStories = currentPostFormat === 'stories';
  const W = 1080;
  const H = isStories ? 1920 : 1080;
  const giveawayTitle = getActiveGiveawayTitle();

  setControlsLockedForVideo(true);
  clearGeneratedVideoPreview();
  videoRecordingBar.classList.remove('hidden');
  videoRecordingFill.style.width = '0%';
  videoRecordingText.textContent = 'Preparando foto e trilha de áudio...';
  btnGenerateVideo.textContent = '🎬 Gravando Vídeo...';

  try {
    // Pré-carrega a foto do ganhador antes de iniciar o gravador para revelação instantânea sem espera
    const avatarImg = details.avatarUrl ? await loadSafeAvatarImage(details.avatarUrl) : null;

    if (winnerPostCanvas.width !== W || winnerPostCanvas.height !== H) {
      winnerPostCanvas.width = W;
      winnerPostCanvas.height = H;
    }

    // Monta sequência da roleta com participantes reais da base + ganhador na posição final
    const totalRouletteSteps = 28;
    const poolAuthors = currentDrawPool
      .map(item => parseParticipantLine(item).author)
      .filter(Boolean);
    const rouletteSeq = [];
    for (let i = 0; i < totalRouletteSteps; i++) {
      if (poolAuthors.length > 0) {
        rouletteSeq.push(poolAuthors[(i * 7 + 3) % poolAuthors.length]);
      } else {
        rouletteSeq.push(details.author);
      }
    }
    rouletteSeq.push(details.author); // Posição final cravada no ganhador sorteado!

    // Verifica se o relógio de hardware de áudio está realmente ativo antes de anexar trilha de áudio
    // (evita travamento em PCs sem caixa de som conectada ou celulares com áudio bloqueado)
    const ctxAudio = getAudioContext();
    let canRecordAudio = false;
    if (ctxAudio && typeof ctxAudio.createMediaStreamDestination === 'function') {
      if (ctxAudio.state === 'suspended') {
        await Promise.race([
          ctxAudio.resume().catch(() => {}),
          new Promise(r => setTimeout(r, 150))
        ]);
      }
      const audioT0 = ctxAudio.currentTime;
      await new Promise(r => setTimeout(r, 65));
      canRecordAudio = ctxAudio.state === 'running' && ctxAudio.currentTime > audioT0;
    }

    const codecChoice = selectSupportedVideoMimeType(canRecordAudio);
    const canvasStream = winnerPostCanvas.captureStream(30);
    const videoTrack = canvasStream.getVideoTracks()[0];
    let audioDest = null;
    let silentCarrierOsc = null;
    let recorder = null;

    if (canRecordAudio) {
      try {
        audioDest = ctxAudio.createMediaStreamDestination();
        silentCarrierOsc = ctxAudio.createOscillator();
        const silentGain = ctxAudio.createGain();
        silentGain.gain.value = 0.00001;
        silentCarrierOsc.connect(silentGain);
        silentGain.connect(audioDest);
        silentCarrierOsc.start();
      } catch (e) {
        audioDest = null;
      }
    }

    const recorderOpts = { videoBitsPerSecond: 6500000 };
    if (codecChoice && codecChoice.mimeType) {
      recorderOpts.mimeType = codecChoice.mimeType;
    }

    if (audioDest && audioDest.stream.getAudioTracks().length > 0) {
      try {
        const combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...audioDest.stream.getAudioTracks()
        ]);
        recorder = new MediaRecorder(combinedStream, recorderOpts);
      } catch (e) {
        recorder = null;
      }
    }
    if (!recorder) {
      const videoOnlyCodec = selectSupportedVideoMimeType(false);
      recorder = new MediaRecorder(
        canvasStream,
        videoOnlyCodec?.mimeType
          ? { mimeType: videoOnlyCodec.mimeType, videoBitsPerSecond: 6500000 }
          : { videoBitsPerSecond: 6500000 }
      );
    }

    const chunks = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        chunks.push(ev.data);
      }
    };

    const recordingStoppedPromise = new Promise((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = (ev) => reject(ev.error || new Error('Falha na gravação do vídeo'));
    });

    const totalDurationMs = 6500;
    const phase1EndMs = 1350; // Contagem 3, 2, 1
    const phase2EndMs = 4250; // Giro desacelerando até parar no ganhador
    const burstParticles = createBurstParticles(W, H, isStories);

    let lastCountdownNum = -1;
    let lastRouletteIdx = -1;
    let winSoundTriggered = false;

    // Desenha o primeiro frame antes de disparar start()
    paintVideoCountdownFrame(W, H, isStories, giveawayTitle, 3, 0);
    recorder.start(200);

    const startPerf = performance.now();

    await new Promise((resolveLoop) => {
      const frameInterval = setInterval(() => {
        const elapsed = performance.now() - startPerf;
        const clampedElapsed = Math.min(totalDurationMs, elapsed);
        const pct = Math.min(100, Math.round((clampedElapsed / totalDurationMs) * 100));

        videoRecordingFill.style.width = `${pct}%`;
        videoRecordingText.textContent = `Gravando vídeo oficial (${isStories ? 'Stories 9:16' : 'Feed 1:1'})... ${pct}%`;

        if (clampedElapsed < phase1EndMs) {
          // FASE 1: Contagem Regressiva 3, 2, 1
          const stepDur = phase1EndMs / 3;
          const stepIndex = Math.min(2, Math.floor(clampedElapsed / stepDur));
          const countNum = 3 - stepIndex;
          const subProg = (clampedElapsed - stepIndex * stepDur) / stepDur;

          if (countNum !== lastCountdownNum) {
            lastCountdownNum = countNum;
            playCountdownBeep(countNum === 1, audioDest);
          }
          paintVideoCountdownFrame(W, H, isStories, giveawayTitle, countNum, subProg);
        } else if (clampedElapsed < phase2EndMs) {
          // FASE 2: Roleta desacelerando suavemente até o ganhador
          const u = (clampedElapsed - phase1EndMs) / (phase2EndMs - phase1EndMs);
          const eased = 1 - Math.pow(1 - u, 2.85);
          const idx = Math.min(totalRouletteSteps, Math.floor(eased * (totalRouletteSteps + 0.92)));

          if (idx !== lastRouletteIdx) {
            lastRouletteIdx = idx;
            playTickSound(audioDest);
          }

          const prevLabel = rouletteSeq[Math.max(0, idx - 1)];
          const currLabel = rouletteSeq[idx];
          const nextLabel = rouletteSeq[Math.min(rouletteSeq.length - 1, idx + 1)];
          paintVideoRouletteFrame(W, H, isStories, giveawayTitle, prevLabel, currLabel, nextLabel, u);
        } else {
          // FASE 3: Revelação Oficial do Ganhador + Explosão de Confetes
          const revealElapsedSec = (clampedElapsed - phase2EndMs) / 1000;
          if (!winSoundTriggered) {
            winSoundTriggered = true;
            playWinSound(audioDest);
          }

          // Efeito mola suave nos primeiros 0.42s da revelação
          let scale = 1;
          if (revealElapsedSec < 0.42) {
            const t = revealElapsedSec / 0.42;
            scale = 0.84 + 0.16 * (1 + 0.28 * Math.sin(t * Math.PI));
          }

          paintWinnerTemplateFrame(details, selectedIdx, avatarImg, false, scale);

          const ctx = winnerPostCanvas.getContext('2d');
          if (revealElapsedSec < 0.35) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 251, 235, ${(1 - revealElapsedSec / 0.35) * 0.38})`;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
          }
          drawBurstParticlesOverlay(ctx, burstParticles, revealElapsedSec);
        }

        if (videoTrack && typeof videoTrack.requestFrame === 'function') {
          try { videoTrack.requestFrame(); } catch (e) {}
        }

        if (elapsed >= totalDurationMs) {
          clearInterval(frameInterval);
          resolveLoop();
        }
      }, 1000 / 30);
    });

    if (recorder.state !== 'inactive') {
      try { recorder.requestData(); } catch (e) {}
      recorder.stop();
    }
    await Promise.race([
      recordingStoppedPromise,
      new Promise(r => setTimeout(r, 2500))
    ]);

    if (silentCarrierOsc) {
      try { silentCarrierOsc.stop(); } catch (e) {}
    }
    canvasStream.getTracks().forEach(t => t.stop());

    // Restaura o frame estático limpo do card do ganhador no Canvas
    paintWinnerTemplateFrame(details, selectedIdx, avatarImg, false, 1);

    const finalMime = recorder.mimeType || codecChoice?.mimeType || 'video/webm';
    const finalExt = finalMime.includes('mp4') ? 'mp4' : (codecChoice?.ext || 'webm');
    const videoBlob = new Blob(chunks, { type: finalMime });

    const titleSlug = buildSlug(giveawayTitle);
    const winnerSlug = buildSlug(details.author);
    const filename = `video-sorteio-${titleSlug}-${winnerSlug}-${currentPostFormat}.${finalExt}`;

    currentGeneratedVideoUrl = URL.createObjectURL(videoBlob);

    if (generatedVideoPlayer) {
      generatedVideoPlayer.src = currentGeneratedVideoUrl;
    }
    if (btnSaveReadyVideo) {
      btnSaveReadyVideo.href = currentGeneratedVideoUrl;
      btnSaveReadyVideo.download = filename;
      btnSaveReadyVideo.textContent = `⬇️ Salvar Vídeo (${finalExt.toUpperCase()})`;
    }
    if (videoResultBox) {
      videoResultBox.classList.remove('hidden');
    }

    // Dispara download automático imediatamente
    triggerDataUrlDownload(currentGeneratedVideoUrl, filename);

    btnGenerateVideo.textContent = '✅ Vídeo Baixado com Sucesso!';
    setTimeout(() => {
      if (!isGeneratingVideo) {
        btnGenerateVideo.textContent = VIDEO_BTN_DEFAULT_TEXT;
      }
    }, 2600);
  } catch (err) {
    alert(`Não foi possível gerar o vídeo neste navegador: ${err.message || err}`);
    btnGenerateVideo.textContent = VIDEO_BTN_DEFAULT_TEXT;
  } finally {
    videoRecordingBar.classList.add('hidden');
    setControlsLockedForVideo(false);
    renderWinnerCardCanvas();
  }
}

btnGenerateVideo.addEventListener('click', () => {
  generateAndDownloadDrawVideo();
});

// Alternar formato Feed (1:1) vs Stories (9:16)
formatBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (isGeneratingVideo) return;
    formatBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPostFormat = btn.dataset.format === 'stories' ? 'stories' : 'feed';
    renderWinnerCardCanvas();
  });
});

cardWinnerSelect.addEventListener('change', () => {
  if (isGeneratingVideo) return;
  renderWinnerCardCanvas();
});

// Enviar / Trocar Foto Manualmente
btnUploadPhoto.addEventListener('click', () => {
  if (isGeneratingVideo) return;
  winnerPhotoUpload.click();
});

winnerPhotoUpload.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result || '');
    if (dataUrl.startsWith('data:image/')) {
      const selectedIdx = Math.max(0, parseInt(cardWinnerSelect.value || '0', 10) || 0);
      customWinnerPhotos.set(selectedIdx, dataUrl);
      renderWinnersDomList();
      renderWinnerCardCanvas();
    }
  };
  reader.readAsDataURL(file);
  winnerPhotoUpload.value = '';
});

// ==========================================
// MARCA PRÓPRIA (LOGO, @ARROBA & TEMA DE CORES PERSISTENTES)
// ==========================================
function syncBrandLogoUiState() {
  const hasLogo = Boolean(currentBrandLogoDataUrl && brandLogoImage);
  if (btnUploadBrandLogo) {
    btnUploadBrandLogo.textContent = hasLogo ? BRAND_LOGO_BTN_LOADED : BRAND_LOGO_BTN_DEFAULT;
  }
  if (btnClearBrandLogo) {
    btnClearBrandLogo.classList.toggle('hidden', !hasLogo);
  }
}

async function applyBrandLogoDataUrl(dataUrl, persist = false) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    currentBrandLogoDataUrl = '';
    brandLogoImage = null;
    if (persist) safeStorageRemove(STORAGE_KEYS.brandLogo);
    syncBrandLogoUiState();
    renderWinnerCardCanvas();
    return false;
  }

  try {
    const rawImg = await loadImageFromSrc(dataUrl);
    const maxDim = 220;
    const scale = Math.min(1, maxDim / Math.max(rawImg.width || 1, rawImg.height || 1));
    const w = Math.max(1, Math.round(rawImg.width * scale));
    const h = Math.max(1, Math.round(rawImg.height * scale));

    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const offCtx = off.getContext('2d');
    offCtx.drawImage(rawImg, 0, 0, w, h);
    const compactDataUrl = off.toDataURL('image/png');
    const finalImg = await loadImageFromSrc(compactDataUrl);

    currentBrandLogoDataUrl = compactDataUrl;
    brandLogoImage = finalImg;
    if (persist) safeStorageSet(STORAGE_KEYS.brandLogo, compactDataUrl);
    syncBrandLogoUiState();
    renderWinnerCardCanvas();
    return true;
  } catch (e) {
    return false;
  }
}

(function initSavedBrandPreferences() {
  const savedTheme = safeStorageGet(STORAGE_KEYS.brandTheme);
  if (savedTheme && BRAND_THEMES[savedTheme]) {
    currentBrandTheme = savedTheme;
  }
  themeBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === currentBrandTheme);
  });

  const savedHandle = safeStorageGet(STORAGE_KEYS.brandHandle);
  if (savedHandle) {
    currentBrandHandle = stripInvisibleChars(savedHandle).slice(0, 45);
    if (brandHandleInput) brandHandleInput.value = currentBrandHandle;
  }

  const savedLogo = safeStorageGet(STORAGE_KEYS.brandLogo);
  if (savedLogo && savedLogo.startsWith('data:image/')) {
    applyBrandLogoDataUrl(savedLogo, false);
  } else {
    syncBrandLogoUiState();
  }
})();

themeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (isGeneratingVideo) return;
    const chosen = btn.dataset.theme;
    if (!chosen || !BRAND_THEMES[chosen]) return;
    currentBrandTheme = chosen;
    safeStorageSet(STORAGE_KEYS.brandTheme, chosen);
    themeBtns.forEach(b => b.classList.toggle('active', b === btn));
    renderWinnerCardCanvas();
  });
});

if (brandHandleInput) {
  brandHandleInput.addEventListener('input', () => {
    if (isGeneratingVideo) return;
    currentBrandHandle = stripInvisibleChars(brandHandleInput.value).slice(0, 45);
    safeStorageSet(STORAGE_KEYS.brandHandle, currentBrandHandle);
    renderWinnerCardCanvas();
  });
}

if (btnUploadBrandLogo && brandLogoUpload) {
  btnUploadBrandLogo.addEventListener('click', () => {
    if (isGeneratingVideo) return;
    brandLogoUpload.click();
  });

  brandLogoUpload.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (dataUrl.startsWith('data:image/')) {
        applyBrandLogoDataUrl(dataUrl, true);
      }
    };
    reader.readAsDataURL(file);
    brandLogoUpload.value = '';
  });
}

if (btnClearBrandLogo) {
  btnClearBrandLogo.addEventListener('click', () => {
    if (isGeneratingVideo) return;
    applyBrandLogoDataUrl('', true);
  });
}

function buildSlug(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 45) || 'sorteio';
}

function triggerDataUrlDownload(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

btnDownloadPost.addEventListener('click', async () => {
  if (isGeneratingVideo || !currentWinners || currentWinners.length === 0) return;

  await renderWinnerCardCanvas();

  const selectedIdx = Math.max(0, parseInt(cardWinnerSelect.value || '0', 10) || 0);
  const details = resolveWinnerDetails(currentWinners[selectedIdx], selectedIdx);
  const titleSlug = buildSlug(getActiveGiveawayTitle());
  const winnerSlug = buildSlug(details.author);
  const filename = `resultado-${titleSlug}-${winnerSlug}-${currentPostFormat}.png`;

  try {
    if (typeof winnerPostCanvas.toBlob === 'function') {
      winnerPostCanvas.toBlob((blob) => {
        if (!blob) {
          const dataUrl = winnerPostCanvas.toDataURL('image/png');
          triggerDataUrlDownload(dataUrl, filename);
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        triggerDataUrlDownload(blobUrl, filename);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      }, 'image/png');
    } else {
      const dataUrl = winnerPostCanvas.toDataURL('image/png');
      triggerDataUrlDownload(dataUrl, filename);
    }

    btnDownloadPost.textContent = '✅ Imagem Baixada com Sucesso!';
    if (downloadFeedbackTimeout) clearTimeout(downloadFeedbackTimeout);
    downloadFeedbackTimeout = setTimeout(() => {
      btnDownloadPost.textContent = DOWNLOAD_BTN_DEFAULT_TEXT;
    }, 2200);
  } catch (err) {
    alert('Não foi possível exportar a imagem automaticamente. Tente enviar a foto manualmente no botão "Foto do Ganhador".');
  }
});

// ==========================================
// CERTIFICADO / ATA OFICIAL DE AUDITORIA EM PDF (A4 NATIVO)
// ==========================================
function asciiToBytes(str) {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i) & 0xff;
  }
  return arr;
}

function base64ToUint8Array(base64Str) {
  const bin = atob(base64Str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function buildSinglePageJpegPdfBlob(jpegDataUrl, imgW, imgH) {
  const commaIdx = jpegDataUrl.indexOf(',');
  const b64 = commaIdx !== -1 ? jpegDataUrl.slice(commaIdx + 1) : jpegDataUrl;
  const jpegBytes = base64ToUint8Array(b64);

  const pageW = 595.28; // A4 width in PDF points
  const pageH = 841.89; // A4 height in PDF points

  const chunks = [];
  let byteOffset = 0;
  const pushBytes = (u8) => {
    chunks.push(u8);
    byteOffset += u8.length;
  };
  const pushAscii = (s) => pushBytes(asciiToBytes(s));

  const offsets = [0];

  // Cabeçalho binário ISO 32000-1 PDF-1.4
  pushBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  // Obj 1: Catalog
  offsets[1] = byteOffset;
  pushAscii('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Obj 2: Pages
  offsets[2] = byteOffset;
  pushAscii('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // Obj 3: Page
  offsets[3] = byteOffset;
  pushAscii(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  // Obj 4: Image XObject (/DCTDecode)
  offsets[4] = byteOffset;
  pushAscii(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  pushBytes(jpegBytes);
  pushAscii('\nendstream\nendobj\n');

  // Obj 5: Page Content Stream
  const contentStream = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
  offsets[5] = byteOffset;
  pushAscii(`5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);

  // Tabela xref (exatos 20 bytes por entrada conforme padrão PDF-1.4)
  const xrefStart = byteOffset;
  let xrefStr = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) {
    xrefStr += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  xrefStr += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  pushAscii(xrefStr);

  return new Blob(chunks, { type: 'application/pdf' });
}

function paintAuditCertificateCanvas() {
  const W = 1240;
  const H = 1754; // Proporção exata A4 em 150 DPI
  const certCanvas = document.createElement('canvas');
  certCanvas.width = W;
  certCanvas.height = H;
  const ctx = certCanvas.getContext('2d');
  const fontStack = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  const monoStack = '"Courier New", Consolas, monospace';

  // Fundo papel marfim claro + moldura dupla institucional
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, W, H);

  drawRoundedRect(ctx, 38, 38, W - 76, H - 76, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#1e293b';
  ctx.stroke();

  drawRoundedRect(ctx, 50, 50, W - 100, H - 100, 12);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#d97706';
  ctx.stroke();

  // Faixa Superior Institucional
  const headerX = 74;
  const headerY = 74;
  const headerW = W - 148;
  const headerH = 210;
  drawRoundedRect(ctx, headerX, headerY, headerW, headerH, 16);
  const headGrad = ctx.createLinearGradient(headerX, headerY, headerX + headerW, headerY + headerH);
  headGrad.addColorStop(0, '#0f172a');
  headGrad.addColorStop(0.6, '#1e1b4b');
  headGrad.addColorStop(1, '#312e81');
  ctx.fillStyle = headGrad;
  ctx.fill();

  const hasLogo = Boolean(brandLogoImage && brandLogoImage.width > 0 && brandLogoImage.height > 0);
  if (hasLogo) {
    const logoR = 46;
    const logoCx = headerX + 76;
    const logoCy = headerY + headerH / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoCx, logoCy, logoR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const s = Math.max((logoR * 2) / brandLogoImage.width, (logoR * 2) / brandLogoImage.height);
    ctx.drawImage(brandLogoImage, logoCx - (brandLogoImage.width * s) / 2, logoCy - (brandLogoImage.height * s) / 2, brandLogoImage.width * s, brandLogoImage.height * s);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(logoCx, logoCy, logoR + 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fbbf24';
  ctx.font = `800 20px ${fontStack}`;
  ctx.fillText('ATA E CERTIFICADO DIGITAL DE AUDITORIA CRIPTOGRÁFICA', W / 2, headerY + 52);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 36px ${fontStack}`;
  ctx.fillText('RESULTADO OFICIAL DE SORTEIO', W / 2, headerY + 104);

  const protoText = `PROTOCOLO ${currentAuditInfo.protocolId || '#SP-AUDIT'}`;
  ctx.font = `800 20px ${fontStack}`;
  const protoPillW = Math.max(290, ctx.measureText(protoText).width + 48);
  drawRoundedRect(ctx, (W - protoPillW) / 2, headerY + 140, protoPillW, 42, 21);
  ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#fde68a';
  ctx.fillText(protoText, W / 2, headerY + 161);

  // Bloco 1: Identificação do Sorteio & Regras
  let curY = headerY + headerH + 30;
  const secX = 74;
  const secW = W - 148;
  const metaH = 225;

  drawRoundedRect(ctx, secX, curY, secW, metaH, 14);
  ctx.fillStyle = '#f1f5f9';
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const giveawayTitle = getActiveGiveawayTitle();
  const organizerText = stripInvisibleChars(currentBrandHandle || '').trim() || 'SorteadorPro Oficial';
  const dateText = currentDrawDateStr || new Date().toLocaleString('pt-BR');

  const drawMetaRow = (label, value, rowY) => {
    ctx.font = `800 21px ${fontStack}`;
    ctx.fillStyle = '#334155';
    ctx.fillText(label, secX + 26, rowY);
    const labelW = ctx.measureText(label).width + 12;
    ctx.font = `600 21px ${fontStack}`;
    ctx.fillStyle = '#0f172a';
    const wrapped = wrapCanvasText(ctx, value, secW - 52 - labelW, 2);
    wrapped.forEach((ln, idx) => {
      ctx.fillText(ln, secX + 26 + labelW, rowY + idx * 27);
    });
  };

  drawMetaRow('Campanha / Sorteio:', giveawayTitle, curY + 22);
  drawMetaRow('Data e Horário Oficial:', dateText, curY + 68);
  drawMetaRow('Organização / Página:', organizerText, curY + 114);
  drawMetaRow('Base & Regras Auditadas:', currentAuditInfo.poolSummary || `${currentWinners.length} sorteado(s)`, curY + 160);

  curY += metaH + 30;

  // Bloco 2: Ganhadores Titulares Homologados
  ctx.font = `800 24px ${fontStack}`;
  ctx.fillStyle = '#0f172a';
  ctx.fillText('🏆 GANHADOR(ES) TITULAR(ES) HOMOLOGADO(S)', secX, curY);
  curY += 38;

  const maxDisplayedWinners = 7;
  const shownWinners = currentWinners.slice(0, maxDisplayedWinners);
  const winnerRowH = 66;
  const winnersBoxH = Math.max(90, shownWinners.length * winnerRowH + (currentWinners.length > maxDisplayedWinners ? 48 : 20));

  drawRoundedRect(ctx, secX, curY, secW, winnersBoxH, 14);
  ctx.fillStyle = '#fffbeb';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.stroke();

  shownWinners.forEach((wRaw, idx) => {
    const rowTop = curY + 14 + idx * winnerRowH;
    const det = resolveWinnerDetails(wRaw, idx);

    drawRoundedRect(ctx, secX + 20, rowTop + 6, 132, 42, 8);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.font = `800 18px ${fontStack}`;
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${idx + 1}º LUGAR`, secX + 86, rowTop + 27);

    ctx.textAlign = 'left';
    ctx.font = `800 23px ${fontStack}`;
    ctx.fillStyle = '#0f172a';
    const mainLabel = det.comment ? `${det.author} — "${det.comment}"` : det.author;
    const lineArr = wrapCanvasText(ctx, mainLabel, secW - 190, 1);
    ctx.fillText(lineArr[0] || det.author, secX + 170, rowTop + 27);
  });

  if (currentWinners.length > maxDisplayedWinners) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `700 19px ${fontStack}`;
    ctx.fillStyle = '#92400e';
    ctx.fillText(
      `+ ${currentWinners.length - maxDisplayedWinners} outro(s) ganhador(es) titular(es) registrado(s) na assinatura SHA-256 abaixo.`,
      secX + 24,
      curY + winnersBoxH - 24
    );
  }

  curY += winnersBoxH + 28;

  // Bloco 3: Ganhadores Substitutos / Suplentes
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `800 22px ${fontStack}`;
  ctx.fillStyle = '#1e293b';
  ctx.fillText('🛡️ SUPLENTES / GANHADORES SUBSTITUTOS', secX, curY);
  curY += 34;

  const shownSubs = currentSubstitutes.slice(0, 4);
  const subsBoxH = shownSubs.length > 0 ? (shownSubs.length * 42 + 24) : 64;
  drawRoundedRect(ctx, secX, curY, secW, subsBoxH, 12);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (shownSubs.length > 0) {
    shownSubs.forEach((sRaw, idx) => {
      const sLine = wrapCanvasText(ctx, `Reserva #${idx + 1}: ${sRaw}`, secW - 48, 1)[0];
      ctx.font = `600 20px ${fontStack}`;
      ctx.fillStyle = '#334155';
      ctx.fillText(sLine, secX + 24, curY + 14 + idx * 42);
    });
  } else {
    ctx.font = `600 19px ${fontStack}`;
    ctx.fillStyle = '#64748b';
    ctx.fillText('Nenhum suplente pendente na fila no momento da emissão.', secX + 24, curY + 21);
  }

  curY += subsBoxH + 26;

  // Bloco 4: Registro de Substituições (Transparência)
  if (currentDisqualifiedLog && currentDisqualifiedLog.length > 0) {
    ctx.font = `800 21px ${fontStack}`;
    ctx.fillStyle = '#b45309';
    ctx.fillText('📋 HISTÓRICO AUDITÁVEL DE SUBSTITUIÇÕES REALIZADAS', secX, curY);
    curY += 32;

    const shownLogs = currentDisqualifiedLog.slice(0, 3);
    const logBoxH = shownLogs.length * 38 + 22;
    drawRoundedRect(ctx, secX, curY, secW, logBoxH, 12);
    ctx.fillStyle = '#fff7ed';
    ctx.fill();
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    shownLogs.forEach((lg, idx) => {
      const logLine = wrapCanvasText(
        ctx,
        `• ${lg.rank}º Lugar (${lg.previousAuthor}) substituído às ${lg.timeStr} → assumiu ${lg.promotedAuthor}`,
        secW - 44,
        1
      )[0];
      ctx.font = `600 18px ${fontStack}`;
      ctx.fillStyle = '#7c2d12';
      ctx.fillText(logLine, secX + 22, curY + 12 + idx * 38);
    });
    curY += logBoxH + 24;
  }

  // Bloco 5: Assinatura Digital Criptográfica SHA-256 (Fixado próximo ao rodapé)
  const certFooterH = 215;
  const certFooterY = Math.max(curY, H - 74 - certFooterH);
  drawRoundedRect(ctx, secX, certFooterY, secW, certFooterH, 14);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `800 20px ${fontStack}`;
  ctx.fillStyle = '#34d399';
  ctx.fillText('🔒 DECLARAÇÃO DE INTEGRIDADE & HASH CRIPTOGRÁFICO SHA-256', secX + 26, certFooterY + 22);

  ctx.font = `500 17px ${fontStack}`;
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(
    'Seleção gerada via CSPRNG nativo (window.crypto.getRandomValues) com Rejection Sampling sem viés matemático.',
    secX + 26,
    certFooterY + 56
  );

  drawRoundedRect(ctx, secX + 26, certFooterY + 94, secW - 52, 54, 8);
  ctx.fillStyle = '#020617';
  ctx.fill();
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.font = `700 20px ${monoStack}`;
  ctx.fillStyle = '#a7f3d0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(currentAuditInfo.sha256Hex || '—', W / 2, certFooterY + 121);

  ctx.font = `600 16px ${fontStack}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(
    `Documento emitido eletronicamente por SorteadorPro • Protocolo ${currentAuditInfo.protocolId || '#SP-AUDIT'} • ${dateText}`,
    W / 2,
    certFooterY + 178
  );

  return certCanvas;
}

function generateAndDownloadAuditPdf(skipDownload = false) {
  if (isGeneratingVideo || !currentWinners || currentWinners.length === 0) return null;

  const certCanvas = paintAuditCertificateCanvas();
  const jpegDataUrl = certCanvas.toDataURL('image/jpeg', 0.93);
  const pdfBlob = buildSinglePageJpegPdfBlob(jpegDataUrl, certCanvas.width, certCanvas.height);

  const titleSlug = buildSlug(getActiveGiveawayTitle());
  const protoSlug = buildSlug(currentAuditInfo.protocolId || 'auditoria');
  const filename = `certificado-${titleSlug}-${protoSlug}.pdf`;

  if (!skipDownload) {
    const blobUrl = URL.createObjectURL(pdfBlob);
    triggerDataUrlDownload(blobUrl, filename);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 6000);

    if (btnDownloadPdf) {
      btnDownloadPdf.textContent = '✅ Certificado PDF Baixado!';
      if (pdfFeedbackTimeout) clearTimeout(pdfFeedbackTimeout);
      pdfFeedbackTimeout = setTimeout(() => {
        btnDownloadPdf.textContent = PDF_BTN_DEFAULT_TEXT;
      }, 2400);
    }
  }

  return { blob: pdfBlob, filename };
}

if (btnDownloadPdf) {
  btnDownloadPdf.addEventListener('click', () => {
    try {
      generateAndDownloadAuditPdf(false);
    } catch (err) {
      alert(`Não foi possível gerar o certificado PDF: ${err.message || err}`);
    }
  });
}

// ==========================================
// COPIAR RESULTADO & RESET
// ==========================================
function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopyText(text));
  }
  return fallbackCopyText(text);
}

function fallbackCopyText(text) {
  return new Promise((resolve, reject) => {
    try {
      const tempArea = document.createElement('textarea');
      tempArea.value = text;
      tempArea.style.position = 'fixed';
      tempArea.style.opacity = '0';
      document.body.appendChild(tempArea);
      tempArea.focus();
      tempArea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(tempArea);
      ok ? resolve() : reject(new Error('Copy failed'));
    } catch (err) {
      reject(err);
    }
  });
}

btnCopyResult.addEventListener('click', () => {
  const giveawayTitle = getActiveGiveawayTitle();
  const dateStr = resultTimestamp.textContent;
  let text = `🎉 RESULTADO OFICIAL — ${giveawayTitle} 🎉\n${dateStr}\n`;
  if (currentBrandHandle.trim()) {
    text += `🏢 Realização: ${currentBrandHandle.trim()}\n`;
  }
  text += `🔒 Protocolo de Auditoria: ${currentAuditInfo.protocolId}\n`;
  text += `📊 Base Auditada: ${currentAuditInfo.poolSummary}\n\n`;

  const winnerItems = document.querySelectorAll('.winner-name');
  text += `🏆 GANHADOR(ES) TITULAR(ES):\n`;
  winnerItems.forEach((w, i) => {
    text += `${i + 1}º Lugar: ${w.textContent}\n`;
  });

  const subNames = document.querySelectorAll('.sub-name');
  if (subNames.length > 0) {
    text += `\n🛡️ GANHADOR(ES) SUBSTITUTO(S) / RESERVAS:\n`;
    subNames.forEach((s, i) => {
      text += `Reserva ${i + 1}: ${s.textContent}\n`;
    });
  }

  if (currentDisqualifiedLog && currentDisqualifiedLog.length > 0) {
    text += `\n📋 REGISTRO DE SUBSTITUIÇÕES:\n`;
    currentDisqualifiedLog.forEach((lg) => {
      text += `• ${lg.rank}º Lugar (${lg.previousAuthor}) substituído às ${lg.timeStr} → assumiu ${lg.promotedAuthor}\n`;
    });
  }

  text += `\n🔑 Assinatura SHA-256: ${currentAuditInfo.sha256Hex}`;
  text += `\nSorteio criptográfico realizado pelo SorteadorPro!`;

  copyTextToClipboard(text)
    .then(() => {
      btnCopyResult.textContent = '✅ Copiado com Sucesso!';
      if (copyFeedbackTimeout) clearTimeout(copyFeedbackTimeout);
      copyFeedbackTimeout = setTimeout(() => {
        btnCopyResult.textContent = COPY_BTN_DEFAULT_TEXT;
      }, 2000);
    })
    .catch(() => {
      alert('Não foi possível copiar automaticamente. Selecione o resultado na tela para copiar.');
    });
});

btnNewDraw.addEventListener('click', () => {
  if (isGeneratingVideo) return;
  resetView();
});

function resetView() {
  if (activeDrawTimer) {
    clearTimeout(activeDrawTimer);
    activeDrawTimer = null;
  }
  clearGeneratedVideoPreview();
  animationBox.classList.add('hidden');
  resultBox.classList.add('hidden');
  document.querySelector('.tabs-container').classList.remove('hidden');
  giveawayMetaBox.classList.remove('hidden');

  const activeTabBtn = document.querySelector('.tab-btn.active');
  if (activeTabBtn) {
    document.getElementById(activeTabBtn.dataset.tab).classList.add('active');
  }
  updateWorkflowStep(1);
}
