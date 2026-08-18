import { createScreenController } from './app/screens.js';
import { startCountdown as startCountdownTimer, startRoundTimer } from './app/timers.js';
import { gameConfig } from './config.js';
import { createGameEngine } from './game/gameEngine.js';
import { LEVELS, buildPoolForLevel } from './game/levels.js';
import { createApiClient } from './services/apiClient.js';
import { createLeaderRepository } from './services/leaderRepository.js';
import { createBrowserLocalLeaderStore } from './services/localLeaders.js';
import { normalizePlayerName } from './services/leaderValidation.js';
import { createServerLeaderStore } from './services/serverLeaders.js';
import { playNote } from './services/sound.js';
import { getDomElements } from './ui/dom.js';
import { renderHint as renderHintElement } from './ui/hints.js';
import { createKeyboardController } from './ui/keyboard.js';
import { renderLeaders as renderLeadersView } from './ui/leadersView.js';
import { createModalController } from './ui/modals.js';
import { createStaffRenderer } from './ui/staffCanvas.js';

const apiClient = createApiClient();
const localLeaderStore = createBrowserLocalLeaderStore(gameConfig.storageKey);
const serverLeaderStore = createServerLeaderStore(apiClient);
const leaderRepository = createLeaderRepository({
  localStore: localLeaderStore,
  remoteStore: serverLeaderStore,
  levels: LEVELS,
});

