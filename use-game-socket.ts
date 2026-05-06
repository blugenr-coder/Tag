import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  Bouncer, ClientMessage, GameMode, GameState, MapId, RoomConfig, RoomMode,
  RoomSummary, ServerMessage, Wall,
} from './game-types.js';

export interface JoinedRoom {
  roomId: string; roomName: string; config: RoomConfig; walls: Wall[]; bouncers: Bouncer[]; code?: string;
}

export interface ConnectionState {
  connected: boolean; rooms: RoomSummary[]; joinedRoom: JoinedRoom | null; state: GameState | null;
  selfId: string | null; error: string | null; flashes: { x: number; y: number; color: string; born: number }[];
  setName: (name: string) => void;
  createRoom: (opts: { roomName: string; mode: RoomMode; gameMode: GameMode; maxPlayers: number; isPrivate: boolean; roundDuration: number; numIt: number; mapId: MapId; totalRounds: number; }) => void;
  joinRoom: (roomId: string) => void; joinByCode: (code: string) => void; leaveRoom: () => void; refreshRooms: () => void;
  sendInput: (input: { up: boolean; down: boolean; left: boolean; right: boolean; dash: boolean }) => void;
  restart: () => void;
}

export function useGameSocket(name: string | null): ConnectionState {
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [joinedRoom, setJoinedRoom] = useState<JoinedRoom | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flashes, setFlashes] = useState<ConnectionState['flashes']>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const sendMsg = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(msg));
  }, []);

  useEffect(() => {
    if (!name) return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'set_name', name } satisfies ClientMessage));
      ws.send(JSON.stringify({ type: 'list_rooms' } satisfies ClientMessage));
    };

    ws.onmessage = (ev) => {
      let msg: ServerMessage | any;
      try { msg = JSON.parse(ev.data); } catch { return; }

      if (msg.type === 'lobby') setRooms(msg.rooms);
      else if (msg.type === 'room_joined') {
        setJoinedRoom({ roomId: msg.roomId, roomName: msg.roomName, config: msg.config, walls: msg.walls, bouncers: msg.bouncers, code: msg.code });
        setSelfId(msg.selfId);
        setError(null);
      } else if (msg.type === 'room_left') {
        setJoinedRoom(null); setSelfId(null); setState(null);
      } else if (msg.type === 'state') {
        setState(msg.state);
        (window as unknown as { __ctState?: GameState }).__ctState = msg.state;
      } else if (msg.type === 'tag') {
        const stRef = (window as unknown as { __ctState?: GameState }).__ctState;
        const victim = stRef?.players.find((p) => p.id === msg.victimId);
        if (victim) setFlashes((prev) => [...prev.filter((f) => performance.now() - f.born < 800), { x: victim.x, y: victim.y, color: '#ffffff', born: performance.now() }]);
      } else if (msg.type === 'error') setError(msg.message);
      else if (msg.type === 'room_code' && msg.code) setJoinedRoom((prev) => prev ? { ...prev, code: msg.code } : prev);
    };

    ws.onclose = () => setConnected(false);
    return () => { ws.close(); wsRef.current = null; };
  }, [name]);

  const setNameMsg = useCallback((n: string) => sendMsg({ type: 'set_name', name: n }), [sendMsg]);
  const createRoom = useCallback((opts: Parameters<ConnectionState['createRoom']>[0]) => sendMsg({ type: 'create_room', ...opts, fillWithBots: true }), [sendMsg]);
  const joinRoom = useCallback((roomId: string) => sendMsg({ type: 'join_room', roomId }), [sendMsg]);
  const joinByCode = useCallback((code: string) => sendMsg({ type: 'join_by_code', code }), [sendMsg]);
  const leaveRoom = useCallback(() => sendMsg({ type: 'leave_room' }), [sendMsg]);
  const refreshRooms = useCallback(() => sendMsg({ type: 'list_rooms' }), [sendMsg]);
  const sendInput = useCallback((input: Parameters<ConnectionState['sendInput']>[0]) => sendMsg({ type: 'input', ...input }), [sendMsg]);
  const restart = useCallback(() => sendMsg({ type: 'restart' }), [sendMsg]);

  return { connected, rooms, joinedRoom, state, selfId, error, flashes, setName: setNameMsg, createRoom, joinRoom, joinByCode, leaveRoom, refreshRooms, sendInput, restart };
}
