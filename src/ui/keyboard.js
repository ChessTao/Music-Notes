export function buildKeyboardRange() {
  const keys = [];
  for (let midi = 45; midi <= 88; midi += 1) keys.push({ midi, pitchClass: midi % 12 });
  return keys;
}

export function isWhitePitchClass(pc) {
  return [0, 2, 4, 5, 7, 9, 11].includes(pc);
}

export function clearKeyFeedback(root) {
  root.querySelectorAll('.correct, .wrong').forEach(el => el.classList.remove('correct', 'wrong'));
}

export function createKeyboardController(root, onKeyPress) {
  function render() {
    root.innerHTML = '';
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
      key.addEventListener('click', () => onKeyPress(keyData.midi, key));
      root.appendChild(key);
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
      key.addEventListener('click', () => onKeyPress(keyData.midi, key));
      root.appendChild(key);
    }
  }

  return {
    render,
    clearFeedback() {
      clearKeyFeedback(root);
    },
  };
}
