"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { usePlayerIdentity } from "@/lib/yjsClient";

export default function Home() {
  const router = useRouter();
  const { name, setName } = usePlayerIdentity("Player");
  const [roomId, setRoomId] = useState(() => nanoid(6));

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Multiplayer UNO</h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>Create a room or join an existing one to play UNO with friends in realtime.</p>
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, opacity: 0.8 }}>Display name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            style={{ padding: 10, borderRadius: 8, border: "1px solid #444", background: "#111", color: "#fff" }}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, opacity: 0.8 }}>Room ID</span>
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.trim())}
            placeholder="e.g. ABC123"
            style={{ padding: 10, borderRadius: 8, border: "1px solid #444", background: "#111", color: "#fff", textTransform: "uppercase" }}
          />
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => router.push(`/room/${roomId}`)}
            style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #444", background: "#2e7d32", color: "#fff", fontWeight: 700 }}
          >
            Join Room
          </button>
          <button
            onClick={() => setRoomId(nanoid(6))}
            style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #444", background: "#333", color: "#fff" }}
          >
            New Room ID
          </button>
        </div>
      </div>
      <div style={{ marginTop: 24, fontSize: 12, opacity: 0.7 }}>
        Share the room URL with friends. Everyone joining will appear in the lobby.
      </div>
    </div>
  );
}
