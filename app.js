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

function playTickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {
    // Ignore audio errors on restricted devices
  }
}

function playWinSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.12;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch (e) {
    // Ignore audio errors on restricted devices
  }
}

// ==========================================
// UNBIASED CRYPTO RANDOM UTILITIES
// ==========================================
function getRandomIndex(max) {
  if (max <= 1) return 0;
  const array = new Uint32Array(1);
  if (max <= 0x100000000) {
    const limit = Math.floor(0x100000000 / max) * max;
    let val;
    do {
      window.crypto.getRandomValues(array);
      val = array[0];
    } while (val >= limit);
    return val % max;
  }
  const pair = new Uint32Array(2);
  window.crypto.getRandomValues(pair);
  const random53 = (pair[0] * 0x200000 + (pair[1] >>> 11)) / 0x20000000000000;
  return Math.floor(random53 * max);
}

// ==========================================
// DOM ELEMENTS & STATE
// ==========================================
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Identificação do Sorteio
const giveawayMetaBox = document.getElementById('giveaway-meta-box');
const giveawayTitleInput = document.getElementById('giveaway-title');

// Aba 1: Por Link
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
const linkRequireMention = document.getElementById('link-require-mention');
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
const optRequireMention = document.getElementById('opt-require-mention');
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
const resultTimestamp = document.getElementById('result-timestamp');
const btnCopyResult = document.getElementById('btn-copy-result');
const btnNewDraw = document.getElementById('btn-new-draw');

// Gerador de Post / Template do Ganhador
const formatBtns = document.querySelectorAll('.format-btn');
const cardWinnerSelectorWrap = document.getElementById('card-winner-selector-wrap');
const cardWinnerSelect = document.getElementById('card-winner-select');
const winnerPostCanvas = document.getElementById('winner-post-canvas');
const resultTitleEditInput = document.getElementById('result-title-edit');
const winnerPhotoUpload = document.getElementById('winner-photo-upload');
const btnUploadPhoto = document.getElementById('btn-upload-photo');
const btnDownloadPost = document.getElementById('btn-download-post');

let lastFetchedUrl = '';
let isFetchingLink = false;
let activeDrawTimer = null;
let copyFeedbackTimeout = null;
let downloadFeedbackTimeout = null;
let currentWinners = [];
let currentSubstitutes = [];
let currentDrawDateStr = '';
let currentPostFormat = 'feed'; // 'feed' (1080x1080) | 'stories' (1080x1920)
let renderSequenceId = 0;

// Metadados dos participantes (foto de perfil e nome completo vindos da API ou planilha)
const participantMetaMap = new Map();
// Fotos enviadas manualmente pelo botão "Enviar / Trocar Foto" (por índice de ganhador)
const customWinnerPhotos = new Map();
// Cache de imagens carregadas via Blob/DataURL (sem taint de CORS no Canvas)
const avatarImageCache = new Map();

const COPY_BTN_DEFAULT_TEXT = '📋 Copiar Resultado Formatado';
const DOWNLOAD_BTN_DEFAULT_TEXT = '⬇️ Baixar Arte do Ganhador (PNG Alta Resolução)';

function normalizeAuthorKey(author) {
  return String(author || '').trim().replace(/^@/, '').toLowerCase();
}

function registerParticipantMeta(rawUser, rawComment, avatarUrl, fullName) {
  const formatted = formatParticipantRecord(rawUser, rawComment);
  if (!formatted) return '';

  const parsed = parseParticipantLine(formatted);
  const key = normalizeAuthorKey(parsed.author);
  if (key) {
    const existing = participantMetaMap.get(key) || {};
    const cleanAvatar = String(avatarUrl || '').trim();
    const cleanFullName = String(fullName || '').trim();
    participantMetaMap.set(key, {
      username: parsed.author,
      avatarUrl: cleanAvatar || existing.avatarUrl || '',
      fullName: cleanFullName || existing.fullName || ''
    });
  }
  return formatted;
}

function getActiveGiveawayTitle() {
  const raw = (giveawayTitleInput?.value || resultTitleEditInput?.value || '').trim();
  return raw || 'Sorteio Oficial';
}

