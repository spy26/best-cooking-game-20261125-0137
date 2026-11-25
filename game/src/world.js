// Sizzle & Serve — the kitchen simulation: orders, stations, cooking, scoring.
// Pure logic: no DOM, no canvas, no network. Stepped in fixed 1/60 s slices.
import {
  CHEF, CHOPS_NEEDED, COMBO, FIELD, GRILL, HEARTS, INGREDIENTS, MAX_ORDERS,
  ORDER_EVERY, ORDER_EVERY_RUSH, ORDER_PATIENCE, ORDER_PATIENCE_RUSH,
  PAY, RECIPES, RUSH_AT_REMAINING, SHIFT_SECONDS, SPAWN, STATIONS,
} from './config.js';
import { pick } from './random.js';

export const EVENT_CHOP = 1;
export const EVENT_PICKUP = 2;
export const EVENT_PLACE = 4;
export const EVENT_SIZZLE = 8;
export const EVENT_SERVE = 16;
export const EVENT_BAD = 32;
export const EVENT_EXPIRE = 64;
export const EVENT_RUSH = 128;
export const EVENT_OVER = 256;
export const EVENT_TICK = 512;

const FRONT = {
  pantry: { x: 108, y: 580 }, board: { x: 331, y: 486 }, grill: { x: 585, y: 486 },
  assembly: { x: 849, y: 486 }, serve: { x: 1127, y: 486 }, trash: { x: 1210, y: 672 },
};

/** Where the chef stands to work a station (used by the autopilot and click-to-move). */
export function stationFront(name) { return FRONT[name]; }
export function stationRect(name) { return STATIONS[name]; }

function sameItems(a, b) {
  if (a.length !== b.length) return false;
  const counts = {};
  for (const item of a) counts[item] = (counts[item] || 0) + 1;
  for (const item of b) {
    if (!counts[item]) return false;
    counts[item] -= 1;
  }
  return true;
}

