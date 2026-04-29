import { createScreenController } from './app/screens.js';
import { startCountdown as startCountdownTimer, startRoundTimer } from './app/timers.js';
import { createGameEngine } from './game/gameEngine.js';
import { LEVELS, buildPoolForLevel } from './game/levels.js';
import { createFirebaseLeaderStore } from './services/firebaseLeaders.js';
import { createLeaderRepository } from './services/leaderRepository.js';
import { createBrowserLocalLeaderStore } from './services/localLeaders.js';
import { playNote } from './services/sound.js';
import { getDomElements } from './ui/dom.js';
import { renderHint as renderHintElement } from './ui/hints.js';
import { createKeyboardController } from './ui/keyboard.js';
import { renderLeaders as renderLeadersView } from './ui/leadersView.js';
import { createModalController } from './ui/modals.js';
import { createStaffRenderer } from './ui/staffCanvas.js';

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

const localLeaderStore = createBrowserLocalLeaderStore(STORAGE_KEY);
const firebaseLeaderStore = createFirebaseLeaderStore(firebaseConfig, FIRESTORE_COLLECTION, LEVELS);
const leaderRepository = createLeaderRepository({
  localStore: localLeaderStore,
  remoteStore: firebaseLeaderStore,
});

const state = {
  playerName: '',
  selectedLevel: null,
  score: 0,
  timeLeft: ROUND_SECONDS,
  currentNote: null,
  leaders: leaderRepository.getLocal(),
  roundTimerId: null,
  countdownId: null,
  isPlaying: false,
  questionQueue: [],
  lastHardClef: 'bass',
};

const { screens, els } = getDomElements();
const screenController = createScreenController(screens);
const gameEngine = createGameEngine({ levels: LEVELS, poolBuilder: buildPoolForLevel });
const staffRenderer = createStaffRenderer(els.canvas);
const keyboardController = createKeyboardController(els.keyboard, handleKeyPress);
const modals = createModalController(els);

function syncEngineState() {
  const gameState = gameEngine.getState();
  state.selectedLevel = gameState.selectedLevel;
  state.score = gameState.score;
  state.currentNote = gameState.currentNote;
  state.questionQueue = gameState.questionQueue;
  state.lastHardClef = gameState.lastHardClef;
  state.isPlaying = gameState.isPlaying;
}

function setStatus(text = '') {
  els.statusLine.textContent = text;
}

function setLeadersVisible(visible) {
  els.leadersArea.classList.toggle('hidden', !visible);
  els.homeGrid.classList.toggle('leaders-hidden', !visible);
}

function renderLeaders() {
  renderLeadersView(els.leaderBodies, state.leaders);
}

async function syncFromFirebase() {
  setLeadersVisible(true);
  try {
    const result = await leaderRepository.getTop({ syncRemote: true });
    state.leaders = result.leaders;
    renderLeaders();
    setStatus(result.source === 'remote' ? 'Таблица лидеров обновлена.' : 'Показаны локальные результаты.');
  } catch (error) {
    console.error(error);
    state.leaders = leaderRepository.getLocal();
    renderLeaders();
    setStatus('Не удалось обновить таблицу лидеров. Показаны локальные результаты.');
  }
}

async function saveResult(result) {
  state.leaders = await leaderRepository.save(result);
  renderLeaders();
}

function nextNote() {
  gameEngine.nextQuestion();
  syncEngineState();
  drawStaff(state.currentNote);
  renderHint();
}

function renderHint() {
  renderHintElement(els.hintLine, state.currentNote, LEVELS[state.selectedLevel]);
}

function getCurrentClef() {
  if (state.currentNote?.clef) return state.currentNote.clef;
  if (state.selectedLevel === 'medium') return 'bass';
  return 'treble';
}

function drawStaff(note) {
  staffRenderer.draw(note, {
    clefName: getCurrentClef(),
    levelKey: state.selectedLevel,
  });
}

