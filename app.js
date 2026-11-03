// ==========================================
// AUDIO SYNTHESIZER (Web Audio API)
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTickSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);

  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function playWinSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const notes = [261.63, 329.63, 392.00, 523.25];
  notes.forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const startTime = audioCtx.currentTime + idx * 0.12;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.5);
  });
}

// ==========================================
// CRYPTO RANDOM UTILITY
// ==========================================
function getRandomIndex(max) {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] % max;
}

// ==========================================
// DOM ELEMENTS & TABS
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

// Names & Results
const namesInput = document.getElementById('names-input');
const linesCountBadge = document.getElementById('lines-count');
const btnClearNames = document.getElementById('btn-clear-names');

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

// Initialize API Key from LocalStorage
const savedApiKey = localStorage.getItem('sorteador_rapidapi_key') || '';
if (rapidApiKeyInput) rapidApiKeyInput.value = savedApiKey;

// Tab Switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
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

  if (url.includes('instagram.com')) {
    detectedNetworkBadge.textContent = '📸 Instagram Detectado';
    detectedNetworkBadge.classList.add('instagram');
  } else if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) {
    detectedNetworkBadge.textContent = '📘 Facebook Detectado';
    detectedNetworkBadge.classList.add('facebook');
  } else {
    detectedNetworkBadge.textContent = '🔗 Link da Web';
  }
});

// ==========================================
// API MODAL CONTROLS
// ==========================================
btnOpenApiModal.addEventListener('click', () => apiModal.classList.remove('hidden'));
btnCloseModal.addEventListener('click', () => apiModal.classList.add('hidden'));
apiModal.addEventListener('click', (e) => {
  if (e.target === apiModal) apiModal.classList.add('hidden');
});

btnSaveApiKey.addEventListener('click', () => {
  const key = rapidApiKeyInput.value.trim();
  localStorage.setItem('sorteador_rapidapi_key', key);
  apiModal.classList.add('hidden');
  if (key) {
    showStatusMessage('✅ Chave da API configurada com sucesso!', 'success');
  } else {
    showStatusMessage('Chave da API removida. Usando modo de importação por arquivo.', 'info');
  }
});

