export type Color = "red" | "yellow" | "green" | "blue" | "wild";
export type ColoredColor = Exclude<Color, "wild">;

export type Card =
  | { kind: "number"; color: ColoredColor; value: number }
  | { kind: "skip" | "reverse" | "draw2"; color: ColoredColor }
  | { kind: "wild" }
  | { kind: "wild4" };

export interface PlayerState {
  id: string;
  name: string;
  hand: Card[];
  saidUno: boolean;
}

export interface GameState {
  players: PlayerState[];
  playerOrder: string[]; // array of player ids in turn order
  currentTurnIndex: number; // index into playerOrder
  direction: 1 | -1;
  deck: Card[];
  discardPile: Card[];
  currentColor: Color | null; // active color, important after wild
  pendingDraw: number; // cards to draw for next player due to draw2/wild4
  started: boolean;
  winnerId?: string;
  seed?: string;
}

export function createInitialState(): GameState {
  return {
    players: [],
    playerOrder: [],
    currentTurnIndex: 0,
    direction: 1,
    deck: [],
    discardPile: [],
    currentColor: null,
    pendingDraw: 0,
    started: false,
  };
}

export function createDeck(): Card[] {
  const colors: ColoredColor[] = ["red", "yellow", "green", "blue"];
  const deck: Card[] = [];
  for (const color of colors) {
    deck.push({ kind: "number", color, value: 0 });
    for (let i = 1; i <= 9; i++) {
      deck.push({ kind: "number", color, value: i });
      deck.push({ kind: "number", color, value: i });
    }
    deck.push({ kind: "skip", color });
    deck.push({ kind: "skip", color });
    deck.push({ kind: "reverse", color });
    deck.push({ kind: "reverse", color });
    deck.push({ kind: "draw2", color });
    deck.push({ kind: "draw2", color });
  }
  for (let i = 0; i < 4; i++) deck.push({ kind: "wild" });
  for (let i = 0; i < 4; i++) deck.push({ kind: "wild4" });
  return deck;
}

export type RNG = () => number;

export function shuffleInPlace<T>(array: T[], rng: RNG): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function canPlayCard(card: Card, topCard: Card | null, currentColor: Color | null): boolean {
  if (!topCard) return true;
  if (card.kind === "wild" || card.kind === "wild4") return true;
  // If a color is enforced (after wild), allow matching color regardless of topCard
  if (currentColor && currentColor !== "wild") {
    if ("color" in card && card.color === currentColor) return true;
  }
  if (topCard.kind === "wild" || topCard.kind === "wild4") {
    // Match currentColor already handled above; otherwise any card allowed after setting color
    return !!("color" in card);
  }
  if ("color" in card && "color" in topCard && card.color === topCard.color) return true;
  if (card.kind === "number" && topCard.kind === "number" && card.value === topCard.value) return true;
  if ((card.kind === "skip" && topCard.kind === "skip") ||
      (card.kind === "reverse" && topCard.kind === "reverse") ||
      (card.kind === "draw2" && topCard.kind === "draw2")) return true;
  return false;
}

export function normalizeTurnIndex(state: GameState): number {
  const n = state.playerOrder.length;
  if (n === 0) return 0;
  let idx = state.currentTurnIndex % n;
  if (idx < 0) idx += n;
  return idx;
}

export function currentPlayerId(state: GameState): string | null {
  if (state.playerOrder.length === 0) return null;
  return state.playerOrder[normalizeTurnIndex(state)];
}

export function nextTurn(state: GameState, steps: number = 1): GameState {
  const copy: GameState = { ...state };
  copy.currentTurnIndex = normalizeTurnIndex({ ...copy, currentTurnIndex: copy.currentTurnIndex + copy.direction * steps });
  return copy;
}

function reshuffleIfNeeded(state: GameState): GameState {
  if (state.deck.length > 0) return state;
  if (state.discardPile.length <= 1) return state;
  const top = state.discardPile[state.discardPile.length - 1];
  const rest = state.discardPile.slice(0, -1);
  const rng = defaultRng(state.seed);
  const newDeck = [...rest];
  shuffleInPlace(newDeck, rng);
  return { ...state, deck: newDeck, discardPile: [top] };
}

export function startGame(state: GameState, seed: string): GameState {
  if (state.started) return state;
  const rng = defaultRng(seed);
  const deck = createDeck();
  shuffleInPlace(deck, rng);
  const players = state.players.map(p => ({ ...p, hand: [] as Card[] }));
  // Deal 7 cards each
  for (let r = 0; r < 7; r++) {
    for (const p of players) {
      const card = deck.shift();
      if (card) p.hand.push(card);
    }
  }
  // Flip first non-wild card to start if possible
  let first: Card | undefined = deck.shift();
  while (first && (first.kind === "wild" || first.kind === "wild4")) {
    deck.push(first);
    shuffleInPlace(deck, rng);
    first = deck.shift();
  }
  const discardPile: Card[] = first ? [first] : [];
  const currentColor: Color | null = first && ("color" in first) ? first.color : null;
  const order = players.map(p => p.id);
  return {
    ...state,
    players,
    playerOrder: order,
    currentTurnIndex: 0,
    direction: 1,
    deck,
    discardPile,
    currentColor,
    pendingDraw: 0,
    started: true,
    seed,
  };
}

