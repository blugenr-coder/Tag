import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', 'dist');

const server = http.createServer((req, res) => {
  let file = path.join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!file.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
  if (!fs.existsSync(file)) file = path.join(root, 'index.html');
  const ext = path.extname(file);
  const type = ext === '.html' ? 'text/html' : ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ server, path: '/ws' });

const COLORS = ['red','blue','green','yellow','cyan','magenta','orange','lime'];
const COLOR_HEX = { red:'#ff3b6b', blue:'#3bc6ff', green:'#3bff8f', yellow:'#ffe53b', cyan:'#3bfff5', magenta:'#ff3bfa', orange:'#ff8c3b', lime:'#c5ff3b' };
const rooms = new Map();
const clients = new Map();

const rand = (min, max) => Math.random() * (max - min) + min;
const uid = () => Math.random().toString(36).slice(2, 10);
const code = () => Math.random().toString(36).slice(2, 6).toUpperCase();

function makeWalls(mapId, w, h) {
  if (mapId === 'maze') return [
    {x:180,y:90,w:30,h:310},{x:360,y:0,w:30,h:260},{x:540,y:170,w:30,h:310},
    {x:80,y:260,w:260,h:30},{x:420,y:120,w:260,h:30},{x:300,y:430,w:360,h:30}
  ];
  if (mapId === 'classic') return [
    {x:250,y:160,w:220,h:28},{x:250,y:360,w:220,h:28},{x:150,y:230,w:28,h:170},{x:550,y:230,w:28,h:170}
  ];
  return [];
}
function makeBouncers(mapId, w, h) {
  if (mapId === 'bounce') return [
    {id:uid(),x:w*.2,y:h*.2,r:42,strength:16},{id:uid(),x:w*.8,y:h*.2,r:42,strength:16},
    {id:uid(),x:w*.5,y:h*.5,r:52,strength:18},{id:uid(),x:w*.2,y:h*.8,r:42,strength:16},{id:uid(),x:w*.8,y:h*.8,r:42,strength:16}
  ];
  if (mapId === 'maze') return [{id:uid(),x:w*.5,y:h*.5,r:46,strength:15}];
  return [];
}
function makeRoom(opts, owner) {
  const custom = opts.mode === 'custom';
  const w = custom ? 980 : 760;
  const h = custom ? 640 : 540;
  const cfg = {
    mode: opts.mode, gameMode: opts.gameMode, maxPlayers: opts.maxPlayers, arenaWidth: w, arenaHeight: h,
    boosterMultiplier: custom ? 2 : 1, roundDuration: opts.roundDuration, fillWithBots: opts.fillWithBots,
    isPrivate: opts.isPrivate, numIt: opts.numIt, mapId: opts.mapId, totalRounds: opts.totalRounds
  };
  const room = {
    id: uid(), name: opts.roomName || `${owner.name}'s Room`, code: opts.isPrivate ? code() : undefined,
    config: cfg, players: [], inputs: new Map(), boosters: [], walls: makeWalls(opts.mapId, w, h), bouncers: makeBouncers(opts.mapId, w, h),
    status: 'waiting', currentRound: 1, startTime: Date.now(), loserId: undefined, lastTick: Date.now()
  };
  rooms.set(room.id, room);
  return room;
}
function summary(room) {
  return {
    id: room.id, name: room.name, mode: room.config.mode, gameMode: room.config.gameMode,
    players: room.players.filter(p => !p.isBot).length, maxPlayers: room.config.maxPlayers, status: room.status,
    hasBots: room.players.some(p=>p.isBot), isPrivate: room.config.isPrivate, code: room.code,
    currentRound: room.currentRound, totalRounds: room.config.totalRounds
  };
}
function lobbyList() {
  return [...rooms.values()].filter(r => !r.config.isPrivate).map(summary);
}
function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}
function broadcast(room, msg) {
  for (const p of room.players) {
    if (p.isBot) continue;
    const c = clients.get(p.id);
    if (c) send(c.ws, msg);
  }
}
function randomSpawn(room) {
  return { x: rand(60, room.config.arenaWidth-60), y: rand(60, room.config.arenaHeight-60) };
}
function addPlayer(room, client, isBot=false) {
  const pos = randomSpawn(room);
  const taken = new Set(room.players.map(p=>p.color));
  const color = COLORS.find(c=>!taken.has(c)) || COLORS[room.players.length % COLORS.length];
  const p = {
    id: isBot ? uid() : client.id, name: isBot ? `Bot ${room.players.length+1}` : client.name, color,
    x: pos.x, y: pos.y, isIt: false, itTime: 0, shield: false, speedBoost: false, frozen: false,
    alive: true, isBot, wins: 0, vx: 0, vy: 0, speedUntil: 0, frozenUntil: 0, dashCooldown: 0
  };
  room.players.push(p);
  room.inputs.set(p.id, {up:false,down:false,left:false,right:false,dash:false});
  if (room.players.filter(x=>x.isIt).length < room.config.numIt) p.isIt = true;
  client.roomId = room.id;
  if (!isBot) {
    send(client.ws, { type:'room_joined', roomId:room.id, roomName:room.name, selfId:client.id, arenaWidth:room.config.arenaWidth, arenaHeight:room.config.arenaHeight, walls:room.walls, bouncers:room.bouncers, config:room.config, code:room.code });
  }
  if (room.config.fillWithBots) fillBots(room);
  if (room.players.length >= 2) room.status = 'playing';
  room.startTime = Date.now();
}
function fillBots(room) {
  while (room.players.length < room.config.maxPlayers) addPlayer(room, {id:uid(),name:'Bot',ws:null,roomId:null}, true);
}
function roomState(room) {
  const elapsed = Math.floor((Date.now() - room.startTime)/1000);
  const timeRemaining = room.config.roundDuration > 0 ? Math.max(0, room.config.roundDuration - elapsed) : 999;
  return {
    players: room.players.map(({vx,vy,speedUntil,frozenUntil,dashCooldown,...p}) => p),
    boosters: room.boosters, walls: room.walls, bouncers: room.bouncers,
    arenaWidth: room.config.arenaWidth, arenaHeight: room.config.arenaHeight,
    status: room.status, currentRound: room.currentRound, timeRemaining, loserId: room.loserId, config: room.config
  };
}
function endRound(room) {
  room.status = 'ended';
  let loser = null;
  if (room.config.gameMode === 'deathmatch') {
    const alive = room.players.filter(p=>p.alive);
    if (alive[0]) alive[0].wins++;
    loser = room.players.find(p=>!p.alive) || null;
  } else {
    loser = [...room.players].sort((a,b)=>b.itTime-a.itTime)[0];
    const winner = [...room.players].sort((a,b)=>a.itTime-b.itTime)[0];
    if (winner) winner.wins++;
  }
  room.loserId = loser?.id;
}
function restart(room) {
  room.status = room.players.length >= 2 ? 'playing' : 'waiting';
  room.startTime = Date.now();
  room.loserId = undefined;
  room.boosters = [];
  room.currentRound = Math.min(room.currentRound + 1, room.config.totalRounds);
  room.players.forEach((p,i)=>{
    const pos=randomSpawn(room); p.x=pos.x; p.y=pos.y; p.vx=0; p.vy=0; p.alive=true; p.itTime=0; p.shield=false; p.speedBoost=false; p.frozen=false; p.isIt=i<room.config.numIt;
  });
}
function collideWalls(p, room) {
  const r = 22;
  p.x = Math.max(r, Math.min(room.config.arenaWidth-r, p.x));
  p.y = Math.max(r, Math.min(room.config.arenaHeight-r, p.y));
  for (const w of room.walls) {
    const cx = Math.max(w.x, Math.min(p.x, w.x+w.w));
    const cy = Math.max(w.y, Math.min(p.y, w.y+w.h));
    const dx = p.x-cx, dy=p.y-cy;
    const d = Math.hypot(dx,dy);
    if (d < r && d > 0) { p.x += (dx/d)*(r-d); p.y += (dy/d)*(r-d); }
  }
}
function spawnBoosters(room) {
  const max = 4 * room.config.boosterMultiplier;
  if (room.boosters.length >= max) return;
  if (Math.random() < 0.025) {
    const pos = randomSpawn(room);
    const types = ['speed','shield','dash','freeze'];
    room.boosters.push({id:uid(), type:types[Math.floor(Math.random()*types.length)], x:pos.x, y:pos.y});
  }
}
function tickRoom(room, dt) {
  const now = Date.now();
  if (room.status !== 'playing') return;
  spawnBoosters(room);
  for (const p of room.players) {
    if (!p.alive) continue;
    if (p.speedUntil && now > p.speedUntil) { p.speedBoost=false; p.speedUntil=0; }
    if (p.frozenUntil && now > p.frozenUntil) { p.frozen=false; p.frozenUntil=0; }
    if (p.isBot) {
      const target = room.players.find(x => x.id !== p.id && x.alive && (p.isIt || x.isIt));
      if (target) room.inputs.set(p.id, {up:target.y<p.y,down:target.y>p.y,left:target.x<p.x,right:target.x>p.x,dash:Math.random()<0.01});
    }
    const inp = room.inputs.get(p.id) || {};
    const speed = (p.speedBoost ? 5.1 : 3.4) * (p.frozen ? .35 : 1);
    let ax = 0, ay = 0;
    if (inp.up) ay -= 1; if (inp.down) ay += 1; if (inp.left) ax -= 1; if (inp.right) ax += 1;
    const len = Math.hypot(ax,ay) || 1;
    p.vx = (ax/len)*speed; p.vy = (ay/len)*speed;
    if (inp.dash && now > (p.dashCooldown||0)) { p.vx *= 9; p.vy *= 9; p.dashCooldown = now + 950; }
    p.x += p.vx; p.y += p.vy;
    collideWalls(p, room);
    for (const b of room.bouncers) {
      const dx=p.x-b.x, dy=p.y-b.y, d=Math.hypot(dx,dy)||1;
      if (d < b.r) { p.x += (dx/d)*b.strength; p.y += (dy/d)*b.strength; }
    }
    for (let i=room.boosters.length-1;i>=0;i--) {
      const b=room.boosters[i], d=Math.hypot(p.x-b.x,p.y-b.y);
      if (d < 34) {
        if (b.type==='speed') { p.speedBoost=true; p.speedUntil=now+5000; }
        if (b.type==='shield') p.shield=true;
        if (b.type==='dash') p.dashCooldown=0;
        if (b.type==='freeze') room.players.forEach(o=>{ if(o.id!==p.id && Math.hypot(o.x-p.x,o.y-p.y)<170){o.frozen=true;o.frozenUntil=now+2500;} });
        room.boosters.splice(i,1);
        broadcast(room,{type:'pickup',playerId:p.id,booster:b.type});
      }
    }
  }
  const its = room.players.filter(p=>p.isIt && p.alive);
  its.forEach(it => it.itTime += dt);
  for (const it of its) {
    for (const other of room.players) {
      if (!other.alive || other.id === it.id || other.isIt) continue;
      if (Math.hypot(it.x-other.x,it.y-other.y) < 44) {
        if (other.shield) { other.shield=false; continue; }
        if (room.config.gameMode === 'deathmatch') {
          other.alive=false; other.isIt=false;
          broadcast(room,{type:'tag',taggerId:it.id,victimId:other.id});
          if (room.players.filter(p=>p.alive).length <= 1) endRound(room);
        } else {
          it.isIt=false; other.isIt=true;
          broadcast(room,{type:'tag',taggerId:it.id,victimId:other.id});
        }
        break;
      }
    }
  }
  if (room.config.roundDuration > 0 && Date.now() - room.startTime >= room.config.roundDuration*1000) endRound(room);
}

