"use client";
import { Card as UnoCard, Color } from "@/lib/uno";

export function CardView({ card, playable, onClick }: { card: UnoCard; playable?: boolean; onClick?: () => void }) {
  const { bg, text } = cardColors(card);
  const label = cardLabel(card);
  return (
    <button
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
        border: playable ? "3px solid #fff" : "2px solid #222",
        borderRadius: 12,
        padding: 8,
        width: 72,
        height: 104,
        background: bg,
        color: text,
        boxShadow: playable ? "0 0 10px rgba(255,255,255,0.7)" : "0 2px 6px rgba(0,0,0,0.3)",
        transform: playable ? "translateY(-2px)" : undefined,
      }}
      disabled={!onClick}
      aria-label={`card ${label}`}
    >
      <div style={{ fontWeight: 700, fontSize: 28, textAlign: "center" }}>{label}</div>
    </button>
  );
}

function cardLabel(card: UnoCard): string {
  switch (card.kind) {
    case "number":
      return String(card.value);
    case "skip":
      return "⦸";
    case "reverse":
      return "⟲";
    case "draw2":
      return "+2";
    case "wild":
      return "★";
    case "wild4":
      return "+4";
  }
}

function cardColors(card: UnoCard): { bg: string; text: string } {
  const colorToBg: Record<Color, string> = {
    red: "#e53935",
    yellow: "#fdd835",
    green: "#43a047",
    blue: "#1e88e5",
    wild: "linear-gradient(135deg,#e53935,#fdd835,#43a047,#1e88e5)",
  };
  const text = card.kind === "wild" || card.kind === "wild4" ? "#111" : "#fff";
  const bg =
    card.kind === "wild" || card.kind === "wild4"
      ? colorToBg.wild
      : colorToBg[card.color];
  return { bg, text };
}
