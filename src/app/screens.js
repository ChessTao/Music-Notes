export function createScreenController(screens) {
  function show(name) {
    const nextScreen = screens[name];
    if (!nextScreen) {
      throw new Error(`Screen "${name}" was not found.`);
    }

    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    nextScreen.classList.add('active');
  }

  return { show };
}