/** A cooked patty / chopped veg counts as its raw self when matching a ticket. */
function normalizeItem(item) {
  if (item === 'patty-cooked') return 'patty';
  if (item === 'tomato-chopped') return 'tomato';
  if (item === 'lettuce-chopped') return 'lettuce';
  return item;
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

export function createWorld(random) {
  const state = freshState();

  function freshState() {
    return {
      time: 0, timeLeft: SHIFT_SECONDS, over: false,
      chef: { x: SPAWN.x, y: SPAWN.y, carrying: null, chopItem: null, chops: 0 },
      orders: [], nextOrderIn: 6, orderId: 0,
      grill: [{ patty: null }, { patty: null }],
      plateOnCounter: [], hasPlateOnCounter: true, platePerfect: false,
      coins: 0, served: 0, expired: 0, hearts: HEARTS, combo: 0, bestCombo: 0,
      rush: false, rushAnnounced: false,
      particles: [], floats: [], toast: '', toastUntil: 0,
      shake: 0, serveFlash: 0, lastServeCoins: 0,
    };
  }

  function reset() {
    const next = freshState();
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, next);
    spawnOrder();
  }

  function spawnOrder() {
    if (state.orders.length >= MAX_ORDERS) return;
    const recipe = pick(random, RECIPES);
    const patience = state.rush ? ORDER_PATIENCE_RUSH : ORDER_PATIENCE;
    state.orders.push({
      id: state.orderId, recipe, patience, maxPatience: patience,
    });
    state.orderId += 1;
  }

  function addFloat(x, y, text, color) {
    state.floats.push({ x, y, text, color, life: 1.4 });
  }

  function burst(x, y, color, count, speed = 120) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const v = speed * (0.4 + random() * 0.8);
      state.particles.push({
        x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 40,
        life: 0.5 + random() * 0.4, maxLife: 0.9, color, size: 3 + random() * 4,
      });
    }
  }

  function steam(x, y) {
    state.particles.push({
      x: x + (random() - 0.5) * 40, y, vx: (random() - 0.5) * 10, vy: -34 - random() * 20,
      life: 0.9, maxLife: 0.9, color: 'rgba(255,255,255,0.55)', size: 7 + random() * 5,
    });
  }

  function say(text) {
    state.toast = text;
    state.toastUntil = state.time + 2.2;
  }

  function nearestStation() {
    const { x, y } = state.chef;
    let best = null;
    let bestD = Infinity;
    for (const [name, rect] of Object.entries(STATIONS)) {
      const cx = clamp(x, rect.x, rect.x + rect.w);
      const cy = clamp(y, rect.y, rect.y + rect.h);
      const d = Math.hypot(x - cx, y - cy);
      if (d < bestD) { bestD = d; best = name; }
    }
    return bestD <= CHEF.interactRadius ? best : null;
  }

  function carrying() { return state.chef.carrying; }

  function takeIngredient(key) {
    const chef = state.chef;
    if (chef.carrying) { say('Hands full — serve or trash it first'); return EVENT_BAD; }
    chef.carrying = { kind: 'ingredient', item: key };
    burst(FRONT.pantry.x, FRONT.pantry.y - 30, '#e8a13a', 6, 60);
    return EVENT_PICKUP;
  }

  function addToPlate(item) {
    state.plateOnCounter.push(item);
    return EVENT_PLACE;
  }

  function interact() {
    const chef = state.chef;
    const station = nearestStation();
    if (!station) return 0;
    const front = FRONT[station];

    if (station === 'pantry') {
      say('Pantry: press 1-5 (or click a bin) to take an ingredient');
      return 0;
    }

    if (station === 'board') {
      const held = carrying();
      if (held && held.kind === 'ingredient' && (held.item === 'tomato' || held.item === 'lettuce')) {
        chef.chops += 1;
        burst(front.x, front.y - 20, held.item === 'tomato' ? '#e74c3c' : '#58b368', 10);
        if (chef.chops >= CHOPS_NEEDED) {
          chef.carrying = { kind: 'ingredient', item: `${held.item}-chopped` };
          chef.chops = 0;
          addFloat(front.x, front.y - 40, 'Chopped!', '#2e7d32');
          return EVENT_CHOP | EVENT_PLACE;
        }
        return EVENT_CHOP;
      }
      if (held && held.kind === 'ingredient') { say('That goes on the grill or the plate, not the board'); return EVENT_BAD; }
      say('Bring a tomato or lettuce to chop');
      return 0;
    }

    if (station === 'grill') {
      const held = carrying();
      if (held && held.kind === 'ingredient' && held.item === 'patty') {
        const slot = state.grill.find((s) => s.patty === null);
        if (!slot) { say('Grill is full!'); return EVENT_BAD; }
        slot.patty = { t: 0 };
        chef.carrying = null;
        steam(front.x, front.y - 20);
        return EVENT_SIZZLE;
      }
      // Pick up the most-cooked patty that is not burnt yet.
      let best = null;
      for (const slot of state.grill) {
        if (slot.patty && slot.patty.t < GRILL.burnSeconds && (!best || slot.patty.t > best.t)) best = slot.patty;
      }
      if (best) {
        const slot = state.grill.find((s) => s.patty === best);
        slot.patty = null;
        chef.carrying = { kind: 'ingredient', item: best.t >= GRILL.cookSeconds ? 'patty-cooked' : 'patty', perfect: best.t >= GRILL.cookSeconds && best.t <= GRILL.perfectUntil };
        return EVENT_PICKUP;
      }
      if (state.grill.some((s) => s.patty && s.patty.t >= GRILL.burnSeconds)) {
        say('That patty burnt — trash it from the grill first');
        return EVENT_BAD;
      }
      say('Bring a raw patty from the pantry (2)');
      return 0;
    }

    if (station === 'assembly') {
      const held = carrying();
      if (!held) {
        if (state.hasPlateOnCounter) {
          state.hasPlateOnCounter = false;
          chef.carrying = { kind: 'plate', items: [...state.plateOnCounter], perfectPatty: state.platePerfect };
          state.plateOnCounter = [];
          state.platePerfect = false;
          return EVENT_PICKUP;
        }
        say('No plate here — the next clean plate is coming');
        return 0;
      }
      if (held.kind === 'ingredient') {
        if (!state.hasPlateOnCounter) { say('No plate on the counter — take one first'); return EVENT_BAD; }
        const ok = addToPlateChecked(held.item);
        if (!ok) return EVENT_BAD;
        if (held.item === 'patty-cooked' && held.perfect) state.platePerfect = true;
        chef.carrying = null;
        return EVENT_PLACE;
      }
      // Carrying a plate: put it back down on the counter.
      if (state.hasPlateOnCounter) { say('Counter already holds a plate'); return EVENT_BAD; }
      state.hasPlateOnCounter = true;
      state.plateOnCounter = [...held.items];
      state.platePerfect = !!held.perfectPatty;
      chef.carrying = null;
      return EVENT_PLACE;
    }

    if (station === 'serve') {
      const held = carrying();
      if (!held || held.kind !== 'plate') { say('Bring a finished plate to serve'); return 0; }
      const index = state.orders.findIndex((o) => sameItems(o.recipe.items, held.items.map(normalizeItem)));
      if (index === -1) {
        state.shake = 0.35;
        say('No order wants this dish — check the tickets!');
        return EVENT_BAD;
      }
      const order = state.orders[index];
      state.orders.splice(index, 1);
      const patienceFrac = Math.max(0, order.patience / order.maxPatience);
      let coins = PAY.base + PAY.perItem * held.items.length + order.recipe.bonus + Math.round(PAY.maxTip * patienceFrac);
      if (held.perfectPatty) coins += 2;
      const mult = 1 + Math.min(COMBO.max - 1, state.combo * COMBO.step);
      coins = Math.round(coins * mult);
      state.coins += coins;
      state.served += 1;
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.lastServeCoins = coins;
      state.serveFlash = 0.6;
      chef.carrying = null;
      addFloat(front.x, front.y - 50, `+$${coins}`, '#2e7d32');
      if (state.combo >= 3) addFloat(front.x, front.y - 80, `COMBO x${mult.toFixed(1)}`, '#d94f2b');
      burst(front.x, front.y - 20, '#f2c94c', 16, 160);
      // A fresh clean plate arrives on the counter right away.
      state.hasPlateOnCounter = true;
      state.plateOnCounter = [];
      state.platePerfect = false;
      return EVENT_SERVE;
    }

    if (station === 'trash') {
      const held = carrying();
      if (!held) { say('Nothing to throw away'); return 0; }
      chef.carrying = null;
      chef.chops = 0;
      burst(front.x, front.y - 10, '#7a6a58', 8, 80);
      return EVENT_PLACE;
    }
    return 0;
  }

  /** Stack one item, enforcing the recipe rules (chop/cook first, bun first). */
  function addToPlateChecked(item) {
    const plate = state.plateOnCounter;
    if (item === 'tomato' || item === 'lettuce') { say('Chop it on the board first!'); return false; }
    if (item === 'patty') { say('Cook it on the grill first!'); return false; }
    if (plate.length === 0 && item !== 'bun') { say('Every dish starts with a bun'); return false; }
    if (plate.length > 0 && item === 'bun') { say('One bun per dish — it is already the base'); return false; }
    plate.push(item);
    return true;
  }

  /** Keyboard 1-5 at the pantry (or a click on a bin) takes that ingredient. */
  function selectIngredient(key) {
    if (!INGREDIENTS[key]) return 0;
    const station = nearestStation();
    if (station !== 'pantry') return 0;
    return takeIngredient(key);
  }

  function collide() {
    const chef = state.chef;
    chef.x = clamp(chef.x, 16 + CHEF.radius, FIELD.width - 16 - CHEF.radius);
    chef.y = clamp(chef.y, 176 + CHEF.radius, FIELD.height - 16 - CHEF.radius);
    for (const rect of Object.values(STATIONS)) {
      const cx = clamp(chef.x, rect.x, rect.x + rect.w);
      const cy = clamp(chef.y, rect.y, rect.y + rect.h);
      const dx = chef.x - cx;
      const dy = chef.y - cy;
      const d = Math.hypot(dx, dy);
      if (d < CHEF.radius && d > 0.001) {
        chef.x = cx + (dx / d) * CHEF.radius;
        chef.y = cy + (dy / d) * CHEF.radius;
      } else if (d <= 0.001) {
        chef.y = rect.y + rect.h + CHEF.radius;
      }
    }
  }

  function step(dt, input) {
    let events = 0;
    if (state.over) return events;
    state.time += dt;
    state.timeLeft = Math.max(0, SHIFT_SECONDS - state.time);

    // Rush hour: the last minute of the shift.
    if (!state.rush && state.timeLeft <= RUSH_AT_REMAINING && state.timeLeft > 0) {
      state.rush = true;
      events |= EVENT_RUSH;
    }

    // Last-10-seconds tick.
    const prevLeft = Math.ceil(state.timeLeft + dt);
    if (state.timeLeft <= 10.5 && Math.ceil(state.timeLeft) !== prevLeft) events |= EVENT_TICK;

    // Move the chef.
    const len = Math.hypot(input.mx || 0, input.my || 0);
    if (len > 0.01) {
      state.chef.x += ((input.mx || 0) / len) * CHEF.speed * dt;
      state.chef.y += ((input.my || 0) / len) * CHEF.speed * dt;
      collide();
    }
    if (input.select) events |= selectIngredient(input.select);
    if (input.interact) events |= interact();

    // Grill cooks; a patty left too long burns and smokes.
    for (const slot of state.grill) {
      if (!slot.patty) continue;
      slot.patty.t += dt;
      if (slot.patty.t > GRILL.cookSeconds && slot.patty.t < GRILL.burnSeconds) {
        if (random() < dt * 6) steam(STATIONS.grill.x + 40 + (slot === state.grill[0] ? 30 : 150), STATIONS.grill.y + 10);
      }
      if (slot.patty.t >= GRILL.burnSeconds && random() < dt * 10) {
        steam(STATIONS.grill.x + 40 + (slot === state.grill[0] ? 30 : 150), STATIONS.grill.y + 10);
      }
    }

    // Orders arrive; patience runs out.
    state.nextOrderIn -= dt;
    if (state.nextOrderIn <= 0) {
      spawnOrder();
      state.nextOrderIn = (state.rush ? ORDER_EVERY_RUSH : ORDER_EVERY) * (0.85 + random() * 0.3);
    }
    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const order = state.orders[i];
      order.patience -= dt;
      if (order.patience <= 0) {
        state.orders.splice(i, 1);
        state.expired += 1;
        state.hearts -= 1;
        state.combo = 0;
        state.shake = 0.4;
        events |= EVENT_EXPIRE;
        if (state.hearts <= 0) {
          state.over = true;
          events |= EVENT_OVER;
        }
      }
    }

    // Shift clock hits zero: results.
    if (state.timeLeft <= 0 && !state.over) {
      state.over = true;
      events |= EVENT_OVER;
    }

    // Particles and floating texts age.
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floats.length - 1; i >= 0; i -= 1) {
      const f = state.floats[i];
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) state.floats.splice(i, 1);
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
    if (state.serveFlash > 0) state.serveFlash = Math.max(0, state.serveFlash - dt);
    return events;
  }

  return { state, reset, step, interact, selectIngredient, nearestStation };
}
