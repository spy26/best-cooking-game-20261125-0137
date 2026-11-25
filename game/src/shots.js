// Screenshot scenes behind ?shot=start|play|rush|serve.
// Each scene plays the real rules forward from a fresh world with a scripted
// autopilot that reads the order board and cooks what the tickets ask for,
// so every frame is what a short game really looks like — and the same seed
// always gives the same frame.
import { STEP } from './config.js';
import { stationFront } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const ARRIVE = 30;

/** Task list that cooks one recipe, then serves it. */
function buildQueue(recipe) {
  const tasks = [];
  for (const item of recipe.items) {
    if (item === 'bun' || item === 'cheese') {
      tasks.push({ to: 'pantry', select: item });
      tasks.push({ to: 'assembly', stack: true });
    } else if (item === 'patty') {
      tasks.push({ to: 'pantry', select: 'patty' });
      tasks.push({ to: 'grill', place: true });
      tasks.push({ to: 'grill', waitCooked: true });
      tasks.push({ to: 'grill', pickup: true });
      tasks.push({ to: 'assembly', stack: true });
    } else if (item === 'tomato' || item === 'lettuce') {
      tasks.push({ to: 'pantry', select: item });
      tasks.push({ to: 'board', chop: true });
      tasks.push({ to: 'assembly', stack: true });
    }
  }
  tasks.push({ to: 'assembly', takePlate: true });
  tasks.push({ to: 'serve', serve: true });
  return tasks;
}

/** A pilot that works the kitchen: one task at a time, steering to each station. */
export function createPilot() {
  let queue = [];
  let task = null;
  let chopsDone = 0;

  function nextTask(world) {
    if (queue.length === 0) {
      const order = world.state.orders[0];
      if (!order) return false;
      queue = buildQueue(order.recipe);
    }
    task = queue.shift();
    chopsDone = 0;
    return true;
  }

  function moveToward(state, target) {
    const dx = target.x - state.chef.x;
    const dy = target.y - state.chef.y;
    const d = Math.hypot(dx, dy);
    if (d <= ARRIVE) return { mx: 0, my: 0, arrived: true };
    return { mx: dx / d, my: dy / d, arrived: false };
  }

  return {
    /** One tick of input for the world. Returns the event mask from the step. */
    tick(world) {
      const state = world.state;
      if (!task && !nextTask(world)) return { input: { mx: 0, my: 0 }, events: 0 };
      const front = stationFront(task.to);
      const move = moveToward(state, front);
      if (!move.arrived) return { input: { mx: move.mx, my: move.my }, events: 0 };

      const input = { mx: 0, my: 0 };
      if (task.select) {
        input.select = task.select;
        task = null;
      } else if (task.chop) {
        const held = state.chef.carrying;
        if (held && held.kind === 'ingredient' && held.item.endsWith('-chopped')) {
          task = null;
        } else {
          input.interact = true;
          chopsDone += 1;
          if (chopsDone >= 3) task = null;
        }
      } else if (task.waitCooked) {
        const done = state.grill.some((s) => s.patty && s.patty.t >= 6.5 && s.patty.t < 11);
        if (done) task = null;
        // If the patty burnt while waiting (should not happen), give up the task.
        if (state.grill.some((s) => s.patty && s.patty.t >= 12)) task = null;
      } else {
        // place / pickup / stack / takePlate / serve: one press, then next task.
        input.interact = true;
        task = null;
      }
      return { input, events: 0 };
    },
    get idle() { return !task && queue.length === 0; },
  };
}

/** Run the world forward with the pilot for up to `maxSeconds` (sim time). */
function runPilot(world, maxSeconds, stopWhen) {
  const pilot = createPilot();
  const steps = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const { input } = pilot.tick(world);
    const events = world.step(STEP, input);
    if (stopWhen && stopWhen(world, events)) return { events, steps: i + 1 };
    if (world.state.over) return { events, steps: i + 1 };
  }
  return { events: 0, steps };
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: title over a fresh kitchen. play: a dish mid-assembly (plate stacked,
 * patty on the grill). rush: deep in rush hour with tickets piling up.
 * serve: just after a dish is served, coins popping.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'rush' && name !== 'serve') {
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, { mx: 0, my: 0 });
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    runPilot(world, 60, (w) => w.state.plateOnCounter.length >= 2 && w.state.chef.carrying !== null);
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  if (name === 'serve') {
    runPilot(world, 120, (w, events) => (events & 16) !== 0);
    for (let i = 0; i < 0.35 / STEP; i += 1) world.step(STEP, { mx: 0, my: 0 });
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  // rush: keep serving until the rush banner is up and tickets pile up.
  runPilot(world, 130, (w) => w.state.rush && w.state.orders.length >= 3 && w.state.timeLeft <= 55);
  return { screen: SCREEN_PLAY, best: world.state.coins };
}

export { SCREEN_OVER };
