// Keyboard + mouse input: WASD/arrows to move, E/Space to interact,
// 1-5 to take a pantry ingredient, P pause, mouse click to walk to a station.
import { INGREDIENT_ORDER } from './config.js';

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';

const MOVE_KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

const SELECT_KEYS = {
  Digit1: 'bun', Digit2: 'patty', Digit3: 'tomato', Digit4: 'lettuce', Digit5: 'cheese',
  Numpad1: 'bun', Numpad2: 'patty', Numpad3: 'tomato', Numpad4: 'lettuce', Numpad5: 'cheese',
};

export function createInput(canvas, onFirstGesture) {
  const keys = new Set();
  let interactQueued = false;
  let selectQueued = null;
  let pauseQueued = false;
  let clickQueued = null;
  let gestured = false;

  function gesture() {
    if (gestured) return;
    gestured = true;
    if (onFirstGesture) onFirstGesture();
  }

  window.addEventListener('keydown', (event) => {
    gesture();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'KeyE' || event.code === 'Space') {
      interactQueued = true;
      event.preventDefault();
    }
    if (SELECT_KEYS[event.code]) selectQueued = SELECT_KEYS[event.code];
    if (event.code === 'KeyP') pauseQueued = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    gesture();
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 1280;
    const y = ((event.clientY - rect.top) / rect.height) * 720;
    clickQueued = { x, y };
  });

  return {
    /** Movement vector for this frame, plus edge-triggered actions (consumed). */
    read() {
      let mx = 0;
      let my = 0;
      for (const code of keys) {
        const dir = MOVE_KEYS[code];
        if (dir) { mx += dir[0]; my += dir[1]; }
      }
      const out = {
        mx, my,
        interact: interactQueued,
        select: selectQueued,
        pause: pauseQueued,
        click: clickQueued,
      };
      interactQueued = false;
      selectQueued = null;
      pauseQueued = false;
      clickQueued = null;
      return out;
    },
  };
}

export { INGREDIENT_ORDER };