giveawayTitleInput.addEventListener('input', () => {
  if (resultTitleEditInput && resultTitleEditInput.value !== giveawayTitleInput.value) {
    resultTitleEditInput.value = giveawayTitleInput.value;
  }
});

resultTitleEditInput.addEventListener('input', () => {
  giveawayTitleInput.value = resultTitleEditInput.value;
  resultGiveawayBadge.textContent = getActiveGiveawayTitle();
  renderWinnerCardCanvas();
});

// Tab Switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
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
    const maxPages = 5;
    let activeProvider = null;

    // Encontra o provedor RapidAPI ativo na conta
    for (const provider of RAPIDAPI_PROVIDERS) {
      const firstResponse = await fetch(provider.buildUrl(shortcode, url, null), {
        method: 'GET',
        headers: {
          'x-rapidapi-key': DEFAULT_RAPIDAPI_KEY,
          'x-rapidapi-host': provider.host
        }
      });

      if (firstResponse.status === 401 || firstResponse.status === 403) {
        continue;
      }
      if (firstResponse.status === 429) {
        throw new Error('Limite gratuito de buscas da API atingido neste momento. Use a aba "📊 Planilha / Lista" sem limites!');
      }
      if (!firstResponse.ok) {
        throw new Error(`Não foi possível consultar esta publicação (HTTP ${firstResponse.status}).`);
      }

      activeProvider = provider;
      const firstData = await firstResponse.json();
      const firstItems = firstData?.comments || firstData?.data?.comments || firstData?.data?.items || firstData?.items || [];
      if (Array.isArray(firstItems) && firstItems.length > 0) {
        allComments.push(...firstItems);
        showStatusMessage(fetchStatusMsg, `Buscando comentários... (${allComments.length} carregados)`, 'info');
      }

      let paginationToken = firstData?.pagination_token || firstData?.next_max_id || firstData?.data?.pagination_token || null;

      for (let page = 1; page < maxPages && paginationToken && firstItems.length > 0; page++) {
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
        if (Array.isArray(nextItems) && nextItems.length > 0) {
          allComments.push(...nextItems);
          showStatusMessage(fetchStatusMsg, `Buscando comentários... (${allComments.length} carregados)`, 'info');
        }
        paginationToken = nextData?.pagination_token || nextData?.next_max_id || nextData?.data?.pagination_token || null;
        if (nextItems.length === 0) break;
      }
      break;
    }

    if (!activeProvider) {
      throw new Error('Falta clicar em "Subscribe" no plano grátis ($0.00) da API "Instagram Scraper Stable API" na RapidAPI.');
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
      showStatusMessage(fetchStatusMsg, `✅ ${parsed.length} comentário(s) carregado(s) com sucesso! Pronto para sortear.`, 'success');
      return true;
    } else {
      throw new Error('Nenhum comentário encontrado ou a publicação é privada.');
    }
  } catch (err) {
    showStatusMessage(fetchStatusMsg, `⚠️ ${err.message}`, 'error');
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

  // Se o usuário só colou o link e clicou direto em REALIZAR SORTEIO, busca os comentários automaticamente!
  if (url && (url !== lastFetchedUrl || !linkCommentsInput.value.trim())) {
    const ok = await fetchCommentsFromUrl(url);
    if (!ok) return;
  }

  executeParticipantsDraw({
    rawText: linkCommentsInput.value,
    removeDuplicates: linkRemoveDuplicates.checked,
    requireMention: linkRequireMention.checked,
    winnersCount: parseInt(linkWinnersCountInput.value, 10),
    substitutesCount: parseInt(linkSubstitutesCountInput.value, 10)
  });
});

function updateLinkCount() {
  const { rawCount, validItems } = getFilteredParticipantsFromText(
    linkCommentsInput.value,
    linkRemoveDuplicates.checked,
    linkRequireMention.checked
  );
  updateBadgeElement(linkLinesCountBadge, rawCount, validItems.length);
}