function handleKeyPress(midi, element) {
  if (!state.isPlaying || !state.currentNote) return;
  playNote(midi);
  keyboardController.clearFeedback();
  const result = gameEngine.submitAnswer(midi);
  syncEngineState();
  if (result.correct) {
    element.classList.add('correct');
    updateHud();
    setTimeout(() => {
      keyboardController.clearFeedback();
      if (state.isPlaying) nextNote();
    }, 260);
  } else {
    element.classList.add('wrong');
  }
}

function updateHud() {
  els.hudPlayer.textContent = state.playerName || 'вЂ”';
  els.hudLevel.textContent = LEVELS[state.selectedLevel]?.title || 'вЂ”';
  els.hudTime.textContent = String(state.timeLeft);
  els.hudScore.textContent = String(state.score);
}

function stopCurrentGame() {
  gameEngine.stopRound();
  syncEngineState();
  state.roundTimerId?.stop();
  state.countdownId?.stop();
  state.roundTimerId = null;
  state.countdownId = null;
  keyboardController.clearFeedback();
  state.timeLeft = ROUND_SECONDS;
  drawStaff(null);
  renderHint();
}

async function startGame(levelKey) {
  gameEngine.startRound(levelKey, { lastHardClef: state.lastHardClef });
  syncEngineState();
  state.timeLeft = ROUND_SECONDS;
  keyboardController.clearFeedback();
  updateHud();
  screenController.show('game');
  drawStaff(null);
  renderHint();
  await startCountdown();
  gameEngine.startAnswering();
  syncEngineState();
  nextNote();
  state.roundTimerId = startRoundTimer(ROUND_SECONDS, timeLeft => {
    state.timeLeft = timeLeft;
    updateHud();
  }, finishGame);
}

function startCountdown() {
  return new Promise(resolve => {
    els.countdown.style.display = 'flex';
    state.countdownId = startCountdownTimer(
      COUNTDOWN_SECONDS,
      left => {
        els.countdown.textContent = String(left);
      },
      () => {
        state.countdownId = null;
        els.countdown.style.display = 'none';
        resolve();
      },
    );
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
  modals.showResult(state.score);
}

function exitToHome() {
  stopCurrentGame();
  modals.hideResult();
  modals.hidePostGame();
  screenController.show('home');
}

function bindEvents() {
  els.startBtn.addEventListener('click', () => {
    const name = els.playerName.value.trim();
    if (!name) {
      setStatus('Р’РІРµРґРёС‚Рµ РёРјСЏ РїРµСЂРµРґ РЅР°С‡Р°Р»РѕРј РёРіСЂС‹.');
      return;
    }
    state.playerName = name;
    setStatus('');
    screenController.show('level');
  });

  els.levelCards.forEach(card => {
    card.addEventListener('click', () => startGame(card.dataset.level));
  });

  els.backHomeBtn.addEventListener('click', () => screenController.show('home'));
  els.loadLeadersBtn.addEventListener('click', syncFromFirebase);
  els.clearLocalBtn.addEventListener('click', () => {
    state.leaders = leaderRepository.clearLocal();
    renderLeaders();
    setLeadersVisible(true);
    setStatus('РўР°Р±Р»РёС†Р° Р»РёРґРµСЂРѕРІ РѕС‡РёС‰РµРЅР°.');
  });
  els.gameExitBtn.addEventListener('click', exitToHome);
  els.resultOkBtn.addEventListener('click', () => {
    modals.hideResult();
    modals.showPostGame();
  });
  els.playAgainBtn.addEventListener('click', () => {
    modals.hidePostGame();
    screenController.show('level');
  });
  els.exitBtn.addEventListener('click', exitToHome);
}

function initSplash() {
  setTimeout(() => screenController.show('home'), SPLASH_TOTAL_MS);
}

function init() {
  renderLeaders();
  setLeadersVisible(false);
  keyboardController.render();
  drawStaff(null);
  bindEvents();
  initSplash();
}

init();
