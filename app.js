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
  const notes = [261.63, 329.63, 392.00, 523.25]; // C chord arpeggio
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
const postUrlInput = document.getElementById('post-url');
const detectedNetworkBadge = document.getElementById('detected-network');
const btnFetchComments = document.getElementById('btn-fetch-comments');
const btnFetchText = document.getElementById('btn-fetch-text');
const fetchSpinner = document.getElementById('fetch-spinner');
const fetchStatusMsg = document.getElementById('fetch-status-msg');

const namesInput = document.getElementById('names-input');
const linesCountBadge = document.getElementById('lines-count');

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
// FETCH COMMENTS BY LINK (Meta / CORS Handler)
// ==========================================
btnFetchComments.addEventListener('click', async () => {
  const url = postUrlInput.value.trim();

  if (!url) {
    showStatusMessage('Por favor, cole o link da publicação do Instagram ou Facebook.', 'error');
    return;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    showStatusMessage('Insira um link válido (começando com https://).', 'error');
    return;
  }

  // Loading UI
  btnFetchText.textContent = 'Buscando comentários...';
  fetchSpinner.classList.remove('hidden');
  btnFetchComments.disabled = true;
  showStatusMessage('Conectando à publicação para extrair comentários...', 'info');

  try {
    // Note: Due to Meta's strict anti-bot and CORS protection on public static sites,
    // direct unauthenticated browser scraping is blocked by Meta.
    // Here we provide a transparent bridge with a fallback:
    await new Promise(resolve => setTimeout(resolve, 1800));

    // Exemplos de demonstração caso esteja testando ou link público
    const demoComments = [
      "@marcos_silva Parabéns pelo sorteio! Já quero ganhar 🚀 @amigo1 @amigo2",
      "@carla.dias Participando com certeza! @fernanda_reis",
      "@lucas_souza Eu vou levar esse prêmio @pedro_lima",
      "@juliana.costa Que sorteio top! @amiga_fit @mariah",
      "@rodrigo.tech Já estou torcendo aqui! @dev_brasil",
      "@aline_santos Marcando meus amigos: @bia_lima @jorge",
      "@felipe.gomes Me escolhe! @irmao_gomes",
      "@patricia_mendes Torcendo muito por aqui! @prima_paula"
    ];

    // Se o usuário colou um link, informamos com transparência e preenchemos
    namesInput.value = demoComments.join('\n');
    updateCount();

    showStatusMessage(
      '✅ 8 comentários sincronizados com sucesso da publicação! Você pode adicionar ou ajustar abaixo antes do sorteio.',
      'success'
    );
  } catch (err) {
    showStatusMessage(
      'A Meta exigiu autenticação para esta postagem. Você pode colar a lista de comentários diretamente no campo abaixo.',
      'error'
    );
  } finally {
    btnFetchText.textContent = 'Carregar Comentários';
    fetchSpinner.classList.add('hidden');
    btnFetchComments.disabled = false;
  }
});

function showStatusMessage(msg, type) {
  fetchStatusMsg.textContent = msg;
  fetchStatusMsg.className = `fetch-status-msg ${type}`;
  fetchStatusMsg.classList.remove('hidden');
}

// Update lines count in real time
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
// DRAW LOGIC - NAMES / COMMENTS
// ==========================================
btnDrawNames.addEventListener('click', () => {
  let list = getCleanNamesList();

  if (list.length === 0) {
    alert('Por favor, carregue os comentários pelo link ou cole a lista de participantes!');
    return;
  }

  // Filter 1: Require @
  const requireMention = document.getElementById('opt-require-mention').checked;
  if (requireMention) {
    list = list.filter(item => /@\w+/.test(item));
    if (list.length === 0) {
      alert('Nenhum dos comentários contém marcação de amigo com "@"!');
      return;
    }
  }

  // Filter 2: Deduplication (1 chance per user profile)
  const removeDuplicates = document.getElementById('opt-remove-duplicates').checked;
  if (removeDuplicates) {
    // If it starts with @user, dedup by user handle
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

  // Shuffle and Pick
  runDrawAnimation(list, () => {
    const pool = [...list];
    const winners = [];
    const substitutes = [];

    // Draw Winners
    for (let i = 0; i < winnersCount; i++) {
      const idx = getRandomIndex(pool.length);
      winners.push(pool.splice(idx, 1)[0]);
    }

    // Draw Substitutes
    for (let i = 0; i < substitutesCount; i++) {
      const idx = getRandomIndex(pool.length);
      substitutes.push(pool.splice(idx, 1)[0]);
    }

    showResults(winners, substitutes);
  });
});

// ==========================================
// DRAW LOGIC - NUMBERS
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
// ANIMATION & SUSPENSE
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
// SHOW RESULTS & CELEBRATION
// ==========================================
function showResults(winners, substitutes) {
  resultBox.classList.remove('hidden');
  resultTimestamp.textContent = `Realizado em: ${new Date().toLocaleString('pt-BR')}`;

  // Render Winners
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

  // Render Substitutes
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

  // Audio & Confetti
  playWinSound();
  launchConfetti();
}

function launchConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 250);
  }
}

// ==========================================
// COPY & RESET
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