linkRemoveDuplicates.addEventListener('change', updateLinkCount);
linkRequireMention.addEventListener('change', updateLinkCount);

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
  const cleanUser = String(rawUser || '').replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim();
  const cleanComment = String(rawComment || '').replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!cleanUser && !cleanComment) return '';
  if (!cleanUser) return cleanComment;

  const formattedUser = (!cleanUser.startsWith('@') && /^[a-zA-Z0-9_.]+$/.test(cleanUser))
    ? `@${cleanUser}`
    : cleanUser;

  return cleanComment ? `${formattedUser} - ${cleanComment}` : formattedUser;
}

function normalizeHeader(header) {
  return String(header || '')
    .replace(/^\uFEFF/, '')
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
      if (typeof item === 'string') return item.trim();
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
  const content = String(rawContent || '').replace(/^\uFEFF/, '').trim();
  if (!content) {
    showStatusMessage(sheetStatusMsg, 'O arquivo selecionado está vazio!', 'error');
    return;
  }

  const lowerName = fileName.toLowerCase();
  let parsedComments = [];

  // 1. JSON Format
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

  // 2. CSV / TSV Format
  const delimiter = detectDelimiter(content, fileName);
  const isTabularFile = lowerName.endsWith('.csv') || lowerName.endsWith('.tsv');

  if (delimiter && (isTabularFile || content.split(/\r?\n/)[0].includes(delimiter))) {
    const rows = parseDelimitedRows(content, delimiter);
    parsedComments = extractParticipantsFromRows(rows);
  } else {
    // 3. Plain Text (.txt)
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
  const line = rawLine.trim();

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

function hasValidFriendMention(parsed) {
  if (!parsed.hasCommentBody || !parsed.comment) return false;

  const cleanAuthor = parsed.author.replace(/^@/, '').toLowerCase();
  const mentionRegex = /(?:^|[^a-zA-Z0-9_.])@([a-zA-Z0-9_.]*[a-zA-Z0-9_])/g;
  let match;

  while ((match = mentionRegex.exec(parsed.comment)) !== null) {
    const mentionedUser = match[1].toLowerCase();
    if (mentionedUser && mentionedUser !== cleanAuthor) {
      return true;
    }
  }
  return false;
}

function getFilteredParticipantsFromText(rawText, removeDuplicates, requireMention) {
  const rawLines = String(rawText || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let parsedList = rawLines.map(parseParticipantLine);

  if (requireMention) {
    parsedList = parsedList.filter(hasValidFriendMention);
  }

  if (removeDuplicates) {
    const seenUsers = new Set();
    const deduped = [];

    for (const item of parsedList) {
      const userKey = item.author.replace(/^@/, '').toLowerCase();
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
  return getFilteredParticipantsFromText(
    namesInput.value,
    optRemoveDuplicates.checked,
    optRequireMention.checked
  );
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
}

namesInput.addEventListener('input', updateSheetCount);
optRemoveDuplicates.addEventListener('change', updateSheetCount);
optRequireMention.addEventListener('change', updateSheetCount);

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
function executeParticipantsDraw({ rawText, removeDuplicates, requireMention, winnersCount, substitutesCount }) {
  const { rawCount, validItems } = getFilteredParticipantsFromText(rawText, removeDuplicates, requireMention);

  if (rawCount === 0) {
    alert('Por favor, importe uma planilha ou cole os participantes na lista!');
    return;
  }

  if (validItems.length === 0) {
    alert('Nenhum participante atendeu à regra "Exigir marcação de amigo com @"! Verifique se os comentários incluem o texto com @amigo.');
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

      showResults(winners, substitutes);
    }
  );
}

btnDrawSheet.addEventListener('click', () => {
  executeParticipantsDraw({
    rawText: namesInput.value,
    removeDuplicates: optRemoveDuplicates.checked,
    requireMention: optRequireMention.checked,
    winnersCount: parseInt(sheetWinnersCountInput.value, 10),
    substitutesCount: parseInt(sheetSubstitutesCountInput.value, 10)
  });
});

// ==========================================
// ABA 3: SORTEIO DE NÚMEROS
// ==========================================
btnDrawNumbers.addEventListener('click', () => {
  const min = parseInt(document.getElementById('num-min').value, 10);
  const max = parseInt(document.getElementById('num-max').value, 10);
  const qty = parseInt(document.getElementById('num-qty').value, 10);
  const allowRepeated = document.getElementById('opt-allow-repeated-numbers').checked;

  if (isNaN(min) || isNaN(max) || min >= max) {
    alert('O número mínimo deve ser menor que o número máximo!');
    return;
  }

  if (isNaN(qty) || qty < 1 || qty > 500) {
    alert('Informe uma quantidade válida de números para sortear (entre 1 e 500).');
    return;
  }

  const range = max - min + 1;
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
      showResults(winners, []);
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
    clearInterval(activeDrawTimer);
    activeDrawTimer = null;
  }

  tabContents.forEach(c => c.classList.remove('active'));
  document.querySelector('.tabs-container').classList.add('hidden');
  giveawayMetaBox.classList.add('hidden');
  resultBox.classList.add('hidden');
  animationBox.classList.remove('hidden');

  const customTitle = giveawayTitleInput.value.trim();
  animationTitle.textContent = customTitle
    ? `Sorteando: ${customTitle}...`
    : 'Sorteando os vencedores...';

  loadingProgress.style.transition = 'none';
  loadingProgress.style.width = '0%';
  void loadingProgress.offsetWidth;
  loadingProgress.style.transition = 'width 2.5s ease-out';
  loadingProgress.style.width = '100%';

  const duration = 2500;
  const intervalTime = 65;
  const startTime = Date.now();

  rouletteDisplay.textContent = truncateRouletteText(getSampleItem());

  activeDrawTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    rouletteDisplay.textContent = truncateRouletteText(getSampleItem());
    playTickSound();

    if (elapsed >= duration) {
      clearInterval(activeDrawTimer);
      activeDrawTimer = null;
      animationBox.classList.add('hidden');
      onFinish();
    }
  }, intervalTime);
}

// ==========================================
// DETALHES DO GANHADOR & AVATAR PROXY
// ==========================================
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
// RESULTADOS & COMEMORAÇÃO
// ==========================================
function renderWinnersDomList() {
  winnersList.innerHTML = '';
  currentWinners.forEach((winner, index) => {
    const details = resolveWinnerDetails(winner, index);
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

    const sparkleSpan = document.createElement('span');
    sparkleSpan.textContent = '✨';
    item.appendChild(sparkleSpan);

    winnersList.appendChild(item);
  });
}

function showResults(winners, substitutes) {
  currentWinners = [...winners];
  currentSubstitutes = [...(substitutes || [])];
  customWinnerPhotos.clear();

  const now = new Date();
  currentDrawDateStr = now.toLocaleString('pt-BR');

  resultBox.classList.remove('hidden');
  resultGiveawayBadge.textContent = getActiveGiveawayTitle();
  resultTitleEditInput.value = giveawayTitleInput.value.trim();
  resultTimestamp.textContent = `Realizado em: ${currentDrawDateStr}`;

  renderWinnersDomList();

  if (currentSubstitutes.length > 0) {
    substitutesSection.classList.remove('hidden');
    substitutesList.innerHTML = '';
    currentSubstitutes.forEach((sub, index) => {
      const item = document.createElement('div');
      item.className = 'sub-winner-item';
      item.innerHTML = `
        <span class="sub-rank">🛡️ Substituto #${index + 1}:</span>
        <span class="sub-name">${escapeHtml(String(sub))}</span>
      `;
      substitutesList.appendChild(item);
    });
  } else {
    substitutesSection.classList.add('hidden');
  }

  // Configura seletor de ganhador para a arte caso haja múltiplos titulares
  cardWinnerSelect.innerHTML = '';
  currentWinners.forEach((w, idx) => {
    const details = resolveWinnerDetails(w, idx);
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = `${idx + 1}º Lugar — ${details.author}`;
    cardWinnerSelect.appendChild(opt);
  });

  if (currentWinners.length > 1) {
    cardWinnerSelectorWrap.classList.remove('hidden');
  } else {
    cardWinnerSelectorWrap.classList.add('hidden');
  }

  renderWinnerCardCanvas();
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
    // Se uma única palavra for maior que a largura máxima, quebra com segurança
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
    // Evita o centro onde fica a foto e o texto principal
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

function paintWinnerTemplateFrame(details, rankIndex, avatarImg, isLoadingAvatar) {
  if (!winnerPostCanvas) return;
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

  // 1. Fundo luxuoso em gradiente escuro
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#090d1e');
  bgGrad.addColorStop(0.45, '#19133f');
  bgGrad.addColorStop(0.8, '#2b0f3a');
  bgGrad.addColorStop(1, '#090d1c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Luzes radiais de ambientação
  const topGlow = ctx.createRadialGradient(200, 160, 20, 200, 160, 560);
  topGlow.addColorStop(0, 'rgba(99, 102, 241, 0.34)');
  topGlow.addColorStop(1, 'rgba(99, 102, 241, 0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  const bottomGlow = ctx.createRadialGradient(W - 180, H - 200, 20, W - 180, H - 200, 600);
  bottomGlow.addColorStop(0, 'rgba(236, 72, 153, 0.30)');
  bottomGlow.addColorStop(1, 'rgba(236, 72, 153, 0)');
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, 0, W, H);

  const avatarCy = isStories ? 720 : 440;
  const avatarR = isStories ? 195 : 138;

  const centerGoldGlow = ctx.createRadialGradient(W / 2, avatarCy, avatarR * 0.4, W / 2, avatarCy, avatarR * 2.2);
  centerGoldGlow.addColorStop(0, 'rgba(251, 191, 36, 0.25)');
  centerGoldGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = centerGoldGlow;
  ctx.fillRect(0, 0, W, H);

  // Confetes decorativos nas bordas
  drawDecorativeConfetti(ctx, W, H, `${details.author}-${rankIndex}`);

  // Moldura interna elegante
  const frameInset = isStories ? 36 : 28;
  ctx.save();
  drawRoundedRect(ctx, frameInset, frameInset, W - frameInset * 2, H - frameInset * 2, 34);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.11)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 2. Selo superior: RESULTADO OFICIAL
  const headerPillY = isStories ? 155 : 58;
  const headerPillH = isStories ? 58 : 50;
  const headerPillText = '🎉 RESULTADO OFICIAL 🎉';
  ctx.font = `800 ${isStories ? 25 : 22}px ${fontStack}`;
  const headerPillW = Math.max(390, ctx.measureText(headerPillText).width + 68);
  const headerPillX = (W - headerPillW) / 2;

  ctx.save();
  drawRoundedRect(ctx, headerPillX, headerPillY, headerPillW, headerPillH, headerPillH / 2);
  const pillFill = ctx.createLinearGradient(headerPillX, headerPillY, headerPillX + headerPillW, headerPillY);
  pillFill.addColorStop(0, 'rgba(251, 191, 36, 0.20)');
  pillFill.addColorStop(1, 'rgba(236, 72, 153, 0.22)');
  ctx.fillStyle = pillFill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#fde68a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(headerPillText, W / 2, headerPillY + headerPillH / 2 + 1);
  ctx.restore();

  // 3. Nome / Identificação do Sorteio
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

  // 4. Foto Circular do Ganhador com Anel Dourado/Rosa
  const avatarCx = W / 2;
  ctx.save();
  // Anel externo metálico
  const ringGrad = ctx.createLinearGradient(
    avatarCx - avatarR,
    avatarCy - avatarR,
    avatarCx + avatarR,
    avatarCy + avatarR
  );
  ringGrad.addColorStop(0, '#fde68a');
  ringGrad.addColorStop(0.5, '#f59e0b');
  ringGrad.addColorStop(1, '#ec4899');

  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR + 11, 0, Math.PI * 2);
  ctx.fillStyle = ringGrad;
  ctx.shadowColor = 'rgba(245, 158, 11, 0.45)';
  ctx.shadowBlur = 32;
  ctx.fill();
  ctx.restore();

  // Borda interna escura
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR + 3, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  // Recorte circular da foto
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
    avatarFallbackGrad.addColorStop(0, '#4f46e5');
    avatarFallbackGrad.addColorStop(0.55, '#db2777');
    avatarFallbackGrad.addColorStop(1, '#d97706');
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
      ctx.fillStyle = '#fde68a';
      ctx.font = `700 ${isStories ? 22 : 18}px ${fontStack}`;
      ctx.fillText('Carregando foto...', avatarCx, avatarCy + avatarR * 0.68);
    }
  }
  ctx.restore();

  // 5. Faixa / Badge de Classificação na base da foto
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
  rankGrad.addColorStop(0, '#f59e0b');
  rankGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = rankGrad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 14;
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rankBadgeText, W / 2, rankPillY + rankPillH / 2 + 1);
  ctx.restore();

  // 6. Nome / @usuario do Ganhador + Nome Completo opcional
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
  ctx.shadowColor = 'rgba(99, 102, 241, 0.4)';
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
    ctx.fillStyle = '#fde68a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (fullNameLines[0]) {
      ctx.fillText(fullNameLines[0], W / 2, isStories ? 1106 : 714);
    }
    ctx.restore();
  }

  // 7. Caixa do Comentário Sorteado (ou mensagem de parabéns)
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
    ctx.fillStyle = '#fde68a';
    ctx.fillText('✨ PARABÉNS PELA CONQUISTA! ✨', W / 2, cardY + cardH * 0.38);

    ctx.font = `500 ${isStories ? 26 : 21}px ${fontStack}`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('Sorteio realizado com transparência e imparcialidade.', W / 2, cardY + cardH * 0.68);
  }
  ctx.restore();

  // 8. Rodapé de Auditoria e Data/Hora
  const footerDate = currentDrawDateStr || new Date().toLocaleString('pt-BR');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (isStories) {
    ctx.font = `600 26px ${fontStack}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`✅ Sorteio Auditado • ${footerDate}`, W / 2, 1690);

    ctx.font = `800 30px ${fontStack}`;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('🎲 SorteadorPro', W / 2, 1750);
  } else {
    ctx.font = `600 22px ${fontStack}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`✅ Sorteio Auditado • ${footerDate} • 🎲 SorteadorPro`, W / 2, 995);
  }
  ctx.restore();
}

