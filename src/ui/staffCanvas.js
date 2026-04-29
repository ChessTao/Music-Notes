import { diatonicIndex } from '../game/noteModel.js';

export const clefConfig = {
  treble: { symbol: '𝄞', bottomLine: diatonicIndex('E', 4), topLine: diatonicIndex('F', 5) },
  bass: { symbol: '𝄢', bottomLine: diatonicIndex('G', 2), topLine: diatonicIndex('A', 3) },
};

export function getNoteY(note, staffTop, spacing) {
  const clef = clefConfig[note.clef];
  const diff = note.noteIndex - clef.bottomLine;
  return staffTop + 4 * spacing - diff * (spacing / 2);
}

export function yForIndex(clefName, noteIndex, staffTop, spacing) {
  const clef = clefConfig[clefName];
  const diff = noteIndex - clef.bottomLine;
  return staffTop + 4 * spacing - diff * (spacing / 2);
}

function drawLedgerLines(ctx, note, noteX, staffTop, spacing) {
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

export function createStaffRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function draw(note, { clefName = 'treble', levelKey = null } = {}) {
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const left = 120;
    const right = width - 90;
    const currentClef = note?.clef || clefName;
    const clefSymbol = clefConfig[currentClef].symbol;

    let spacing = 34;
    let staffTop = 86;
    if (levelKey === 'easy') {
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

    const clefFontSize = currentClef === 'treble' ? Math.round(spacing * 2.65) : Math.round(spacing * 2.5);
    ctx.font = `${clefFontSize}px "Times New Roman", Georgia, serif`;
    ctx.fillText(clefSymbol, left - spacing * 2.2, currentClef === 'treble' ? staffTop + spacing * 3.2 : staffTop + spacing * 3.35);

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

    drawLedgerLines(ctx, note, noteX, staffTop, spacing);

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

  return { draw };
}
