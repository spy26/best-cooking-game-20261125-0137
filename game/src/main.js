// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. Screens: title, play,
// paused, game over. Click a station to walk to it; E (or Space) interacts.
//
// ?seed=N fixes the order pattern. ?theme=bistro|midnight|mint picks the palette.
// ?shot=start|play|rush|serve (with &seed=N) stages that scene instead of running
// the loop, paints it twice and sets window.__shotReady for a screenshot.
// ?selftest=1 runs the rules headless and reports PASS/FAIL in document.title.
import { BEST_KEY, STEP, THEMES } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { EVENT_BAD, EVENT_CHOP, EVENT_EXPIRE, EVENT_OVER, EVENT_PICKUP, EVENT_PLACE, EVENT_RUSH, EVENT_SERVE, EVENT_SIZZLE, EVENT_TICK, createWorld, stationFront, stationRect } from './world.js';
import { ACTION_CONFIRM, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createPilot, stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const theme = params.get('theme') || 'bistro';
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const selftest = params.get('selftest') === '1';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas, THEMES[theme] ? theme : 'bistro');
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

function soundFor(events) {
  if (events & EVENT_SERVE) audio.serve();
  else if (events & EVENT_CHOP) audio.chop();
  else if (events & EVENT_PICKUP) audio.pickup();
  else if (events & EVENT_PLACE) audio.place();
  else if (events & EVENT_SIZZLE) audio.sizzle();
  else if (events & EVENT_BAD) audio.bad();
  else if (events & EVENT_RUSH) audio.rush();
  else if (events & EVENT_TICK) audio.tick();
  if (events & EVENT_EXPIRE) audio.bad();
}

function runShot(name) {
  const scene = stageShot(name, world);
  world.state.nearestStationName = world.nearestStation();
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runSelftest() {
  const results = [];
  const check = (name, ok) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  try {
    // Headless rules check: stage each screenshot scene and verify the world
    // it leaves behind (orders, assembly, grill, serve, rush).
    const w = createWorld(createRandom(7));
    w.reset();
    check('order spawns on reset', w.state.orders.length >= 1);
    check('recipe has bun first', w.state.orders[0].recipe.items[0] === 'bun');
    // Drive the pilot by importing it lazily through the staged shot instead:
    // stage a play scene and check the world it leaves behind.
    const scene = stageShot('play', w);
    check('play scene stages a screen', scene.screen === SCREEN_PLAY);
    check('plate mid-assembly (2+ items)', w.state.plateOnCounter.length >= 2);
    check('chef carrying the next ingredient', w.state.chef.carrying !== null);
    check('orders still on the board', w.state.orders.length >= 1);
    check('shift clock running', w.state.timeLeft < 180 && w.state.timeLeft > 0);
    // The pilot grills a patty on its way to a full dish.
    const w2 = createWorld(createRandom(7));
    w2.reset();
    const pilot = createPilot();
    let grillSeen = false;
    let servedSeen = 0;
    for (let i = 0; i < 40 / STEP; i += 1) {
      const { input } = pilot.tick(w2);
      w2.step(STEP, input);
      if (w2.state.grill.some((s) => s.patty)) grillSeen = true;
      servedSeen = w2.state.served;
      if (servedSeen >= 1) break;
    }
    check('patty cooks on the grill', grillSeen);
    check('pilot serves a full dish', servedSeen >= 1);
    const serveScene = stageShot('serve', w);
    void serveScene;
    check('serve scene banks coins', w.state.coins > 0);
    check('serve scene counts a dish', w.state.served >= 1);
    const rushScene = stageShot('rush', w);
    void rushScene;
    check('rush hour engages', w.state.rush === true || w.state.timeLeft <= 60);
  } catch (err) {
    results.push(`FAIL exception: ${err && err.message ? err.message : String(err)}`);
  }
  const passed = results.filter((r) => r.startsWith('PASS')).length;
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  const summary = `SELFTEST ${failed === 0 ? 'PASS' : 'FAIL'} ${passed}/${passed + failed}`;
  document.title = summary;
  status.textContent = [summary, ...results].join(' | ');
  const div = document.createElement('pre');
  div.id = 'selftest';
  div.textContent = [summary, ...results].join('\n');
  document.body.appendChild(div);
  window.__shotReady = true;
}

if (selftest) {
  runSelftest();
} else if (shot) {
  runShot(shot);
} else {
  runGame();
}

function runGame() {
  const input = createInput(canvas, () => audio.unlock());
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let moveTarget = null;
  let pendingInteract = false;

  function clickStation(click) {
    for (const name of Object.keys(stationRect)) {
      const r = stationRect(name);
      if (click.x >= r.x - 10 && click.x <= r.x + r.w + 10 && click.y >= r.y - 10 && click.y <= r.y + r.h + 10) {
        return name;
      }
    }
    return null;
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Enter' || event.code === 'Space') {
      if (screen === SCREEN_TITLE) { screen = SCREEN_PLAY; world.reset(); }
      else if (screen === SCREEN_OVER) { screen = SCREEN_TITLE; }
    }
  });
  canvas.addEventListener('pointerdown', () => {
    if (screen === SCREEN_TITLE) { screen = SCREEN_PLAY; world.reset(); }
    else if (screen === SCREEN_OVER) { screen = SCREEN_TITLE; }
  });

  function frame(now) {
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const read = input.read();

    if (read.pause && screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
    else if (read.pause && screen === SCREEN_PAUSED) screen = SCREEN_PLAY;

    if (screen === SCREEN_PLAY) {
      if (read.click) {
        const station = clickStation(read.click);
        if (station) {
          moveTarget = stationFront(station);
          pendingInteract = true;
        } else {
          moveTarget = { x: read.click.x, y: Math.max(190, read.click.y) };
          pendingInteract = false;
        }
      }
      let mx = read.mx;
      let my = read.my;
      if ((mx !== 0 || my !== 0)) moveTarget = null;
      if (moveTarget && mx === 0 && my === 0) {
        const dx = moveTarget.x - world.state.chef.x;
        const dy = moveTarget.y - world.state.chef.y;
        const d = Math.hypot(dx, dy);
        if (d < 26) {
          moveTarget = null;
          if (pendingInteract) { read.interact = true; pendingInteract = false; }
        } else {
          mx = dx / d;
          my = dy / d;
        }
      }
      accumulator += dt;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = world.step(STEP, { mx, my, interact: read.interact, select: read.select });
        read.interact = false;
        read.select = null;
        soundFor(events);
        if (events & EVENT_OVER) {
          screen = SCREEN_OVER;
          if (world.state.coins > best) { best = world.state.coins; saveBest(best); }
          break;
        }
      }
    }
    world.state.nearestStationName = world.nearestStation();
    renderer.draw(world.state, screen, best);
    status.textContent = screen === SCREEN_PLAY
      ? `Coins $${world.state.coins} · ${world.state.served} served · ${Math.ceil(world.state.timeLeft)}s left`
      : screen === SCREEN_TITLE ? 'Sizzle & Serve — press Enter to start' : screen === SCREEN_OVER ? 'Shift over' : 'Paused';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export { ACTION_CONFIRM };
