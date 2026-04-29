import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'PASTE_YOUR_API_KEY',
  authDomain: 'PASTE_YOUR_AUTH_DOMAIN',
  projectId: 'PASTE_YOUR_PROJECT_ID',
  storageBucket: 'PASTE_YOUR_STORAGE_BUCKET',
  messagingSenderId: 'PASTE_YOUR_MESSAGING_SENDER_ID',
  appId: 'PASTE_YOUR_APP_ID'
};

const STORAGE_KEY = 'learn-notes-leaders-v5';
const FIRESTORE_COLLECTION = 'leaders';
const SPLASH_TOTAL_MS = 6000;
const ROUND_SECONDS = 60;
const COUNTDOWN_SECONDS = 3;

const LEVELS = {
  easiest: {
    key: 'easiest',
    title: 'Первый',
    hints: true,
    poolBuilder: buildEasiestPool,
  },
  easy: {
    key: 'easy',
    title: 'Второй',
    hints: true,
    poolBuilder: buildEasyPool,
  },
  medium: {
    key: 'medium',
    title: 'Третий',
    hints: false,
    poolBuilder: buildMediumPool,
  },
  hard: {
    key: 'hard',
    title: 'Четвёртый',
    hints: false,
    poolBuilder: buildHardPool,
  },
};

const naturalMapRu = { C: 'до', D: 'ре', E: 'ми', F: 'фа', G: 'соль', A: 'ля', B: 'си' };
const octaveLabelsRu = { 2: 'большая', 3: 'малая', 4: 'первая', 5: 'вторая', 6: 'третья' };
const semitones = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
const whiteStepsOrder = ['C','D','E','F','G','A','B'];
const letterIndex = { C:0, D:1, E:2, F:3, G:4, A:5, B:6 };
const sharpableSteps = new Set(['C', 'D', 'F', 'G', 'A']);
const flattableSteps = new Set(['D', 'E', 'G', 'A', 'B']);
const clefConfig = {
  treble: { symbol: '𝄞', bottomLine: diatonicIndex('E', 4), topLine: diatonicIndex('F', 5) },
  bass:   { symbol: '𝄢', bottomLine: diatonicIndex('G', 2), topLine: diatonicIndex('A', 3) },
};

const state = {
  playerName: '',
  selectedLevel: null,
  score: 0,
  timeLeft: ROUND_SECONDS,
  currentNote: null,
  leaders: loadLocalLeaders(),
  roundTimerId: null,
  countdownId: null,
  isPlaying: false,
  firestoreReady: false,
  db: null,
  questionQueue: [],
  lastHardClef: 'bass',
};

const screens = {
  splash: document.getElementById('splashScreen'),
  home: document.getElementById('homeScreen'),
  level: document.getElementById('levelScreen'),
  game: document.getElementById('gameScreen'),
};

const els = {
  homeGrid: document.getElementById('homeGrid'),
  leadersArea: document.getElementById('leadersArea'),
  playerName: document.getElementById('playerName'),
  startBtn: document.getElementById('startBtn'),
  loadLeadersBtn: document.getElementById('loadLeadersBtn'),
  clearLocalBtn: document.getElementById('clearLocalBtn'),
  statusLine: document.getElementById('statusLine'),
  backHomeBtn: document.getElementById('backHomeBtn'),
  hudPlayer: document.getElementById('hudPlayer'),
  hudLevel: document.getElementById('hudLevel'),
  hudTime: document.getElementById('hudTime'),
  hudScore: document.getElementById('hudScore'),
  gameExitBtn: document.getElementById('gameExitBtn'),
  countdown: document.getElementById('countdown'),
  keyboard: document.getElementById('keyboard'),
  hintLine: document.getElementById('hintLine'),
  resultOverlay: document.getElementById('resultOverlay'),
  resultText: document.getElementById('resultText'),
  resultOkBtn: document.getElementById('resultOkBtn'),
  postGameOverlay: document.getElementById('postGameOverlay'),
  playAgainBtn: document.getElementById('playAgainBtn'),
  exitBtn: document.getElementById('exitBtn'),
  canvas: document.getElementById('staffCanvas'),
  leaderBodies: {
    easiest: document.getElementById('leaders-easiest'),
    easy: document.getElementById('leaders-easy'),
    medium: document.getElementById('leaders-medium'),
    hard: document.getElementById('leaders-hard'),
  }
};

const ctx = els.canvas.getContext('2d');

function diatonicIndex(step, octave) {
  return octave * 7 + letterIndex[step];
}

function switchScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[name].classList.add('active');
}

