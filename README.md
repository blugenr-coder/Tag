# Color Tag

A simple real-time multiplayer tag game with 4+ color blobs, boosters, rooms, private codes, maps, dash, and scoreboard.

## Run locally

```bash
npm install
npm run build
npm run server
```

Then open:

```text
http://localhost:3000
```

## Important

This game uses WebSockets, so Netlify Drop by itself will not run the multiplayer server. Deploy the full project to a Node host like Render, Railway, Replit, or a VPS.

## Files included

- React frontend in `src/`
- WebSocket multiplayer server in `server/index.js`
- Vite config
- package.json
