export const MODES = {
  'press-key-by-staff-note': {
    createQuestion(note) {
      return note;
    },
    checkAnswer(question, midi) {
      return midi === question.midi;
    },
    renderTarget(question) {
      return question;
    },
  },
};

export function getMode(modes, modeName) {
  const mode = modes[modeName];
  if (!mode) {
    throw new Error(`Game mode "${modeName}" was not found.`);
  }
  return mode;
}
