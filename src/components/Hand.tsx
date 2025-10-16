"use client";
import { Card as UnoCard } from "@/lib/uno";
import { CardView } from "./Card";

export function Hand({ cards, playableFlags, onPlay }: { cards: UnoCard[]; playableFlags: boolean[]; onPlay: (index: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {cards.map((c, i) => (
        <div key={i} style={{ display: "inline-block" }}>
          <CardView card={c} playable={!!playableFlags[i]} onClick={playableFlags[i] ? () => onPlay(i) : undefined} />
        </div>
      ))}
    </div>
  );
}
