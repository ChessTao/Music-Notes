export function startCountdown(seconds, onTick, onFinish = () => {}) {
  let left = seconds;
  onTick(left);

  const id = setInterval(() => {
    left -= 1;
    if (left > 0) {
      onTick(left);
      return;
    }

    clearInterval(id);
    onFinish();
  }, 1000);

  return {
    stop() {
      clearInterval(id);
    },
  };
}

export function startRoundTimer(seconds, onTick, onFinish) {
  let left = seconds;

  const id = setInterval(() => {
    left -= 1;
    onTick(left);

    if (left <= 0) {
      clearInterval(id);
      onFinish();
    }
  }, 1000);

  return {
    stop() {
      clearInterval(id);
    },
  };
}