wss.on('connection', ws => {
  const client = { id: uid(), name: 'Player', ws, roomId: null };
  clients.set(client.id, client);
  ws.on('message', raw => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === 'set_name') client.name = String(msg.name || 'Player').slice(0,16);
    if (msg.type === 'list_rooms') send(ws,{type:'lobby',rooms:lobbyList()});
    if (msg.type === 'create_room') {
      const room = makeRoom(msg, client);
      addPlayer(room, client, false);
      broadcastAllLobby();
    }
    if (msg.type === 'join_room') {
      const room = rooms.get(msg.roomId);
      if (!room) return send(ws,{type:'error',message:'Room not found'});
      if (room.players.filter(p=>!p.isBot).length >= room.config.maxPlayers) return send(ws,{type:'error',message:'Room is full'});
      addPlayer(room, client, false);
      broadcastAllLobby();
    }
    if (msg.type === 'join_by_code') {
      const room = [...rooms.values()].find(r => r.code === String(msg.code).toUpperCase());
      if (!room) return send(ws,{type:'error',message:'Invalid private code'});
      addPlayer(room, client, false);
      broadcastAllLobby();
    }
    if (msg.type === 'leave_room') leave(client);
    if (msg.type === 'input' && client.roomId) {
      const room=rooms.get(client.roomId); if(room) room.inputs.set(client.id, msg);
    }
    if (msg.type === 'restart' && client.roomId) {
      const room=rooms.get(client.roomId); if(room) restart(room);
    }
  });
  ws.on('close', () => { leave(client); clients.delete(client.id); });
});
function leave(client) {
  const room = client.roomId ? rooms.get(client.roomId) : null;
  if (!room) return;
  room.players = room.players.filter(p => p.id !== client.id);
  room.inputs.delete(client.id);
  client.roomId=null;
  send(client.ws,{type:'room_left'});
  if (room.players.filter(p=>!p.isBot).length === 0) rooms.delete(room.id);
  else if (!room.players.some(p=>p.isIt && p.alive) && room.players[0]) room.players[0].isIt=true;
  broadcastAllLobby();
}
function broadcastAllLobby() {
  for (const c of clients.values()) if (!c.roomId) send(c.ws,{type:'lobby',rooms:lobbyList()});
}
setInterval(()=>{
  const now=Date.now();
  for (const room of rooms.values()) {
    const dt = now - room.lastTick; room.lastTick = now;
    tickRoom(room, dt);
    broadcast(room,{type:'state',state:roomState(room)});
  }
}, 33);

server.listen(PORT, () => console.log(`Color Tag running on http://localhost:${PORT}`));
