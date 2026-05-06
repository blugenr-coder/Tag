export type ColorName = 'red' | 'blue' | 'green' | 'yellow' | 'cyan' | 'magenta' | 'orange' | 'lime';
export type BoosterType = 'speed' | 'shield' | 'dash' | 'freeze';
export type RoomMode = 'standard' | 'custom';
export type MapId = 'classic' | 'bounce' | 'maze';
export type GameMode = 'tag' | 'deathmatch';

export interface PlayerState {
  id: string; name: string; color: ColorName; x: number; y: number;
  isIt: boolean; itTime: number; shield: boolean; speedBoost: boolean;
  frozen: boolean; alive: boolean; isBot: boolean; wins: number;
}
export interface BoosterState { id: string; type: BoosterType; x: number; y: number; }
export interface Wall { x: number; y: number; w: number; h: number; }
export interface Bouncer { id: string; x: number; y: number; r: number; strength: number; }

export interface RoomConfig {
  mode: RoomMode; gameMode: GameMode; maxPlayers: number; arenaWidth: number; arenaHeight: number;
  boosterMultiplier: number; roundDuration: number; fillWithBots: boolean; isPrivate: boolean;
  numIt: number; mapId: MapId; totalRounds: number;
}
export interface RoomSummary {
  id: string; name: string; mode: RoomMode; gameMode: GameMode; players: number; maxPlayers: number;
  status: 'waiting' | 'playing' | 'ended'; hasBots: boolean; isPrivate: boolean; code?: string;
  currentRound: number; totalRounds: number;
}
export interface GameState {
  players: PlayerState[]; boosters: BoosterState[]; walls: Wall[]; bouncers: Bouncer[];
  arenaWidth: number; arenaHeight: number; status: 'waiting' | 'playing' | 'ended';
  currentRound: number; timeRemaining: number; loserId?: string; config: RoomConfig;
}
export type ClientMessage =
  | { type: 'set_name'; name: string }
  | { type: 'create_room'; roomName: string; mode: RoomMode; gameMode: GameMode; maxPlayers: number; fillWithBots: boolean; isPrivate: boolean; roundDuration: number; numIt: number; mapId: MapId; totalRounds: number }
  | { type: 'join_room'; roomId: string }
  | { type: 'join_by_code'; code: string }
  | { type: 'leave_room' }
  | { type: 'list_rooms' }
  | { type: 'input'; up: boolean; down: boolean; left: boolean; right: boolean; dash: boolean }
  | { type: 'restart' };

export type ServerMessage =
  | { type: 'lobby'; rooms: RoomSummary[] }
  | { type: 'room_joined'; roomId: string; roomName: string; selfId: string; arenaWidth: number; arenaHeight: number; walls: Wall[]; bouncers: Bouncer[]; config: RoomConfig }
  | { type: 'room_left' }
  | { type: 'state'; state: GameState }
  | { type: 'tag'; taggerId: string; victimId: string }
  | { type: 'pickup'; playerId: string; booster: BoosterType }
  | { type: 'error'; message: string };

export const COLOR_HEX: Record<ColorName, string> = {
  red: '#ff3b6b', blue: '#3bc6ff', green: '#3bff8f', yellow: '#ffe53b',
  cyan: '#3bfff5', magenta: '#ff3bfa', orange: '#ff8c3b', lime: '#c5ff3b',
};

export const MAP_INFO: Record<MapId, { label: string; desc: string }> = {
  classic: { label: '🏟 Classic', desc: 'Balanced walls, no bouncers' },
  bounce: { label: '🪃 Bounce', desc: 'Open map with launcher pads' },
  maze: { label: '🌀 Maze', desc: 'Dense corridors + centre launcher' },
};
