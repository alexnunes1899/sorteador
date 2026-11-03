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
  // Fallback for huge ranges (> 4 billion) using 53-bit float from crypto
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

// Link & API Elements
const postUrlInput = document.getElementById('post-url');
const detectedNetworkBadge = document.getElementById('detected-network');
const btnFetchComments = document.getElementById('btn-fetch-comments');
const btnFetchText = document.getElementById('btn-fetch-text');
const fetchSpinner = document.getElementById('fetch-spinner');
const fetchStatusMsg = document.getElementById('fetch-status-msg');
const btnOpenApiModal = document.getElementById('btn-open-api-modal');
const apiModal = document.getElementById('api-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnSaveApiKey = document.getElementById('btn-save-api-key');
const rapidApiKeyInput = document.getElementById('rapidapi-key');

// File Import Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const triggerFileSelect = document.getElementById('trigger-file-select');

// Names, Filters & Results
const namesInput = document.getElementById('names-input');
const linesCountBadge = document.getElementById('lines-count');
const btnClearNames = document.getElementById('btn-clear-names');
const optRemoveDuplicates = document.getElementById('opt-remove-duplicates');
const optRequireMention = document.getElementById('opt-require-mention');

const btnDrawNames = document.getElementById('btn-draw-names');
const btnDrawNumbers = document.getElementById('btn-draw-numbers');
const animationBox = document.getElementById('animation-box');
const rouletteDisplay = document.getElementById('roulette-display');
const loadingProgress = document.querySelector('.loading-bar .progress');
const resultBox = document.getElementById('result-box');
const winnersList = document.getElementById('winners-list');
const substitutesSection = document.getElementById('substitutes-section');
const substitutesList = document.getElementById('substitutes-list');
const resultTimestamp = document.getElementById('result-timestamp');
const btnCopyResult = document.getElementById('btn-copy-result');
const btnNewDraw = document.getElementById('btn-new-draw');

let activeDrawTimer = null;
let copyFeedbackTimeout = null;
const COPY_BTN_DEFAULT_TEXT = '📋 Copiar Resultado Formatado';

// Initialize API Key from LocalStorage
function syncApiButtonState() {
  let savedKey = '';
  try {
    savedKey = localStorage.getItem('sorteador_rapidapi_key') || '';
  } catch (e) {
    savedKey = '';
  }
  if (rapidApiKeyInput) rapidApiKeyInput.value = savedKey;
  if (btnOpenApiModal) {
    if (savedKey) {
      btnOpenApiModal.textContent = '⚙️ API ✓';
      btnOpenApiModal.classList.add('configured');
    } else {
      btnOpenApiModal.textContent = '⚙️ API';
      btnOpenApiModal.classList.remove('configured');
    }
  }
}
syncApiButtonState();

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

// Detect Social Network from Link
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

// ==========================================
// API MODAL CONTROLS
// ==========================================
btnOpenApiModal.addEventListener('click', () => {
  apiModal.classList.remove('hidden');
  rapidApiKeyInput.focus();
});

btnCloseModal.addEventListener('click', () => apiModal.classList.add('hidden'));

apiModal.addEventListener('click', (e) => {
  if (e.target === apiModal) apiModal.classList.add('hidden');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !apiModal.classList.contains('hidden')) {
    apiModal.classList.add('hidden');
  }
});

btnSaveApiKey.addEventListener('click', () => {
  const key = rapidApiKeyInput.value.trim();
  try {
    localStorage.setItem('sorteador_rapidapi_key', key);
  } catch (e) {
    // Ignore storage quota / private mode errors
  }
  syncApiButtonState();
  apiModal.classList.add('hidden');
  if (key) {
    showStatusMessage('✅ Chave da API salva com sucesso! Cole um link do Instagram e clique em "Carregar pelo Link".', 'success');
  } else {
    showStatusMessage('Chave da API removida. Usando modo gratuito de importação por arquivo.', 'info');
  }
});