async function renderWinnerCardCanvas() {
  if (!currentWinners || currentWinners.length === 0) return;

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

  // Renderiza o template imediatamente enquanto baixa a foto sem bloquear a interface
  paintWinnerTemplateFrame(details, selectedIdx, null, true);

  const loadedImg = await loadSafeAvatarImage(details.avatarUrl);
  if (seq !== renderSequenceId) return;
  paintWinnerTemplateFrame(details, selectedIdx, loadedImg, false);
}

// Alternar formato Feed (1:1) vs Stories (9:16)
formatBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    formatBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPostFormat = btn.dataset.format === 'stories' ? 'stories' : 'feed';
    renderWinnerCardCanvas();
  });
});

cardWinnerSelect.addEventListener('change', () => {
  renderWinnerCardCanvas();
});

// Enviar / Trocar Foto Manualmente
btnUploadPhoto.addEventListener('click', () => {
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
  if (!currentWinners || currentWinners.length === 0) return;

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
    alert('Não foi possível exportar a imagem automaticamente. Tente enviar a foto manualmente no botão "Enviar / Trocar Foto".');
  }
});

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
  let text = `🎉 RESULTADO OFICIAL — ${giveawayTitle} 🎉\n${dateStr}\n\n`;

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

  text += `\nSorteio auditado e realizado pelo SorteadorPro!`;

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
  resetView();
});

function resetView() {
  if (activeDrawTimer) {
    clearInterval(activeDrawTimer);
    activeDrawTimer = null;
  }
  animationBox.classList.add('hidden');
  resultBox.classList.add('hidden');
  document.querySelector('.tabs-container').classList.remove('hidden');
  giveawayMetaBox.classList.remove('hidden');

  const activeTabBtn = document.querySelector('.tab-btn.active');
  if (activeTabBtn) {
    document.getElementById(activeTabBtn.dataset.tab).classList.add('active');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