const state = {
  playerName: '',
  user: null,
  selectedLevel: null,
  score: 0,
  timeLeft: gameConfig.roundSeconds,
  currentNote: null,
  leaders: leaderRepository.getLocal(),
  roundTimerId: null,
  countdownId: null,
  countdownCancel: null,
  isPlaying: false,
  isStarting: false,
  isFinishing: false,
  questionQueue: [],
  lastHardClef: 'bass',
  roundStartedAt: null,
  totalAnswers: 0,
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

function updateAuthUi() {
  els.authState.textContent = state.user
    ? `Профиль: ${state.user.displayName}`
    : 'Войдите или зарегистрируйтесь, чтобы сохранять результаты онлайн.';
  els.logoutBtn.classList.toggle('hidden', !state.user);
}

async function syncSession() {
  try {
    const session = await apiClient.getSession();
    state.user = session.user || null;
    if (state.user) {
      state.playerName = state.user.displayName;
      els.playerName.value = state.user.displayName;
    }
  } catch {
    state.user = null;
  }
  updateAuthUi();
}

async function syncLeaderboard() {
  setLeadersVisible(true);
  const result = await leaderRepository.getTop({ syncRemote: true });
  state.leaders = result.leaders;
  renderLeaders();

  if (result.source === 'remote') {
    setStatus('Таблица лидеров обновлена с сервера.');
    return;
  }

  setStatus(result.remoteError
    ? 'Сервер временно недоступен. Показаны локальные результаты.'
    : 'Показаны локальные результаты.');
}

async function saveResult(result) {
  const saveState = await leaderRepository.save(result);
  state.leaders = saveState.leaders;
  renderLeaders();

  if (!saveState.accepted) {
    setStatus('Результат не сохранен: данные игры не прошли проверку.');
  } else if (saveState.remote === 'failed') {
    setStatus('Результат сохранен локально. Сервер временно недоступен.');
  } else if (saveState.remote === 'saved') {
    setStatus('Результат сохранен на сервере.');
  } else if (!state.user) {
    setStatus('Результат сохранен локально. Войдите, чтобы сохранять результаты онлайн.');
  }
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
  state.totalAnswers += 1;
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
  els.hudPlayer.textContent = state.playerName || '—';
  els.hudLevel.textContent = LEVELS[state.selectedLevel]?.title || '—';
  els.hudTime.textContent = String(state.timeLeft);
  els.hudScore.textContent = String(state.score);
}

function stopCountdown() {
  state.countdownId?.stop();
  state.countdownId = null;
  state.countdownCancel?.();
  state.countdownCancel = null;
  els.countdown.style.display = 'none';
}

function stopCurrentGame() {
  gameEngine.stopRound();
  syncEngineState();
  state.roundTimerId?.stop();
  state.roundTimerId = null;
  stopCountdown();
  keyboardController.clearFeedback();
  state.timeLeft = gameConfig.roundSeconds;
  state.isStarting = false;
  drawStaff(null);
  renderHint();
  updateHud();
}

async function startGame(levelKey) {
  if (state.isStarting || state.isPlaying) return;
  if (!LEVELS[levelKey]) {
    setStatus('Выбран неизвестный уровень.');
    return;
  }

  state.isStarting = true;
  state.isFinishing = false;
  state.totalAnswers = 0;
  state.roundStartedAt = null;
  gameEngine.startRound(levelKey, { lastHardClef: state.lastHardClef });
  syncEngineState();
  state.timeLeft = gameConfig.roundSeconds;
  keyboardController.clearFeedback();
  updateHud();
  screenController.show('game');
  drawStaff(null);
  renderHint();

  const completed = await startCountdown();
  if (!completed) return;

  gameEngine.startAnswering();
  syncEngineState();
  state.isStarting = false;
  state.roundStartedAt = Date.now();
  nextNote();
  state.roundTimerId = startRoundTimer(gameConfig.roundSeconds, timeLeft => {
    state.timeLeft = timeLeft;
    updateHud();
  }, finishGame);
}

function startCountdown() {
  return new Promise(resolve => {
    els.countdown.style.display = 'flex';
    let settled = false;
    state.countdownCancel = () => {
      if (settled) return;
      settled = true;
      resolve(false);
    };
    state.countdownId = startCountdownTimer(
      gameConfig.countdownSeconds,
      left => {
        els.countdown.textContent = String(left);
      },
      () => {
        if (settled) return;
        settled = true;
        state.countdownId = null;
        state.countdownCancel = null;
        els.countdown.style.display = 'none';
        resolve(true);
      },
    );
  });
}

async function finishGame() {
  if (state.isFinishing) return;
  state.isFinishing = true;

  const durationMs = state.roundStartedAt ? Date.now() - state.roundStartedAt : gameConfig.roundSeconds * 1000;
  const result = {
    name: state.playerName,
    score: state.score,
    date: new Date().toISOString(),
    level: state.selectedLevel,
    durationMs,
    correctAnswers: state.score,
    totalAnswers: Math.max(state.totalAnswers, state.score),
  };

  stopCurrentGame();
  await saveResult(result);
  modals.showResult(result.score);
  state.isFinishing = false;
}

function exitToHome() {
  stopCurrentGame();
  modals.hideResult();
  modals.hidePostGame();
  screenController.show('home');
}

async function authenticate(mode) {
  const name = normalizePlayerName(els.playerName.value);
  const password = els.playerPassword.value;
  if (!name || password.length < 6) {
    setStatus('Введите имя и пароль не короче 6 символов.');
    return;
  }

  try {
    const result = mode === 'register'
      ? await apiClient.register({ name, password })
      : await apiClient.login({ name, password });
    state.user = result.user;
    state.playerName = result.user.displayName;
    els.playerName.value = result.user.displayName;
    els.playerPassword.value = '';
    updateAuthUi();
    setStatus(mode === 'register' ? 'Профиль создан.' : 'Вы вошли в профиль.');
    await syncLeaderboard();
  } catch (error) {
    const messages = {
      name_taken: 'Такое имя уже занято.',
      invalid_credentials: 'Неверное имя или пароль.',
      invalid_registration: 'Проверьте имя и пароль.',
    };
    setStatus(messages[error.data?.error] || 'Не удалось выполнить вход.');
  }
}

function bindEvents() {
  els.startBtn.addEventListener('click', () => {
    const name = normalizePlayerName(els.playerName.value);
    if (!name) {
      setStatus('Введите имя перед началом игры.');
      return;
    }
    state.playerName = state.user?.displayName || name;
    els.playerName.value = state.playerName;
    setStatus(state.user ? '' : 'Гостевой режим: результат сохранится только локально.');
    screenController.show('level');
  });

  els.registerBtn.addEventListener('click', () => authenticate('register'));
  els.loginBtn.addEventListener('click', () => authenticate('login'));
  els.logoutBtn.addEventListener('click', async () => {
    await apiClient.logout();
    state.user = null;
    updateAuthUi();
    setStatus('Вы вышли из профиля.');
  });

  els.levelCards.forEach(card => {
    card.addEventListener('click', () => startGame(card.dataset.level));
  });

  els.backHomeBtn.addEventListener('click', () => screenController.show('home'));
  els.loadLeadersBtn.addEventListener('click', syncLeaderboard);
  els.clearLocalBtn.addEventListener('click', () => {
    state.leaders = leaderRepository.clearLocal();
    renderLeaders();
    setLeadersVisible(true);
    setStatus('Локальная таблица очищена.');
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
  setTimeout(() => screenController.show('home'), gameConfig.splashTotalMs);
}

async function init() {
  renderLeaders();
  setLeadersVisible(false);
  keyboardController.render();
  drawStaff(null);
  updateHud();
  updateAuthUi();
  bindEvents();
  await syncSession();
  await syncLeaderboard();
  setLeadersVisible(false);
  initSplash();
}

init();