// ==========================================
// MÉTODO 1: BUSCAR COMENTÁRIOS PELO LINK
// ==========================================
function extractInstagramShortcode(url) {
  const match = url.match(/(?:instagram\.com|instagr\.am)\/(?:[^/?#]+\/)?(?:p|reels?|tv)\/([A-Za-z0-9_-]+)/i);
  return match ? match[1] : '';
}

btnFetchComments.addEventListener('click', async () => {
  const url = postUrlInput.value.trim();

  if (!url) {
    showStatusMessage('Por favor, cole o link da publicação do Instagram ou Facebook.', 'error');
    return;
  }

  if (!/^https?:\/\//i.test(url)) {
    showStatusMessage('Insira um link completo começando com https://', 'error');
    return;
  }

  const lowerUrl = url.toLowerCase();
  const isFacebook = lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.com');

  let apiKey = '';
  try {
    apiKey = localStorage.getItem('sorteador_rapidapi_key') || '';
  } catch (e) {
    apiKey = '';
  }

  if (isFacebook) {
    showStatusMessage(
      '📘 Para publicações do Facebook, a Meta restringe acesso externo por link. Exporte os comentários em .csv/.txt e arraste no Método 2 abaixo, ou cole diretamente na lista!',
      'info'
    );
    return;
  }

  if (!apiKey) {
    showStatusMessage(
      '💡 A Meta bloqueia leitura direta sem autenticação. Clique em "⚙️ API" acima para conectar uma chave gratuita da RapidAPI, OU use o Método 2 abaixo arrastando seu arquivo (.csv, .txt, .json)!',
      'info'
    );
    return;
  }

  btnFetchText.textContent = 'Buscando...';
  fetchSpinner.classList.remove('hidden');
  btnFetchComments.disabled = true;
  showStatusMessage('Consultando comentários do Instagram via API...', 'info');

  try {
    const shortcode = extractInstagramShortcode(url);
    const queryTarget = shortcode || url;
    let allComments = [];
    let paginationToken = null;
    const maxPages = 5;

    for (let page = 0; page < maxPages; page++) {
      let endpoint = `https://instagram-scraper-api2.p.rapidapi.com/v1/comments?code_or_id_or_url=${encodeURIComponent(queryTarget)}`;
      if (paginationToken) {
        endpoint += `&pagination_token=${encodeURIComponent(paginationToken)}`;
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
        }
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('Chave RapidAPI inválida ou não inscrita no serviço "Instagram Scraper API2".');
      }
      if (response.status === 429) {
        throw new Error('Limite de requisições da sua conta RapidAPI foi atingido.');
      }
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status} ao consultar a API.`);
      }

      const data = await response.json();
      const pageItems = data?.data?.items || data?.items || data?.comments || [];

      if (Array.isArray(pageItems) && pageItems.length > 0) {
        allComments.push(...pageItems);
        showStatusMessage(`Buscando comentários... (${allComments.length} carregados)`, 'info');
      }

      paginationToken = data?.pagination_token || data?.data?.pagination_token || null;
      if (!paginationToken || pageItems.length === 0) break;
    }

    if (allComments.length > 0) {
      const parsed = allComments
        .map(c => formatParticipantRecord(
          c.user?.username || c.owner?.username || c.username || '',
          c.text || c.comment || ''
        ))
        .filter(Boolean);

      namesInput.value = parsed.join('\n');
      updateCount();
      showStatusMessage(`✅ ${parsed.length} comentários reais importados com sucesso pelo link!`, 'success');
    } else {
      throw new Error('Nenhum comentário encontrado ou a publicação é privada.');
    }
  } catch (err) {
    showStatusMessage(`⚠️ ${err.message} Você pode usar o Método 2 (Importar Arquivo) abaixo sem limites.`, 'error');
  } finally {
    btnFetchText.textContent = 'Carregar pelo Link';
    fetchSpinner.classList.add('hidden');
    btnFetchComments.disabled = false;
  }
});

function showStatusMessage(msg, type) {
  fetchStatusMsg.textContent = msg;
  fetchStatusMsg.className = `fetch-status-msg ${type}`;
  fetchStatusMsg.classList.remove('hidden');
}

// ==========================================
// MÉTODO 2: IMPORTADOR MULTI-FORMATO (.CSV, .TSV, .JSON, .TXT)
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
    // Reset input so selecting the exact same file again triggers 'change'
    fileInput.value = '';
  }
});

function decodeFileBuffer(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch (e) {
    // Fallback for Brazilian Excel ANSI / Windows-1252 CSV files
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

function handleFileUpload(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = decodeFileBuffer(e.target.result);
    parseAndLoadFile(content, file.name);
  };
  reader.onerror = () => {
    showStatusMessage('Erro ao ler o arquivo selecionado.', 'error');
  };
  reader.readAsArrayBuffer(file);
}

function formatParticipantRecord(rawUser, rawComment) {
  const cleanUser = String(rawUser || '').replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim();
  const cleanComment = String(rawComment || '').replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!cleanUser && !cleanComment) return '';
  if (!cleanUser) return cleanComment;

  // Format Instagram-style handles with '@' if single token without spaces
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
    'from', 'user', 'nome', 'name', 'perfil', 'profile_name'
  ];
  const exactCommentNames = [
    'text', 'comment', 'comment_text', 'commenttext', 'comentario',
    'message', 'mensagem', 'body', 'conteudo', 'content'
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
      (h.includes('username') || h.includes('usuario') || h.includes('autor') || h.includes('author') || h.includes('nome')) &&
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

  const hasRecognizedHeader = userColIdx !== -1 || commentColIdx !== -1;
  return { userColIdx, commentColIdx, hasRecognizedHeader };
}

function detectDelimiter(content, fileName) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.tsv')) return '\t';

  // Inspect first line outside quotes
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

// Full RFC-4180 CSV/TSV parser supporting commas & newlines inside quotes
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
        return formatParticipantRecord(user, comment);
      }
      return '';
    })
    .filter(Boolean);
}

function parseAndLoadFile(rawContent, fileName) {
  const content = String(rawContent || '').replace(/^\uFEFF/, '').trim();
  if (!content) {
    showStatusMessage('O arquivo selecionado está vazio!', 'error');
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
        updateCount();
        showStatusMessage(`📁 Arquivo JSON "${fileName}" importado com sucesso! ${parsedComments.length} comentário(s) carregado(s).`, 'success');
        return;
      }
    } catch (err) {
      if (lowerName.endsWith('.json')) {
        showStatusMessage(`Erro ao interpretar o arquivo JSON "${fileName}". Verifique se o formato é válido.`, 'error');
        return;
      }
    }
  }

  // 2. CSV / TSV Format
  const delimiter = detectDelimiter(content, fileName);
  const isTabularFile = lowerName.endsWith('.csv') || lowerName.endsWith('.tsv');

  if (delimiter && (isTabularFile || content.split(/\r?\n/)[0].includes(delimiter))) {
    const rows = parseDelimitedRows(content, delimiter);
    if (rows.length > 0) {
      let { userColIdx, commentColIdx, hasRecognizedHeader } = detectCsvColumns(rows[0]);
      const startIndex = hasRecognizedHeader ? 1 : 0;

      // Fallback when CSV has no header row (e.g., "usuario","comentario")
      if (!hasRecognizedHeader) {
        userColIdx = 0;
        commentColIdx = rows[0].length > 1 ? 1 : -1;
      } else if (userColIdx === -1 && commentColIdx !== 0) {
        userColIdx = 0;
      }

      for (let i = startIndex; i < rows.length; i++) {
        const parts = rows[i];
        const user = userColIdx !== -1 && userColIdx < parts.length ? parts[userColIdx] : '';
        const comm = commentColIdx !== -1 && commentColIdx < parts.length && commentColIdx !== userColIdx
          ? parts[commentColIdx]
          : '';
        const formatted = formatParticipantRecord(user, comm);
        if (formatted) parsedComments.push(formatted);
      }
    }
  } else {
    // 3. Plain Text (.txt): 1 participant / comment per line
    parsedComments = content
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
  }

  if (parsedComments.length > 0) {
    namesInput.value = parsedComments.join('\n');
    updateCount();
    showStatusMessage(`📁 Arquivo "${fileName}" carregado com sucesso! ${parsedComments.length} linha(s) importada(s).`, 'success');
  } else {
    showStatusMessage(`Nenhum participante válido encontrado no arquivo "${fileName}".`, 'error');
  }
}

// ==========================================
// PARTICIPANT PARSING & FILTER ENGINE
// ==========================================
function getRawNamesList() {
  const rawText = namesInput.value;
  if (!rawText.trim()) return [];
  return rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

function parseParticipantLine(rawLine) {
  const line = rawLine.trim();

  // Case 1: "@username - comment" or "Maria-Clara ✨ - comment" (explicit space + dash/pipe + space)
  const spacedSepMatch = line.match(/^(.{1,80}?)\s+[-–—|]\s+(.+)$/);
  if (spacedSepMatch) {
    return {
      raw: line,
      author: spacedSepMatch[1].trim(),
      comment: spacedSepMatch[2].trim(),
      hasCommentBody: true
    };
  }

  // Case 2: "@username: comment" or "Nome: comment" (avoiding URLs like https://)
  const colonMatch = line.match(/^(@?[a-zA-Z0-9_.À-ÿ' -]{1,60}):\s+(.+)$/);
  if (colonMatch && !/^https?$/i.test(colonMatch[1].trim())) {
    return {
      raw: line,
      author: colonMatch[1].trim(),
      comment: colonMatch[2].trim(),
      hasCommentBody: true
    };
  }

  // Case 3: "@username-comment" (tight dash right after @handle)
  const tightDashMatch = line.match(/^(@[a-zA-Z0-9_.]+)\s*[-–—|]\s*(.+)$/);
  if (tightDashMatch) {
    return {
      raw: line,
      author: tightDashMatch[1].trim(),
      comment: tightDashMatch[2].trim(),
      hasCommentBody: true
    };
  }

  // Case 4: "@username comment text" (handle followed by space and comment)
  const handleSpaceMatch = line.match(/^(@[a-zA-Z0-9_.]+)\s+(.+)$/);
  if (handleSpaceMatch) {
    return {
      raw: line,
      author: handleSpaceMatch[1].trim(),
      comment: handleSpaceMatch[2].trim(),
      hasCommentBody: true
    };
  }

  // Case 5: Standalone name or "@username" without comment text
  return {
    raw: line,
    author: line,
    comment: '',
    hasCommentBody: false
  };
}

function hasValidFriendMention(parsed) {
  // Must mention at least one @friend inside the comment body (not the author's own handle or email)
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

function getFilteredParticipants() {
  const rawLines = getRawNamesList();
  let parsedList = rawLines.map(parseParticipantLine);

  // Filter 1: Require friend @mention in comment body
  if (optRequireMention.checked) {
    parsedList = parsedList.filter(hasValidFriendMention);
  }

  // Filter 2: Deduplicate by profile/author (1 chance per profile)
  if (optRemoveDuplicates.checked) {
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

function updateCount() {
  const { rawCount, validItems } = getFilteredParticipants();
  if (rawCount === 0) {
    linesCountBadge.textContent = '0 participantes';
  } else if (validItems.length === rawCount) {
    linesCountBadge.textContent = `${validItems.length} participante(s)`;
  } else {
    linesCountBadge.textContent = `${validItems.length} válido(s) (de ${rawCount})`;
  }
}

namesInput.addEventListener('input', updateCount);
optRemoveDuplicates.addEventListener('change', updateCount);
optRequireMention.addEventListener('change', updateCount);

// Botão Limpar
btnClearNames.addEventListener('click', () => {
  if (namesInput.value.trim() && confirm('Deseja limpar todos os participantes da lista?')) {
    namesInput.value = '';
    updateCount();
    fetchStatusMsg.classList.add('hidden');
  }
});

// ==========================================
// SORTEIO: NOMES / COMENTÁRIOS
// ==========================================
btnDrawNames.addEventListener('click', () => {
  const { rawCount, validItems } = getFilteredParticipants();

  if (rawCount === 0) {
    alert('Por favor, carregue os comentários pelo link, importe um arquivo ou cole os participantes!');
    return;
  }

  if (validItems.length === 0) {
    alert('Nenhum participante atendeu à regra "Exigir marcação de amigo com @"! Verifique se os comentários incluem o texto com @amigo.');
    return;
  }

  const winnersCount = parseInt(document.getElementById('winners-count').value, 10);
  const substitutesCount = parseInt(document.getElementById('substitutes-count').value, 10);

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
});

// ==========================================
// SORTEIO: NÚMEROS (O(qty) Memory-Safe)
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
  resultBox.classList.add('hidden');
  animationBox.classList.remove('hidden');

  // Force clean CSS transition reset from 0% to 100% on repeat draws
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
// RESULTADOS & COMEMORAÇÃO
// ==========================================
function showResults(winners, substitutes) {
  resultBox.classList.remove('hidden');
  resultTimestamp.textContent = `Realizado em: ${new Date().toLocaleString('pt-BR')}`;

  winnersList.innerHTML = '';
  winners.forEach((winner, index) => {
    const item = document.createElement('div');
    item.className = 'winner-item';
    item.innerHTML = `
      <span class="winner-rank">🏆 ${index + 1}º Ganhador</span>
      <span class="winner-name">${escapeHtml(String(winner))}</span>
      <span>✨</span>
    `;
    winnersList.appendChild(item);
  });

  if (substitutes && substitutes.length > 0) {
    substitutesSection.classList.remove('hidden');
    substitutesList.innerHTML = '';
    substitutes.forEach((sub, index) => {
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
  const dateStr = resultTimestamp.textContent;
  let text = `🎉 RESULTADO OFICIAL DO SORTEIO 🎉\n${dateStr}\n\n`;

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
