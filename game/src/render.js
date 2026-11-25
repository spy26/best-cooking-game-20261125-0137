// Sizzle & Serve — all canvas drawing: kitchen, stations, chef, food, HUD.
// Every picture is drawn with canvas paths; the game ships no image files.
import { CHEF, FIELD, FONT, GRILL, INGREDIENTS, RECIPES, SHIFT_SECONDS, STATIONS, THEMES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

/** One ingredient, drawn at (x, y) with the given radius. */
export function drawIngredient(ctx, item, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  if (item === 'bun') {
    ctx.fillStyle = '#e8a13a';
    ctx.beginPath();
    ctx.arc(0, 2, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c97f2a';
    ctx.fillRect(-r, 0, r * 2, r * 0.45);
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath(); ctx.arc(-r * 0.4, -r * 0.45, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.55, r * 0.12, 0, Math.PI * 2); ctx.fill();
  } else if (item === 'patty' || item === 'patty-cooked') {
    ctx.fillStyle = item === 'patty-cooked' ? '#6e3b1f' : '#c96f6f';
    roundRect(ctx, -r, -r * 0.45, r * 2, r * 0.9, r * 0.35);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.arc(-r * 0.4, 0, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.1, r * 0.13, 0, Math.PI * 2); ctx.fill();
  } else if (item === 'tomato' || item === 'tomato-chopped') {
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f1948a';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
  } else if (item === 'lettuce' || item === 'lettuce-chopped') {
    ctx.fillStyle = '#58b368';
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.45, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillStyle = '#7ed491';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
  } else if (item === 'cheese') {
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.6); ctx.lineTo(r, r * 0.6); ctx.lineTo(0, -r * 0.8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9a521';
    ctx.beginPath(); ctx.arc(-r * 0.3, r * 0.2, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.3, r * 0.1, r * 0.14, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawPlate(ctx, x, y, r, items) {
  ctx.fillStyle = '#f8f8f8';
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9c9c9'; ctx.lineWidth = 2; ctx.stroke();
  let cy = y - 4;
  for (const item of items) {
    drawIngredient(ctx, item, x, cy, r * 0.62);
    cy -= r * 0.42;
  }
}

function mmss(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function createRenderer(canvas, themeName) {
  const ctx = canvas.getContext('2d');
  const P = THEMES[themeName] || THEMES.bistro;

  function drawFloor() {
    ctx.fillStyle = P.wall;
    ctx.fillRect(0, 0, FIELD.width, 176);
    ctx.fillStyle = P.wallTrim;
    ctx.fillRect(0, 170, FIELD.width, 6);
    ctx.fillStyle = P.floor;
    ctx.fillRect(0, 176, FIELD.width, FIELD.height - 176);
    ctx.strokeStyle = P.floorLine;
    ctx.lineWidth = 2;
    for (let x = 0; x <= FIELD.width; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, 176); ctx.lineTo(x, FIELD.height); ctx.stroke();
    }
    for (let y = 176; y <= FIELD.height; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
    }
    ctx.fillStyle = P.floorDark;
    ctx.fillRect(0, 176, FIELD.width, 10);
    // A worn rug where the chef runs all shift, and two potted herbs.
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    roundRect(ctx, 300, 560, 680, 130, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 3;
    roundRect(ctx, 312, 572, 656, 106, 18); ctx.stroke();
    for (const px of [70, 1090]) {
      ctx.fillStyle = '#a8542e';
      roundRect(ctx, px - 16, 648, 32, 26, 5); ctx.fill();
      ctx.fillStyle = '#3f8f4f';
      ctx.beginPath(); ctx.arc(px - 8, 640, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + 8, 638, 11, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px, 632, 9, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawStation(name, state) {
    const r = STATIONS[name];
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    ctx.fillStyle = P.counterEdge;
    roundRect(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 12);
    ctx.fill();
    ctx.fillStyle = name === 'grill' ? P.grill : P.counterTop;
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    if (name === 'grill') {
      ctx.fillStyle = '#22262e';
      roundRect(ctx, r.x + 14, r.y + 14, r.w - 28, r.h - 50, 8);
      ctx.fill();
      ctx.strokeStyle = '#4a5058';
      ctx.lineWidth = 3;
      for (let i = 1; i < 5; i += 1) {
        ctx.beginPath(); ctx.moveTo(r.x + 14 + i * ((r.w - 28) / 5), r.y + 16); ctx.lineTo(r.x + 14 + i * ((r.w - 28) / 5), r.y + r.h - 38); ctx.stroke();
      }
      state.grill.forEach((slot, i) => {
        if (!slot.patty) return;
        const px = r.x + 52 + i * 118;
        const py = r.y + 62;
        const t = slot.patty.t;
        const burnt = t >= GRILL.burnSeconds;
        drawIngredient(ctx, burnt ? 'patty' : 'patty-cooked', px, py, 30);
        if (burnt) {
          text(ctx, 'BURNT!', px, py - 40, 13, '#ff8a7a', 'center');
        } else {
          const frac = Math.min(1, t / GRILL.cookSeconds);
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          roundRect(ctx, px - 32, py + 34, 64, 8, 4); ctx.fill();
          ctx.fillStyle = t <= GRILL.perfectUntil ? '#58b368' : '#e8a13a';
          roundRect(ctx, px - 32, py + 34, 64 * frac, 8, 4); ctx.fill();
        }
      });
    }
    if (name === 'pantry') {
      ctx.fillStyle = P.steel;
      roundRect(ctx, r.x + 12, r.y + 12, r.w - 24, r.h - 48, 8);
      ctx.fill();
      ctx.fillStyle = P.steelDark;
      ctx.fillRect(r.x + 12, r.y + 12, r.w - 24, 8);
      const bins = ['bun', 'patty', 'tomato', 'lettuce', 'cheese'];
      bins.forEach((item, i) => {
        const bx = r.x + 22 + i * 28;
        drawIngredient(ctx, item, bx + 8, r.y + 52, 12);
        text(ctx, `${i + 1}`, bx + 8, r.y + 92, 13, P.text, 'center');
      });
      text(ctx, 'FRIDGE', cx, r.y + 132, 13, P.text, 'center');
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(r.x + 12, r.y + 108, r.w - 24, 2);
    }
    if (name === 'board') {
      ctx.fillStyle = P.board;
      roundRect(ctx, r.x + 18, r.y + 16, r.w - 36, r.h - 56, 8);
      ctx.fill();
      const chef = state.chef;
      if (chef.carrying && chef.carrying.kind === 'ingredient' && (chef.carrying.item === 'tomato' || chef.carrying.item === 'lettuce')) {
        drawIngredient(ctx, chef.carrying.item, cx, cy - 6, 22);
        for (let i = 0; i < 3; i += 1) {
          ctx.fillStyle = i < chef.chops ? '#2e7d32' : 'rgba(0,0,0,0.25)';
          ctx.beginPath(); ctx.arc(cx - 24 + i * 24, cy + 34, 7, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.font = `700 15px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('CHOP', cx, cy + 6);
      }
    }
    if (name === 'assembly') {
      if (state.hasPlateOnCounter) {
        drawPlate(ctx, cx, cy + 6, 52, state.plateOnCounter);
        if (state.plateOnCounter.length === 0) text(ctx, 'clean plate', cx, cy + 44, 12, P.muted, 'center');
      }
    }
    if (name === 'serve') {
      ctx.fillStyle = '#f7ead0';
      roundRect(ctx, r.x + 12, r.y + 12, r.w - 24, r.h - 52, 8);
      ctx.fill();
      ctx.fillStyle = P.accent;
      roundRect(ctx, r.x + 12, r.y + 12, r.w - 24, 26, 8);
      ctx.fill();
      text(ctx, 'PICK UP', cx, r.y + 31, 14, '#ffffff', 'center');
      text(ctx, 'Serve!', cx, r.y + 86, 16, '#8a6a3a', 'center');
    }
    if (name === 'trash') {
      ctx.fillStyle = '#5a6068';
      roundRect(ctx, r.x + 26, r.y + 14, r.w - 52, r.h - 46, 8);
      ctx.fill();
      ctx.fillStyle = '#d7dde3';
      ctx.fillRect(cx - 12, r.y + 30, 24, 4);
      ctx.fillStyle = '#9aa2ab';
      ctx.fillRect(cx - 9, r.y + 36, 18, 22);
    }
    text(ctx, r.label, cx, r.y + r.h - 8, 12, '#ffffff', 'center');
  }

  function drawOrders(state) {
    const y = 94;
    const w = 296;
    const gap = 12;
    text(ctx, 'ORDER BOARD', 24, 86, 15, P.text);
    if (state.orders.length === 0) {
      ctx.fillStyle = P.panel;
      roundRect(ctx, 16, y, 300, 66, 10); ctx.fill();
      ctx.strokeStyle = P.panelEdge; ctx.lineWidth = 2; ctx.stroke();
      text(ctx, 'No orders — breathe!', 30, y + 40, 15, P.muted);
      return;
    }
    state.orders.forEach((order, i) => {
      const x = 16 + i * (w + gap);
      const frac = Math.max(0, order.patience / order.maxPatience);
      const urgent = frac < 0.35;
      ctx.fillStyle = P.ticket;
      roundRect(ctx, x, y, w, 78, 10); ctx.fill();
      ctx.strokeStyle = urgent ? P.urgent : P.ticketEdge;
      ctx.lineWidth = urgent ? 3 : 2; ctx.stroke();
      text(ctx, `#${order.id + 1} ${order.recipe.name}`, x + 12, y + 22, 15, '#2b2118');
      order.recipe.items.forEach((item, j) => {
        drawIngredient(ctx, item, x + 24 + j * 34, y + 48, 13);
      });
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      roundRect(ctx, x + 12, y + 66, w - 24, 6, 3); ctx.fill();
      ctx.fillStyle = urgent ? '#c0392b' : frac < 0.6 ? '#e8a13a' : '#58b368';
      roundRect(ctx, x + 12, y + 66, (w - 24) * frac, 6, 3); ctx.fill();
    });
  }

  function drawChef(state) {
    const c = state.chef;
    ctx.save();
    if (state.shake > 0) ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(c.x, c.y + 18, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.chef;
    ctx.beginPath(); ctx.arc(c.x, c.y, CHEF.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.chefApron;
    ctx.beginPath(); ctx.arc(c.x, c.y + 8, 15, 0, Math.PI); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.chefSkin;
    ctx.beginPath(); ctx.arc(c.x, c.y - 4, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(c.x - 4.5, c.y - 6, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(c.x + 4.5, c.y - 6, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.chefHat;
    roundRect(ctx, c.x - 13, c.y - 30, 26, 12, 6); ctx.fill();
    ctx.beginPath(); ctx.arc(c.x - 8, c.y - 28, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(c.x, c.y - 31, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(c.x + 8, c.y - 28, 7, 0, Math.PI * 2); ctx.fill();
    const held = c.carrying;
    if (held) {
      if (held.kind === 'plate') {
        drawPlate(ctx, c.x, c.y - 52, 26, held.items);
      } else {
        drawIngredient(ctx, held.item, c.x, c.y - 48, 14);
        if ((held.item === 'tomato' || held.item === 'lettuce') && c.chops > 0) {
          for (let i = 0; i < 3; i += 1) {
            ctx.fillStyle = i < c.chops ? '#2e7d32' : 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.arc(c.x - 14 + i * 14, c.y - 68, 4, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    }
    ctx.restore();
  }

  function drawTopBar(state) {
    ctx.fillStyle = P.panel;
    ctx.fillRect(0, 0, FIELD.width, 64);
    ctx.fillStyle = P.panelEdge;
    ctx.fillRect(0, 62, FIELD.width, 2);
    text(ctx, 'SIZZLE & SERVE', 20, 42, 26, P.text);
    const frac = state.timeLeft / SHIFT_SECONDS;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRect(ctx, 330, 22, 300, 20, 10); ctx.fill();
    ctx.fillStyle = state.timeLeft <= 30 ? '#c0392b' : state.rush ? '#d94f2b' : '#58b368';
    roundRect(ctx, 330, 22, 300 * frac, 20, 10); ctx.fill();
    text(ctx, mmss(state.timeLeft), 480, 38, 15, '#ffffff', 'center');
    text(ctx, `$${state.coins}`, 660, 42, 24, P.text);
    text(ctx, `${state.served} served`, 780, 40, 15, P.muted);
    if (state.combo >= 2) text(ctx, `COMBO x${(1 + Math.min(1, state.combo * 0.1)).toFixed(1)} (${state.combo})`, 900, 40, 17, P.accent);
    let hx = 1060;
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < state.hearts ? '#d94f2b' : 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(hx + 6, 36, 7, 0, Math.PI * 2);
      ctx.arc(hx + 18, 36, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx, 38); ctx.lineTo(hx + 24, 38); ctx.lineTo(hx + 12, 52);
      ctx.closePath(); ctx.fill();
      hx += 30;
    }
    if (state.rush) {
      ctx.fillStyle = P.accent;
      roundRect(ctx, 1150, 16, 116, 32, 8); ctx.fill();
      text(ctx, 'RUSH!', 1208, 38, 16, '#ffffff', 'center');
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const f of state.floats) {
      ctx.globalAlpha = Math.min(1, f.life);
      text(ctx, f.text, f.x, f.y, 22, f.color, 'center');
    }
    ctx.globalAlpha = 1;
  }

  function drawToast(state) {
    if (state.time > state.toastUntil || !state.toast) return;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    roundRect(ctx, FIELD.width / 2 - 260, FIELD.height - 52, 520, 36, 18); ctx.fill();
    text(ctx, state.toast, FIELD.width / 2, FIELD.height - 28, 15, '#ffffff', 'center');
  }

  function drawHint(state, screen) {
    if (screen !== SCREEN_PLAY) return;
    const station = state.nearestStationName || '';
    const hints = {
      pantry: 'Pantry — press 1-5 to take: 1 Bun · 2 Patty · 3 Tomato · 4 Lettuce · 5 Cheese',
      board: 'Chopping board — press E 3x to chop the tomato / lettuce in your hand',
      grill: 'Grill — E puts a raw patty on, E again picks it up when cooked (watch the bar!)',
      assembly: 'Assembly — E stacks what you carry onto the plate, E empty-handed takes the plate',
      serve: 'Serve window — E serves the plate when it matches a ticket',
      trash: 'Trash — E dumps what you are carrying',
    };
    const hint = hints[station] || 'Move with WASD / arrows — click a station to walk to it — E interacts';
    text(ctx, hint, FIELD.width / 2, 196, 14, P.muted, 'center');
  }

  function drawWorld(state, screen) {
    drawFloor();
    drawOrders(state);
    for (const name of Object.keys(STATIONS)) drawStation(name, state);
    drawChef(state);
    drawParticles(state);
    drawTopBar(state);
    drawHint(state, screen);
    drawToast(state);
    if (state.serveFlash > 0) {
      ctx.fillStyle = `rgba(242,201,76,${state.serveFlash * 0.35})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  function drawTitle(state, best) {
    drawWorld(state, SCREEN_TITLE);
    ctx.fillStyle = 'rgba(20,12,6,0.68)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'SIZZLE & SERVE', FIELD.width / 2, 225, 64, '#fff7e6', 'center');
    text(ctx, 'Rush Hour Kitchen — chop it, grill it, stack it, serve it!', FIELD.width / 2, 272, 24, '#f2c94c', 'center');
    text(ctx, 'WASD / arrows move · E interacts · 1-5 pantry · click a station to walk there', FIELD.width / 2, 318, 18, '#ffffff', 'center');
    text(ctx, 'Serve every ticket before its patience runs out. 3 strikes and the shift ends!', FIELD.width / 2, 350, 18, '#ffffff', 'center');
    text(ctx, '▶  Press ENTER or click to start  (P pauses)', FIELD.width / 2, 408, 22, '#f2c94c', 'center');
    if (best > 0) text(ctx, `Best shift: $${best}`, FIELD.width / 2, 448, 18, '#ffffff', 'center');
  }

  function drawOver(state, best) {
    drawWorld(state, SCREEN_OVER);
    ctx.fillStyle = 'rgba(20,12,6,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const title = state.hearts <= 0 ? 'SHIFT OVER — the kitchen beat you!' : 'SHIFT COMPLETE!';
    text(ctx, title, FIELD.width / 2, 240, 44, '#fff7e6', 'center');
    text(ctx, `$${state.coins} earned  ·  ${state.served} dishes served  ·  best combo ${state.bestCombo}`, FIELD.width / 2, 300, 22, '#f2c94c', 'center');
    const grade = state.coins >= 150 ? 'S — Head Chef!' : state.coins >= 100 ? 'A — Sous Chef' : state.coins >= 60 ? 'B — Line Cook' : 'C — Keep practising';
    text(ctx, `Grade: ${grade}`, FIELD.width / 2, 350, 24, '#ffffff', 'center');
    if (state.coins >= best && state.coins > 0) text(ctx, '★ New best shift! ★', FIELD.width / 2, 392, 20, '#f2c94c', 'center');
    text(ctx, 'Press ENTER to play again', FIELD.width / 2, 450, 20, '#ffffff', 'center');
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(20,12,6,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'PAUSED', FIELD.width / 2, 350, 52, '#ffffff', 'center');
    text(ctx, 'Press P to keep cooking', FIELD.width / 2, 400, 20, '#f2c94c', 'center');
  }

  return {
    draw(state, screen, best) {
      ctx.clearRect(0, 0, FIELD.width, FIELD.height);
      ctx.save();
      const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
      ctx.scale(scale, scale);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_OVER) drawOver(state, best);
      else {
        drawWorld(state, screen);
        if (screen === SCREEN_PAUSED) drawPaused();
      }
      ctx.restore();
    },
    /** Re-measure helper for the toast width (kept tiny on purpose). */
    measure(str) { return ctx.measureText(str).width; },
  };
}

export { RECIPES, INGREDIENTS };
