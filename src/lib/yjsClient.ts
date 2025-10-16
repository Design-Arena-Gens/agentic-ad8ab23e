"use client";
import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
// y-webrtc has ESM/CJS differences; import dynamically in client
import { nanoid } from "nanoid";

export interface YStateHandle<T> {
  state: T;
  setState: (updater: (prev: T) => T) => void;
  doc: Y.Doc;
  provider: unknown | null;
  ready: boolean;
  playerId: string;
}

function getLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function usePlayerIdentity(defaultName: string): { playerId: string; name: string; setName: (n: string) => void } {
  const [playerId] = useState(() => getLocal("uno_player_id", nanoid()));
  const [name, setName] = useState(() => getLocal("uno_player_name", defaultName));
  useEffect(() => {
    setLocal("uno_player_id", playerId);
  }, [playerId]);
  useEffect(() => {
    setLocal("uno_player_name", name);
  }, [name]);
  return { playerId, name, setName };
}

export function useYSharedState<T>(roomId: string, key: string, initial: T): YStateHandle<T> {
  const [provider, setProvider] = useState<unknown | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setStateValue] = useState<T>(initial);
  const mapRef = useRef<Y.Map<unknown> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const doc = new Y.Doc();
    docRef.current = doc;
    let providerInstance: { destroy?: () => void } | null = null;
    (async () => {
      const { WebrtcProvider } = await import("y-webrtc");
      providerInstance = new WebrtcProvider(`uno-${roomId}`, doc, {
        signaling: [
          "wss://signaling.yjs.dev",
          "wss://y-webrtc-signaling-eu.herokuapp.com",
          "wss://y-webrtc-signaling-us.herokuapp.com",
        ],
        // password: undefined,
        peerOpts: { trickle: true },
      } as unknown as Record<string, unknown>);
      setProvider(providerInstance);
      setReady(true);
    })();

    return () => {
      try { providerInstance?.destroy?.(); } catch {}
      try { doc.destroy(); } catch {}
    };
  }, [roomId]);

  useEffect(() => {
    if (!docRef.current) return;
    const doc = docRef.current;
    const map = doc.getMap<unknown>("state");
    mapRef.current = map as Y.Map<unknown>;
    const updateFromDoc = () => {
      const next = (map.get(key) as T) ?? initial;
      setStateValue(next);
    };
    const observer = () => {
      updateFromDoc();
    };
    // Initialize
    if (!map.has(key)) {
      doc.transact(() => {
        map.set(key, initial as unknown);
      });
    } else {
      updateFromDoc();
    }
    map.observe(observer);
    return () => {
      map.unobserve(observer);
    };
  }, [ready, key, initial]);

  const setState = (updater: (prev: T) => T) => {
    const doc = docRef.current;
    const map = mapRef.current;
    if (!doc || !map) return;
    const prev = (map.get(key) as T) ?? initial;
    const next = updater(prev);
    doc.transact(() => {
      map.set(key, next as unknown);
    });
  };

  return { state, setState, doc: docRef.current ?? new Y.Doc(), provider, ready, playerId: getLocal("uno_player_id", nanoid()) };
}
