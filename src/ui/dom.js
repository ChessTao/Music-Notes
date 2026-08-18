function getRequiredElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Required DOM element #${id} was not found.`);
  }
  return element;
}

function getRequiredElements(selector) {
  const elements = [...document.querySelectorAll(selector)];
  if (!elements.length) {
    throw new Error(`Required DOM elements matching "${selector}" were not found.`);
  }
  return elements;
}

export function getDomElements() {
  return {
    screens: {
      splash: getRequiredElement('splashScreen'),
      home: getRequiredElement('homeScreen'),
      level: getRequiredElement('levelScreen'),
      game: getRequiredElement('gameScreen'),
    },
    els: {
      homeGrid: getRequiredElement('homeGrid'),
      leadersArea: getRequiredElement('leadersArea'),
      playerName: getRequiredElement('playerName'),
      playerEmail: getRequiredElement('playerEmail'),
      playerPassword: getRequiredElement('playerPassword'),
      loginBtn: getRequiredElement('loginBtn'),
      registerBtn: getRequiredElement('registerBtn'),
      logoutBtn: getRequiredElement('logoutBtn'),
      authState: getRequiredElement('authState'),
      startBtn: getRequiredElement('startBtn'),
      loadLeadersBtn: getRequiredElement('loadLeadersBtn'),
      clearLocalBtn: getRequiredElement('clearLocalBtn'),
      statusLine: getRequiredElement('statusLine'),
      backHomeBtn: getRequiredElement('backHomeBtn'),
      hudPlayer: getRequiredElement('hudPlayer'),
      hudLevel: getRequiredElement('hudLevel'),
      hudTime: getRequiredElement('hudTime'),
      hudScore: getRequiredElement('hudScore'),
      gameExitBtn: getRequiredElement('gameExitBtn'),
      countdown: getRequiredElement('countdown'),
      keyboard: getRequiredElement('keyboard'),
      hintLine: getRequiredElement('hintLine'),
      resultOverlay: getRequiredElement('resultOverlay'),
      resultText: getRequiredElement('resultText'),
      resultOkBtn: getRequiredElement('resultOkBtn'),
      postGameOverlay: getRequiredElement('postGameOverlay'),
      playAgainBtn: getRequiredElement('playAgainBtn'),
      exitBtn: getRequiredElement('exitBtn'),
      canvas: getRequiredElement('staffCanvas'),
      levelCards: getRequiredElements('.level-card'),
      leaderBodies: {
        easiest: getRequiredElement('leaders-easiest'),
        easy: getRequiredElement('leaders-easy'),
        medium: getRequiredElement('leaders-medium'),
        hard: getRequiredElement('leaders-hard'),
      },
    },
  };
}
