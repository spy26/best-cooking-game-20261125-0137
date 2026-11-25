// Sizzle & Serve — every tuning number and colour in one place.
// Logical playfield is 1280x720; the renderer scales it to the window.
export const FIELD = { width: 1280, height: 720 };

/** Fixed simulation step: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

/** Length of one shift, in seconds. */
export const SHIFT_SECONDS = 180;

export const CHEF = { radius: 22, speed: 330, interactRadius: 78 };

export const HEARTS = 3;

/** Seconds an order waits before it walks out (shorter during rush). */
export const ORDER_PATIENCE = 75;
export const ORDER_PATIENCE_RUSH = 58;

/** Seconds between new orders; rush makes the kitchen busier. */
export const ORDER_EVERY = 14;
export const ORDER_EVERY_RUSH = 9;
export const MAX_ORDERS = 4;

/** Rush hour starts when this many seconds are left on the shift clock. */
export const RUSH_AT_REMAINING = 60;

/** Grill timing: patty is cooked, then perfect, then burnt. */
export const GRILL = { cookSeconds: 6, perfectUntil: 9.5, burnSeconds: 12, slots: 2 };

/** Chops needed to turn a whole tomato / lettuce into a usable slice. */
export const CHOPS_NEEDED = 3;

/** Coins: base per serve + per ingredient + tip for fast service. */
export const PAY = { base: 8, perItem: 2, maxTip: 6 };

/** Combo multiplier grows with consecutive serves, resets on an expired order. */
export const COMBO = { step: 0.1, max: 2.0 };

export const INGREDIENTS = {
  bun: { key: 'bun', label: 'Bun', num: '1' },
  patty: { key: 'patty', label: 'Patty', num: '2' },
  tomato: { key: 'tomato', label: 'Tomato', num: '3' },
  lettuce: { key: 'lettuce', label: 'Lettuce', num: '4' },
  cheese: { key: 'cheese', label: 'Cheese', num: '5' },
};

export const INGREDIENT_ORDER = ['bun', 'patty', 'tomato', 'lettuce', 'cheese'];

/** Recipes: name, items in stacking order (bottom to top), coin bonus. */
export const RECIPES = [
  { id: 'classic', name: 'Classic Burger', items: ['bun', 'patty', 'lettuce'], bonus: 0 },
  { id: 'cheese', name: 'Cheese Melt', items: ['bun', 'patty', 'cheese', 'tomato'], bonus: 2 },
  { id: 'garden', name: 'Garden Fresh', items: ['bun', 'lettuce', 'tomato', 'cheese'], bonus: 2 },
  { id: 'double', name: 'Double Stack', items: ['bun', 'patty', 'patty', 'cheese'], bonus: 4 },
  { id: 'special', name: 'Sizzle Special', items: ['bun', 'patty', 'lettuce', 'tomato', 'cheese'], bonus: 6 },
];

/** Kitchen stations: where they sit, how big they are, what they do. */
export const STATIONS = {
  pantry: { x: 24, y: 300, w: 168, h: 220, label: 'PANTRY', hint: '1-5 take ingredient' },
  board: { x: 236, y: 300, w: 190, h: 150, label: 'CHOPPING BOARD', hint: 'E chops x3' },
  grill: { x: 470, y: 300, w: 230, h: 150, label: 'GRILL', hint: 'E puts patty on / takes off' },
  assembly: { x: 744, y: 300, w: 210, h: 150, label: 'ASSEMBLY', hint: 'E takes a clean plate' },
  serve: { x: 998, y: 300, w: 258, h: 150, label: 'SERVE WINDOW', hint: 'E serves the dish' },
  trash: { x: 1150, y: 560, w: 120, h: 90, label: 'TRASH', hint: 'E dumps the plate' },
};

/** Chef spawn point, on the floor between the stations. */
export const SPAWN = { x: 640, y: 620 };

export const THEMES = {
  bistro: {
    floor: '#c98d5a', floorDark: '#b57a48', floorLine: '#a96f3e',
    wall: '#f3e3c8', wallTrim: '#d9b380',
    counter: '#8a5a2e', counterTop: '#a9713d', counterEdge: '#6e4522',
    steel: '#b9c0c7', steelDark: '#8d959d',
    board: '#e8c890', grill: '#3a3f46', grillHot: '#c0392b',
    panel: '#fff7e6', panelEdge: '#d9b380',
    text: '#2b2118', muted: '#7a6a58', accent: '#d94f2b', gold: '#e8a13a',
    ticket: '#fffdf5', ticketEdge: '#c9a86a', urgent: '#c0392b',
    chef: '#ffffff', chefHat: '#f5f5f5', chefSkin: '#f0c08a', chefApron: '#2e86c1',
  },
  midnight: {
    floor: '#232a3d', floorDark: '#1c2333', floorLine: '#161c2a',
    wall: '#2e3650', wallTrim: '#4a5578',
    counter: '#3d4a6b', counterTop: '#4d5c82', counterEdge: '#2c3550',
    steel: '#7d8aa5', steelDark: '#5a6a86',
    board: '#8a7a5a', grill: '#14161d', grillHot: '#e74c3c',
    panel: '#2b3247', panelEdge: '#4a5578',
    text: '#e8ecf5', muted: '#9aa5c0', accent: '#ff6b4a', gold: '#f2c94c',
    ticket: '#f5f1e6', ticketEdge: '#8a7a5a', urgent: '#e74c3c',
    chef: '#ffffff', chefHat: '#f5f5f5', chefSkin: '#f0c08a', chefApron: '#e74c3c',
  },
  mint: {
    floor: '#bfe3c6', floorDark: '#a8d6b2', floorLine: '#93c8a0',
    wall: '#eef7ee', wallTrim: '#b5d9bd',
    counter: '#7fb08a', counterTop: '#95c49e', counterEdge: '#5f8f6b',
    steel: '#c3d2cc', steelDark: '#9db3a9',
    board: '#f0dfae', grill: '#4a5560', grillHot: '#d94f2b',
    panel: '#ffffff', panelEdge: '#b5d9bd',
    text: '#22382a', muted: '#6b8a72', accent: '#d94f2b', gold: '#e8a13a',
    ticket: '#fffef8', ticketEdge: '#b5d9bd', urgent: '#c0392b',
    chef: '#ffffff', chefHat: '#f5f5f5', chefSkin: '#f0c08a', chefApron: '#27ae60',
  },
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'sizzle-and-serve.best';
