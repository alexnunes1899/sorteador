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

// Update lines count in real time
namesInput.addEventListener('input', () => {
  const lines = getCleanNamesList();
  linesCountBadge.textContent = `${lines.length} participante(s)`;
});

function getCleanNamesList() {
  const rawText = namesInput.value;
  if (!rawText.trim()) return [];
  return rawText
    .split(/\r?\n|,/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

// ==========================================
// DRAW LOGIC - NAMES / COMMENTS
// ==========================================
btnDrawNames.addEventListener('click', () => {
  let list = getCleanNamesList();

  if (list.length === 0) {
    alert('Por favor, insira ao menos um participante ou comentário!');
    return;
  }

  // Filter 1: Require @
  const requireMention = document.getElementById('opt-require-mention').checked;
  if (requireMention) {
    list = list.filter(item => /@\w+/.test(item));
    if (list.length === 0) {
      alert('Nenhum participante marcou um amigo com @!');
      return;
    }
  }

  // Filter 2: Deduplication
  const removeDuplicates = document.getElementById('opt-remove-duplicates').checked;
  if (removeDuplicates) {
    list = [...new Set(list)];
  }

  const winnersCount = parseInt(document.getElementById('winners-count').value) || 1;
  const substitutesCount = parseInt(document.getElementById('substitutes-count').value) || 0;
  const totalNeeded = winnersCount + substitutesCount;

  if (list.length < totalNeeded) {
    alert(`Você precisa de ao menos ${totalNeeded} participantes válidos para sortear ${winnersCount} vencedor(es) e ${substitutesCount} reserva(s). Temos apenas ${list.length}.`);
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
  // Hide cards
  tabContents.forEach(c => c.classList.remove('active'));
  document.querySelector('.tabs-container').classList.add('hidden');
  resultBox.classList.add('hidden');
  animationBox.classList.remove('hidden');

  loadingProgress.style.width = '0%';
  setTimeout(() => { loadingProgress.style.width = '100%'; }, 50);

  let duration = 2500;
  let intervalTime = 60;
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
      <span class="winner-rank">#${index + 1}</span>
      <span class="winner-name">${escapeHtml(String(winner))}</span>
      <span>🎉</span>
    `;
    winnersList.appendChild(item);
  });

  // Render Substitutes
  if (substitutes && substitutes.length > 0) {
    substitutesSection.classList.remove('hidden');
    substitutesList.innerHTML = '';
    substitutes.forEach((sub, index) => {
      const item = document.createElement('div');
      item.className = 'sub-item';
      item.textContent = `Reserva ${index + 1}: ${sub}`;
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
      particleCount: 80,
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
  text += `🏆 Vencedor(es):\n`;
  winnerItems.forEach((w, i) => {
    text += `${i + 1}º Lugar: ${w.textContent}\n`;
  });

  const subItems = document.querySelectorAll('.sub-item');
  if (subItems.length > 0) {
    text += `\n📋 Suplentes/Reservas:\n`;
    subItems.forEach(s => {
      text += `${s.textContent}\n`;
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
