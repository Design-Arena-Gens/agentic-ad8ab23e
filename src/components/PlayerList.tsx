"use client";
import { GameState } from "@/lib/uno";

export function PlayerList({ state }: { state: GameState }) {
  const currentId = state.playerOrder[state.currentTurnIndex] ?? null;
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {state.players.map((p) => (
        <div
          key={p.id}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #444",
            background: p.id === currentId ? "#2e7d32" : "#222",
          }}
        >
          <div style={{ fontWeight: 700 }}>{p.name}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{p.hand.length} cards</div>
          {p.saidUno && p.hand.length === 1 ? (
            <div style={{ fontSize: 12, color: "#ffeb3b" }}>UNO!</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
