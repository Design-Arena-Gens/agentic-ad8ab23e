"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { nanoid } from "nanoid";
import { usePlayerIdentity, useYSharedState } from "@/lib/yjsClient";
import type { GameState, Card, ColoredColor } from "@/lib/uno";
import { addOrUpdatePlayer, canPlayCard, createInitialState, draw, playCard, sayUno, startGame } from "@/lib/uno";
import { CardView } from "@/components/Card";
import { Hand } from "@/components/Hand";
import { PlayerList } from "@/components/PlayerList";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = (params?.roomId ?? "").toString();
  const { playerId, name, setName } = usePlayerIdentity("Player");

  const { state, setState, ready } = useYSharedState<GameState>(roomId, "game", createInitialState());

  useEffect(() => {
    if (!ready) return;
    setState((prev) => addOrUpdatePlayer(prev, { id: playerId, name }));
  }, [ready, playerId, name, setState]);

  const me = state.players.find((p) => p.id === playerId) ?? null;
  const topCard: Card | null = state.discardPile[state.discardPile.length - 1] ?? null;

  const playableFlags = useMemo(() => {
    if (!me) return [] as boolean[];
    if (state.pendingDraw > 0) return me.hand.map(() => false);
    return me.hand.map((c) => canPlayCard(c, topCard, state.currentColor));
  }, [me, state.pendingDraw, state.currentColor, topCard]);

  const [wildIndex, setWildIndex] = useState<number | null>(null);

  const handlePlay = (index: number) => {
    if (!me) return;
    const card = me.hand[index];
    if (!card) return;
    if (card.kind === "wild" || card.kind === "wild4") {
      setWildIndex(index);
      return;
    }
    setState((prev) => playCard(prev, playerId, index));
  };

  const handleChooseColor = (color: ColoredColor) => {
    if (wildIndex == null) return;
    setState((prev) => playCard(prev, playerId, wildIndex, color));
    setWildIndex(null);
  };

  const handleDraw = () => setState((prev) => draw(prev, playerId));
  const handleSayUno = () => setState((prev) => sayUno(prev, playerId));
  const handleStart = () => setState((prev) => startGame(prev, prev.seed ?? nanoid(10)));

  return (
    <div style={{ maxWidth: 1000, margin: "24px auto", padding: 16, display: "grid", gap: 16 }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Room {roomId}</h2>
          <span style={{ opacity: 0.7, fontSize: 12 }}>You are {playerId.slice(0, 6)}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #444", background: "#111", color: "#fff" }}
          />
          {!state.started ? (
            <button
              onClick={handleStart}
              disabled={state.players.length < 2}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #444", background: state.players.length >= 2 ? "#1565c0" : "#333", color: "#fff", fontWeight: 700 }}
            >
              Start Game
            </button>
          ) : null}
        </div>
      </header>

      <PlayerList state={state} />

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ padding: 12, border: "1px solid #444", borderRadius: 8 }}>
          <h3 style={{ marginBottom: 8 }}>Table</h3>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Top Discard</div>
              <div>{topCard ? <CardView card={topCard} /> : <div style={{ opacity: 0.6 }}>—</div>}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Current Color</div>
              <div style={{ fontWeight: 700 }}>{state.currentColor ?? "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Deck</div>
              <div style={{ fontWeight: 700 }}>{state.deck.length}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Pending Draw</div>
              <div style={{ fontWeight: 700 }}>{state.pendingDraw}</div>
            </div>
            {state.winnerId ? (
              <div style={{ marginLeft: "auto", padding: "6px 10px", borderRadius: 8, background: "#2e7d32", fontWeight: 800 }}>
                Winner: {state.players.find((p) => p.id === state.winnerId)?.name ?? state.winnerId}
              </div>
            ) : null}
          </div>
        </div>
        <div style={{ padding: 12, border: "1px solid #444", borderRadius: 8 }}>
          <h3 style={{ marginBottom: 8 }}>Your Hand</h3>
          {me ? (
            <>
              <Hand cards={me.hand} playableFlags={playableFlags} onPlay={handlePlay} />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={handleDraw} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #444", background: "#333", color: "#fff" }}>Draw</button>
                <button onClick={handleSayUno} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #fdd835", background: "#fdd835", color: "#111", fontWeight: 800 }}>Say UNO</button>
              </div>
            </>
          ) : (
            <div style={{ opacity: 0.7 }}>Joining…</div>
          )}
        </div>
      </section>

      {wildIndex != null ? (
        <ColorChooser onChoose={handleChooseColor} onCancel={() => setWildIndex(null)} />
      ) : null}
    </div>
  );
}

function ColorChooser({ onChoose, onCancel }: { onChoose: (c: ColoredColor) => void; onCancel: () => void }) {
  const colors: { c: ColoredColor; label: string; bg: string }[] = [
    { c: "red", label: "Red", bg: "#e53935" },
    { c: "yellow", label: "Yellow", bg: "#fdd835" },
    { c: "green", label: "Green", bg: "#43a047" },
    { c: "blue", label: "Blue", bg: "#1e88e5" },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center" }}>
      <div style={{ background: "#111", border: "1px solid #444", borderRadius: 10, padding: 16, minWidth: 280 }}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Choose a color</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {colors.map((x) => (
            <button key={x.c} onClick={() => onChoose(x.c)} style={{ padding: 12, borderRadius: 8, border: "1px solid #333", background: x.bg, color: x.c === "yellow" ? "#111" : "#fff", fontWeight: 800 }}>
              {x.label}
            </button>
          ))}
        </div>
        <div style={{ textAlign: "right", marginTop: 12 }}>
          <button onClick={onCancel} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #444", background: "#222", color: "#fff" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