// ==========================================
// MÉTODO 1: BUSCAR COMENTÁRIOS PELO LINK
// ==========================================
btnFetchComments.addEventListener('click', async () => {
  const url = postUrlInput.value.trim();

  if (!url) {
    showStatusMessage('Por favor, cole o link da publicação do Instagram ou Facebook.', 'error');
    return;
  }

  const apiKey = localStorage.getItem('sorteador_rapidapi_key');

  btnFetchText.textContent = 'Buscando...';
  fetchSpinner.classList.remove('hidden');
  btnFetchComments.disabled = true;

  // Se o usuário configurou uma chave RapidAPI
  if (apiKey) {
    showStatusMessage('Consultando comentários via API...', 'info');
    try {
      // Extrai o shortcode do Instagram (ex: /p/C-xyz123/)
      const match = url.match(/(?:p|reel)\/([A-Za-z0-9_-]+)/);
      const shortcode = match ? match[1] : '';

      const response = await fetch(`https://instagram-scraper-api2.p.rapidapi.com/v1/comments?code_or_id_or_url=${encodeURIComponent(shortcode || url)}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
        }
      });

      const data = await response.json();
      const comments = data?.data?.items || data?.items || [];

      if (comments && comments.length > 0) {
        const parsed = comments.map(c => `@${c.user?.username || c.owner?.username || 'usuario'} - ${c.text || ''}`);
        namesInput.value = parsed.join('\n');
        updateCount();
        showStatusMessage(`✅ ${comments.length} comentários reais importados com sucesso pelo link!`, 'success');
      } else {
        throw new Error('Nenhum comentário retornado pela API ou publicação privada.');
      }
    } catch (err) {
      showStatusMessage(`Falha na API: ${err.message}. Tente usar o Método 2 (Importar Arquivo .CSV/.TXT) abaixo.`, 'error');
    } finally {
      btnFetchText.textContent = 'Carregar pelo Link';
      fetchSpinner.classList.add('hidden');
      btnFetchComments.disabled = false;
    }
  } else {
    // Sem chave de API cadastrada: orienta o usuário com transparência
    setTimeout(() => {
      btnFetchText.textContent = 'Carregar pelo Link';
      fetchSpinner.classList.add('hidden');
      btnFetchComments.disabled = false;

      showStatusMessage(
        '💡 Dica: A Meta bloqueia leitura direta sem autenticação. Para buscar pelo link, clique em "⚙️ API" e adicione uma chave gratuita da RapidAPI, OU use o Método 2 abaixo arrastando o arquivo de comentários!',
        'info'
      );
    }, 600);
  }
});

function showStatusMessage(msg, type) {
  fetchStatusMsg.textContent = msg;
  fetchStatusMsg.className = `fetch-status-msg ${type}`;
  fetchStatusMsg.classList.remove('hidden');
}

// ==========================================
// MÉTODO 2: IMPORTADOR DE ARQUIVO (.CSV, .TXT)
// ==========================================
triggerFileSelect.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});
dropZone.addEventListener('click', () => fileInput.click());

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
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files && files.length > 0) {
    handleFileUpload(files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFileUpload(e.target.files[0]);
  }
});

function handleFileUpload(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    parseAndLoadFile(content, file.name);
  };
  reader.readAsText(file);
}

function parseAndLoadFile(content, fileName) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) {
    alert('O arquivo selecionado está vazio!');
    return;
  }

  let parsedComments = [];

  // Verifica se é um CSV com cabeçalho (ex: Username, Comment, etc.)
  const firstLine = lines[0].toLowerCase();
  const isCsv = fileName.endsWith('.csv') || firstLine.includes(',') || firstLine.includes(';');
  const delimiter = firstLine.includes(';') ? ';' : ',';

  if (isCsv) {
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    let userColIdx = headers.findIndex(h => h.includes('user') || h.includes('perfil') || h.includes('autor') || h.includes('nome'));
    let commentColIdx = headers.findIndex(h => h.includes('comment') || h.includes('coment') || h.includes('text') || h.includes('mensagem'));

    // Se encontrou cabeçalho conhecido, pula a linha 1
    const startIndex = (userColIdx !== -1 || commentColIdx !== -1) ? 1 : 0;
    if (userColIdx === -1) userColIdx = 0; // fallback para primeira coluna

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length > userColIdx) {
        let user = parts[userColIdx] || '';
        if (user && !user.startsWith('@')) user = '@' + user;
        let comm = commentColIdx !== -1 && parts[commentColIdx] ? ` - ${parts[commentColIdx]}` : '';
        parsedComments.push(`${user}${comm}`);
      }
    }
  } else {
    // Arquivo de texto puro (.txt): 1 por linha
    parsedComments = lines;
  }

  if (parsedComments.length > 0) {
    namesInput.value = parsedComments.join('\n');
    updateCount();
    showStatusMessage(`📁 Arquivo "${fileName}" carregado com sucesso! ${parsedComments.length} participantes prontos.`, 'success');
  }
}

// Botão Limpar
btnClearNames.addEventListener('click', () => {
  if (namesInput.value.trim() && confirm('Deseja limpar todos os participantes da lista?')) {
    namesInput.value = '';
    updateCount();
    fetchStatusMsg.classList.add('hidden');
  }
});

// Update lines count
namesInput.addEventListener('input', updateCount);

function updateCount() {
  const lines = getCleanNamesList();
  linesCountBadge.textContent = `${lines.length} participante(s)`;
}

function getCleanNamesList() {
  const rawText = namesInput.value;
  if (!rawText.trim()) return [];
  return rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

// ==========================================
// SORTEIO: NOMES / COMENTÁRIOS
// ==========================================
btnDrawNames.addEventListener('click', () => {
  let list = getCleanNamesList();

  if (list.length === 0) {
    alert('Por favor, carregue os comentários pelo link, importe um arquivo ou cole os participantes!');
    return;
  }

  // Regra: Exigir @
  const requireMention = document.getElementById('opt-require-mention').checked;
  if (requireMention) {
    list = list.filter(item => /@\w+/.test(item));
    if (list.length === 0) {
      alert('Nenhum dos comentários contém marcação de amigo com "@"!');
      return;
    }
  }

  // Regra: Remover Duplicados (1 chance por perfil)
  const removeDuplicates = document.getElementById('opt-remove-duplicates').checked;
  if (removeDuplicates) {
    const seenUsers = new Set();
    const dedupedList = [];

    list.forEach(item => {
      const match = item.match(/^@([a-zA-Z0-9_.]+)/);
      const userKey = match ? match[1].toLowerCase() : item.toLowerCase();

      if (!seenUsers.has(userKey)) {
        seenUsers.add(userKey);
        dedupedList.push(item);
      }
    });

    list = dedupedList;
  }

  const winnersCount = parseInt(document.getElementById('winners-count').value) || 1;
  const substitutesCount = parseInt(document.getElementById('substitutes-count').value) || 0;
  const totalNeeded = winnersCount + substitutesCount;

  if (list.length < totalNeeded) {
    alert(`Você precisa de ao menos ${totalNeeded} participantes válidos para sortear ${winnersCount} titular(es) e ${substitutesCount} substituto(s). Temos ${list.length}.`);
    return;
  }

  // Animação e Sorteio
  runDrawAnimation(list, () => {
    const pool = [...list];
    const winners = [];
    const substitutes = [];

    // Ganhadores Titulares
    for (let i = 0; i < winnersCount; i++) {
      const idx = getRandomIndex(pool.length);
      winners.push(pool.splice(idx, 1)[0]);
    }

    // Ganhadores Substitutos
    for (let i = 0; i < substitutesCount; i++) {
      const idx = getRandomIndex(pool.length);
      substitutes.push(pool.splice(idx, 1)[0]);
    }

    showResults(winners, substitutes);
  });
});

// ==========================================
// SORTEIO: NÚMEROS
// ==========================================
btnDrawNumbers.addEventListener('click', () => {
  const min = parseInt(document.getElementById('num-min').value);
  const max = parseInt(document.getElementById('num-max').value);
  const qty = parseInt(document.getElementById('num-qty').value) || 1;
  const allowRepeated = document.getElementById('opt-allow-repeated-numbers').checked;

  if (isNaN(min) || isNaN(max) || min >= max) {
    alert('O número mínimo deve ser menor que o número máximo!');
    return;
  }

  const range = max - min + 1;
  if (!allowRepeated && qty > range) {
    alert(`Não é possível sortear ${qty} números únicos no intervalo de ${min} a ${max} (máximo ${range}).`);
    return;
  }

  const numbersPool = [];
  for (let n = min; n <= max; n++) numbersPool.push(n);

  runDrawAnimation(numbersPool, () => {
    const winners = [];
    if (allowRepeated) {
      for (let i = 0; i < qty; i++) {
        const num = min + getRandomIndex(range);
        winners.push(`Número ${num}`);
      }
    } else {
      const pool = [...numbersPool];
      for (let i = 0; i < qty; i++) {
        const idx = getRandomIndex(pool.length);
        winners.push(`Número ${pool.splice(idx, 1)[0]}`);
      }
    }
    showResults(winners, []);
  });
});

// ==========================================
// ANIMAÇÃO DE ROLETA
// ==========================================
function runDrawAnimation(sampleItems, onFinish) {
  tabContents.forEach(c => c.classList.remove('active'));
  document.querySelector('.tabs-container').classList.add('hidden');
  resultBox.classList.add('hidden');
  animationBox.classList.remove('hidden');

  loadingProgress.style.width = '0%';
  setTimeout(() => { loadingProgress.style.width = '100%'; }, 50);

  let duration = 2500;
  let intervalTime = 65;
  let startTime = Date.now();

  const timer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const randomSample = sampleItems[getRandomIndex(sampleItems.length)];
    rouletteDisplay.textContent = randomSample;
    playTickSound();

    if (elapsed >= duration) {
      clearInterval(timer);
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

  // Ganhadores Titulares
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

  // Ganhadores Substitutos
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

  // Som e Confetes
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

  navigator.clipboard.writeText(text).then(() => {
    const originalText = btnCopyResult.textContent;
    btnCopyResult.textContent = '✅ Copiado com Sucesso!';
    setTimeout(() => {
      btnCopyResult.textContent = originalText;
    }, 2000);
  });
});

btnNewDraw.addEventListener('click', () => {
  resetView();
});

function resetView() {
  animationBox.classList.add('hidden');
  resultBox.classList.add('hidden');
  document.querySelector('.tabs-container').classList.remove('hidden');

  const activeTabId = document.querySelector('.tab-btn.active').dataset.tab;
  document.getElementById(activeTabId).classList.add('active');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