function removeCardAt(hand: Card[], index: number): { newHand: Card[]; card?: Card } {
  if (index < 0 || index >= hand.length) return { newHand: hand.slice() };
  const newHand = hand.slice();
  const [card] = newHand.splice(index, 1);
  return { newHand, card };
}

export function playCard(state: GameState, playerId: string, cardIndex: number, chosenColor?: ColoredColor): GameState {
  if (!state.started || state.winnerId) return state;
  const currentId = currentPlayerId(state);
  if (playerId !== currentId) return state;
  const player = state.players.find(p => p.id === playerId);
  if (!player) return state;
  const top = state.discardPile[state.discardPile.length - 1] ?? null;
  const cardToPlay = player.hand[cardIndex];
  if (!cardToPlay) return state;

  // If there is a pending draw, player must draw instead of playing
  if (state.pendingDraw > 0) return state;

  if (!canPlayCard(cardToPlay, top, state.currentColor)) return state;
  const { newHand, card } = removeCardAt(player.hand, cardIndex);
  if (!card) return state;

  const newPlayers = state.players.map(p => (p.id === playerId ? { ...p, hand: newHand, saidUno: p.saidUno && newHand.length === 1 } : p));
  let newState: GameState = { ...state, players: newPlayers };

  // Place card on discard and compute effects
  const discardPile = [...newState.discardPile, card];
  let currentColor: Color | null = newState.currentColor;
  let direction = newState.direction;
  let pendingDraw = newState.pendingDraw;
  let turnAdvance = 1;

  if (card.kind === "number") {
    currentColor = card.color;
  } else if (card.kind === "skip") {
    currentColor = card.color;
    turnAdvance = 2; // skip next player
  } else if (card.kind === "reverse") {
    currentColor = card.color;
    if (newState.playerOrder.length === 2) {
      // Reverse acts like skip in 2-player game
      turnAdvance = 2;
    } else {
      direction = (direction * -1) as 1 | -1;
      turnAdvance = 1;
    }
  } else if (card.kind === "draw2") {
    currentColor = card.color;
    pendingDraw += 2;
    turnAdvance = 1; // next player will draw on their turn and be skipped in draw()
  } else if (card.kind === "wild") {
    currentColor = chosenColor ?? currentColor ?? null;
  } else if (card.kind === "wild4") {
    currentColor = chosenColor ?? currentColor ?? null;
    pendingDraw += 4;
  }

  newState = {
    ...newState,
    discardPile,
    currentColor,
    direction,
    pendingDraw,
  };

  // Check win
  const me = newState.players.find(p => p.id === playerId)!;
  if (me.hand.length === 0) {
    newState.winnerId = playerId;
    return newState;
  }

  // Advance turn
  newState = nextTurn(newState, turnAdvance);
  return newState;
}

export function draw(state: GameState, playerId: string): GameState {
  if (!state.started || state.winnerId) return state;
  const currentId = currentPlayerId(state);
  if (playerId !== currentId) return state;

  let newState = reshuffleIfNeeded(state);
  const drawCount = newState.pendingDraw > 0 ? newState.pendingDraw : 1;
  const player = newState.players.find(p => p.id === playerId);
  if (!player) return state;

  const newPlayers = newState.players.map(p => ({ ...p }));
  const me = newPlayers.find(p => p.id === playerId)!;

  for (let i = 0; i < drawCount; i++) {
    newState = reshuffleIfNeeded(newState);
    const next = newState.deck.shift();
    if (next) me.hand.push(next);
  }

  newState = { ...newState, players: newPlayers, pendingDraw: 0 };
  // After drawing due to penalty or normal draw, pass turn
  newState = nextTurn(newState, 1);
  return newState;
}

export function sayUno(state: GameState, playerId: string): GameState {
  const players = state.players.map(p => (p.id === playerId ? { ...p, saidUno: true } : p));
  return { ...state, players };
}

export function addOrUpdatePlayer(state: GameState, player: { id: string; name: string }): GameState {
  const existing = state.players.find(p => p.id === player.id);
  if (existing) {
    const players = state.players.map(p => (p.id === player.id ? { ...p, name: player.name } : p));
    const order = state.playerOrder.includes(player.id) ? state.playerOrder : [...state.playerOrder, player.id];
    return { ...state, players, playerOrder: order };
  }
  const players = [...state.players, { id: player.id, name: player.name, hand: [] as Card[], saidUno: false }];
  const order = [...state.playerOrder, player.id];
  return { ...state, players, playerOrder: order };
}

import seedrandom from "seedrandom";

export function defaultRng(seed?: string): RNG {
  const _seed = seed ?? Math.random().toString(36).slice(2);
  const rng = seedrandom(_seed);
  // Prefer quick() for speed if available
  const maybeQuick = (rng as unknown as { quick?: () => number }).quick;
  return () => (typeof maybeQuick === "function" ? maybeQuick.call(rng) : (rng as unknown as () => number)());
}
