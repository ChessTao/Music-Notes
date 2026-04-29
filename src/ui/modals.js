export function createModalController({ resultOverlay, resultText, postGameOverlay }) {
  function showResult(score) {
    resultText.textContent = `Ваш результат — ${score}`;
    resultOverlay.style.display = 'flex';
  }

  function hideResult() {
    resultOverlay.style.display = 'none';
  }

  function showPostGame() {
    postGameOverlay.style.display = 'flex';
  }

  function hidePostGame() {
    postGameOverlay.style.display = 'none';
  }

  return {
    showResult,
    hideResult,
    showPostGame,
    hidePostGame,
  };
}