function setStatus(text = '') {
  els.statusLine.textContent = text;
}

function setLeadersVisible(visible) {
  els.leadersArea.classList.toggle('hidden', !visible);
  els.homeGrid.classList.toggle('leaders-hidden', !visible);
}

function loadLocalLeaders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalLeaders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.leaders));
}

function sortLeaders(list) {
  return [...list].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.date) - new Date(b.date);
  });
}

function renderLeaders() {
  Object.keys(els.leaderBodies).forEach(levelKey => {
    const top5 = sortLeaders(state.leaders.filter(x => x.level === levelKey)).slice(0, 5);
    const target = els.leaderBodies[levelKey];
    if (!top5.length) {
      target.innerHTML = '<tr><td colspan="4">Пока нет результатов</td></tr>';
      return;
    }
    target.innerHTML = top5.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${item.score}</td>
        <td>${formatDate(item.date)}</td>
      </tr>
    `).join('');
  });
}

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function initFirebase() {
  const ok = Object.values(firebaseConfig).every(v => v && !String(v).startsWith('PASTE_'));
  if (!ok) return;
  try {
    const app = initializeApp(firebaseConfig);
    state.db = getFirestore(app);
    state.firestoreReady = true;
  } catch (error) {
    console.error('Firebase init error:', error);
  }
}

async function syncFromFirebase() {
  setLeadersVisible(true);
  if (!state.firestoreReady) {
    renderLeaders();
    setStatus('Показаны локальные результаты.');
    return;
  }
  try {
    const q = query(collection(state.db, FIRESTORE_COLLECTION), orderBy('level', 'asc'), orderBy('score', 'desc'), orderBy('date', 'asc'), limit(200));
    const snap = await getDocs(q);
    const loaded = [];
    snap.forEach(doc => {
      const data = doc.data();
      if (!LEVELS[data.level]) return;
      loaded.push({
        name: data.name || 'Без имени',
        score: Number(data.score || 0),
        date: data.date || new Date().toISOString(),
        level: data.level,
      });
    });
    state.leaders = sortLeaders(loaded);
    saveLocalLeaders();
    renderLeaders();
    setStatus('Таблица лидеров обновлена.');
  } catch (error) {
    console.error(error);
    renderLeaders();
    setStatus('Не удалось обновить таблицу лидеров. Показаны локальные результаты.');
  }
}

async function saveResult(result) {
  state.leaders.push(result);
  state.leaders = sortLeaders(state.leaders);
  saveLocalLeaders();
  renderLeaders();

  if (!state.firestoreReady) return;
  try {
    await addDoc(collection(state.db, FIRESTORE_COLLECTION), {
      ...result,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Firebase save error:', error);
  }
}

function buildNote(step, accidental, octave, clef) {
  let midi = 12 * (octave + 1) + semitones[step];
  if (accidental === '#') midi += 1;
  if (accidental === 'b') midi -= 1;
  return {
    id: `${clef}-${step}${accidental || ''}${octave}`,
    step,
    accidental,
    octave,
    midi,
    clef,
    labelRu: buildRuLabel(step, accidental),
    noteIndex: diatonicIndex(step, octave),
  };
}

function buildRuLabel(step, accidental) {
  const base = naturalMapRu[step];
  if (accidental === '#') return `${base}♯`;
  if (accidental === 'b') return `${base}♭`;
  if (accidental === 'n') return `${base}♮`;
  return base;
}

function midiValue(step, accidental, octave) {
  let midi = 12 * (octave + 1) + semitones[step];
  if (accidental === '#') midi += 1;
  if (accidental === 'b') midi -= 1;
  return midi;
}

function comparePitch(aStep, aOct, bStep, bOct) {
  return diatonicIndex(aStep, aOct) - diatonicIndex(bStep, bOct);
}

function* iterateNaturalRange(startStep, startOctave, endStep, endOctave) {
  let octave = startOctave;
  let step = startStep;
  while (true) {
    yield { step, octave };
    if (step === endStep && octave === endOctave) break;
    const idx = whiteStepsOrder.indexOf(step);
    if (idx === whiteStepsOrder.length - 1) {
      step = whiteStepsOrder[0];
      octave += 1;
    } else {
      step = whiteStepsOrder[idx + 1];
    }
  }
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildNaturalClefRange(clef, startStep, startOctave, endStep, endOctave, accidentalMode = 'plain') {
  const notes = [];
  for (const item of iterateNaturalRange(startStep, startOctave, endStep, endOctave)) {
    const accidental = accidentalMode === 'natural-sign' ? 'n' : null;
    notes.push(buildNote(item.step, accidental, item.octave, clef));
  }
  return notes;
}

function buildAccidentalClefRange(clef, startStep, startOctave, endStep, endOctave, includeNatural = true, includeSharps = true, includeFlats = true, includeNaturalSign = false) {
  const notes = [];
  for (const item of iterateNaturalRange(startStep, startOctave, endStep, endOctave)) {
    if (includeNatural) notes.push(buildNote(item.step, null, item.octave, clef));
    if (includeNaturalSign) notes.push(buildNote(item.step, 'n', item.octave, clef));
    if (includeSharps && sharpableSteps.has(item.step)) notes.push(buildNote(item.step, '#', item.octave, clef));
    if (includeFlats && flattableSteps.has(item.step)) notes.push(buildNote(item.step, 'b', item.octave, clef));
  }
  return notes.filter(note => note.midi >= 45 && note.midi <= 88);
}

function buildEasiestPool() {
  return shuffle(buildNaturalClefRange('treble', 'B', 3, 'F', 5));
}

function buildEasyPool() {
  return shuffle(buildAccidentalClefRange('treble', 'F', 3, 'E', 6, true, true, true, false));
}

function buildMediumPool() {
  return shuffle(buildNaturalClefRange('bass', 'A', 2, 'B', 3));
}

function buildHardPool() {
  const treble = shuffle(buildAccidentalClefRange('treble', 'E', 4, 'F', 5, false, true, true, true));
  const bass = shuffle(buildAccidentalClefRange('bass', 'G', 2, 'A', 3, false, true, true, true));
  const maxLen = Math.max(treble.length, bass.length);
  const notes = [];
  let nextClef = state.lastHardClef === 'treble' ? 'bass' : 'treble';
  for (let i = 0; i < maxLen; i += 1) {
    if (nextClef === 'treble') {
      if (treble[i]) notes.push(treble[i]);
      if (bass[i]) notes.push(bass[i]);
    } else {
      if (bass[i]) notes.push(bass[i]);
      if (treble[i]) notes.push(treble[i]);
    }
    nextClef = nextClef === 'treble' ? 'bass' : 'treble';
  }
  return notes;
}

function refillQuestionQueue() {
  if (!state.selectedLevel) return;
  state.questionQueue = LEVELS[state.selectedLevel].poolBuilder();
}

function nextNote() {
  if (!state.questionQueue.length) refillQuestionQueue();
  state.currentNote = state.questionQueue.shift() || null;
  if (state.selectedLevel === 'hard' && state.currentNote) {
    state.lastHardClef = state.currentNote.clef;
  }
  drawStaff(state.currentNote);
  renderHint();
}

function levelAllowsHints() {
  return LEVELS[state.selectedLevel]?.hints;
}

function renderHint() {
  if (!state.currentNote) {
    els.hintLine.textContent = '';
    return;
  }
  if (!levelAllowsHints()) {
    els.hintLine.textContent = 'Подсказок на этом уровне нет.';
    return;
  }
  els.hintLine.textContent = `${state.currentNote.labelRu} (${octaveLabelsRu[state.currentNote.octave]} октава, ${state.currentNote.clef === 'treble' ? 'скрипичный' : 'басовый'} ключ)`;
}

function getCurrentClef() {
  if (state.currentNote?.clef) return state.currentNote.clef;
  if (state.selectedLevel === 'medium') return 'bass';
  return 'treble';
}

function getNoteY(note, staffTop, spacing) {
  const clef = clefConfig[note.clef];
  const diff = note.noteIndex - clef.bottomLine;
  return staffTop + 4 * spacing - diff * (spacing / 2);
}

function yForIndex(clefName, noteIndex, staffTop, spacing) {
  const clef = clefConfig[clefName];
  const diff = noteIndex - clef.bottomLine;
  return staffTop + 4 * spacing - diff * (spacing / 2);
}

function drawLedgerLines(note, noteX, staffTop, spacing) {
  const clef = clefConfig[note.clef];
  const ledgerHalfLength = spacing * 0.92;
  ctx.lineWidth = Math.max(2, spacing * 0.08);

  if (note.noteIndex > clef.topLine) {
    for (let idx = clef.topLine + 2; idx <= note.noteIndex; idx += 2) {
      const y = yForIndex(note.clef, idx, staffTop, spacing);
      ctx.beginPath();
      ctx.moveTo(noteX - ledgerHalfLength, y);
      ctx.lineTo(noteX + ledgerHalfLength, y);
      ctx.stroke();
    }
  }

  if (note.noteIndex < clef.bottomLine) {
    for (let idx = clef.bottomLine - 2; idx >= note.noteIndex; idx -= 2) {
      const y = yForIndex(note.clef, idx, staffTop, spacing);
      ctx.beginPath();
      ctx.moveTo(noteX - ledgerHalfLength, y);
      ctx.lineTo(noteX + ledgerHalfLength, y);
      ctx.stroke();
    }
  }
}

function drawStaff(note) {
  const { width, height } = els.canvas;
  ctx.clearRect(0, 0, width, height);

  const left = 120;
  const right = width - 90;
  const clefName = note?.clef || getCurrentClef();
  const clefSymbol = clefConfig[clefName].symbol;

  let spacing = 34;
  let staffTop = 86;
  if (state.selectedLevel === 'easy') {
    spacing = 26;
    staffTop = Math.round((height - 4 * spacing) / 2);
  }

  ctx.fillStyle = '#5a341f';
  ctx.strokeStyle = '#5a341f';
  ctx.lineWidth = Math.max(1.8, spacing * 0.07);

  for (let i = 0; i < 5; i += 1) {
    const y = staffTop + i * spacing;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }

  const clefFontSize = clefName === 'treble' ? Math.round(spacing * 2.65) : Math.round(spacing * 2.5);
  ctx.font = `${clefFontSize}px "Times New Roman", Georgia, serif`;
  ctx.fillText(clefSymbol, left - spacing * 2.2, clefName === 'treble' ? staffTop + spacing * 3.2 : staffTop + spacing * 3.35);

  if (!note) return;

  const noteX = width * 0.58;
  const noteY = getNoteY(note, staffTop, spacing);
  const stemUp = noteY > staffTop + spacing * 2;
  const noteHeadW = spacing * 0.56;
  const noteHeadH = spacing * 0.40;
  const stemLen = spacing * 2.58;

  if (note.accidental) {
    ctx.font = `${Math.round(spacing * 1.5)}px Georgia`;
    const sign = note.accidental === '#' ? '♯' : note.accidental === 'b' ? '♭' : '♮';
    ctx.fillText(sign, noteX - spacing * 1.7, noteY + spacing * 0.44);
  }

  drawLedgerLines(note, noteX, staffTop, spacing);

  ctx.save();
  ctx.translate(noteX, noteY);
  ctx.rotate(-0.32);
  ctx.beginPath();
  ctx.ellipse(0, 0, noteHeadW, noteHeadH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = Math.max(2.2, spacing * 0.095);
  ctx.beginPath();
  if (stemUp) {
    ctx.moveTo(noteX + noteHeadW * 0.78, noteY + 1);
    ctx.lineTo(noteX + noteHeadW * 0.78, noteY - stemLen);
  } else {
    ctx.moveTo(noteX - noteHeadW * 0.78, noteY - 1);
    ctx.lineTo(noteX - noteHeadW * 0.78, noteY + stemLen);
  }
  ctx.stroke();
}

function buildKeyboardRange() {
  const keys = [];
  for (let midi = 45; midi <= 88; midi += 1) keys.push({ midi, pitchClass: midi % 12 });
  return keys;
}

function isWhitePitchClass(pc) {
  return [0, 2, 4, 5, 7, 9, 11].includes(pc);
}

function createKeyboard() {
  const keyboard = els.keyboard;
  keyboard.innerHTML = '';
  const allKeys = buildKeyboardRange();
  const whiteKeys = allKeys.filter(key => isWhitePitchClass(key.pitchClass));
  const whiteWidthPct = 100 / whiteKeys.length;
  const blackWidthPct = whiteWidthPct * 0.7;

  let whiteIndex = 0;
  for (const keyData of allKeys) {
    if (!isWhitePitchClass(keyData.pitchClass)) continue;
    const key = document.createElement('button');
    key.className = 'white-key';
    key.style.left = `${whiteIndex * whiteWidthPct}%`;
    key.style.width = `${whiteWidthPct}%`;
    key.dataset.midi = String(keyData.midi);
    key.addEventListener('click', () => handleKeyPress(keyData.midi, key));
    keyboard.appendChild(key);
    whiteIndex += 1;
  }

  whiteIndex = 0;
  for (const keyData of allKeys) {
    if (isWhitePitchClass(keyData.pitchClass)) {
      whiteIndex += 1;
      continue;
    }
    const key = document.createElement('button');
    key.className = 'black-key';
    key.style.left = `${(whiteIndex - 0.35) * whiteWidthPct}%`;
    key.style.width = `${blackWidthPct}%`;
    key.dataset.midi = String(keyData.midi);
    key.addEventListener('click', () => handleKeyPress(keyData.midi, key));
    keyboard.appendChild(key);
  }
}

function clearKeyFeedback() {
  els.keyboard.querySelectorAll('.correct, .wrong').forEach(el => el.classList.remove('correct', 'wrong'));
}

function handleKeyPress(midi, element) {
  if (!state.isPlaying || !state.currentNote) return;
  clearKeyFeedback();
  if (midi === state.currentNote.midi) {
    element.classList.add('correct');
    state.score += 1;
    updateHud();
    setTimeout(() => {
      clearKeyFeedback();
      if (state.isPlaying) nextNote();
    }, 260);
  } else {
    element.classList.add('wrong');
  }
}

function updateHud() {
  els.hudPlayer.textContent = state.playerName || '—';
  els.hudLevel.textContent = LEVELS[state.selectedLevel]?.title || '—';
  els.hudTime.textContent = String(state.timeLeft);
  els.hudScore.textContent = String(state.score);
}

function stopCurrentGame() {
  state.isPlaying = false;
  clearInterval(state.roundTimerId);
  clearInterval(state.countdownId);
  clearKeyFeedback();
  state.currentNote = null;
  state.questionQueue = [];
  state.timeLeft = ROUND_SECONDS;
  drawStaff(null);
  renderHint();
}

async function startGame(levelKey) {
  state.selectedLevel = levelKey;
  state.score = 0;
  state.timeLeft = ROUND_SECONDS;
  state.currentNote = null;
  state.isPlaying = false;
  state.questionQueue = [];
  clearKeyFeedback();
  updateHud();
  switchScreen('game');
  drawStaff(null);
  renderHint();
  await startCountdown();
  refillQuestionQueue();
  state.isPlaying = true;
  nextNote();
  state.roundTimerId = setInterval(() => {
    state.timeLeft -= 1;
    updateHud();
    if (state.timeLeft <= 0) finishGame();
  }, 1000);
}

function startCountdown() {
  return new Promise(resolve => {
    let left = COUNTDOWN_SECONDS;
    els.countdown.style.display = 'flex';
    els.countdown.textContent = String(left);
    state.countdownId = setInterval(() => {
      left -= 1;
      if (left > 0) {
        els.countdown.textContent = String(left);
      } else {
        clearInterval(state.countdownId);
        els.countdown.style.display = 'none';
        resolve();
      }
    }, 1000);
  });
}

async function finishGame() {
  stopCurrentGame();
  const result = {
    name: state.playerName,
    score: state.score,
    date: new Date().toISOString(),
    level: state.selectedLevel,
  };
  await saveResult(result);
  els.resultText.textContent = `Ваш результат — ${state.score}`;
  els.resultOverlay.style.display = 'flex';
}

function exitToHome() {
  stopCurrentGame();
  els.resultOverlay.style.display = 'none';
  els.postGameOverlay.style.display = 'none';
  switchScreen('home');
}

function bindEvents() {
  els.startBtn.addEventListener('click', () => {
    const name = els.playerName.value.trim();
    if (!name) {
      setStatus('Введите имя перед началом игры.');
      return;
    }
    state.playerName = name;
    setStatus('');
    switchScreen('level');
  });

  document.querySelectorAll('.level-card').forEach(card => {
    card.addEventListener('click', () => startGame(card.dataset.level));
  });

  els.backHomeBtn.addEventListener('click', () => switchScreen('home'));
  els.loadLeadersBtn.addEventListener('click', syncFromFirebase);
  els.clearLocalBtn.addEventListener('click', () => {
    state.leaders = [];
    saveLocalLeaders();
    renderLeaders();
    setLeadersVisible(true);
    setStatus('Таблица лидеров очищена.');
  });
  els.gameExitBtn.addEventListener('click', exitToHome);
  els.resultOkBtn.addEventListener('click', () => {
    els.resultOverlay.style.display = 'none';
    els.postGameOverlay.style.display = 'flex';
  });
  els.playAgainBtn.addEventListener('click', () => {
    els.postGameOverlay.style.display = 'none';
    switchScreen('level');
  });
  els.exitBtn.addEventListener('click', exitToHome);
}

function initSplash() {
  setTimeout(() => switchScreen('home'), SPLASH_TOTAL_MS);
}

function init() {
  initFirebase();
  renderLeaders();
  setLeadersVisible(false);
  createKeyboard();
  drawStaff(null);
  bindEvents();
  initSplash();
}

init();
