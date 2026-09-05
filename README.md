# MARODIKRO ARENA — READY TO DEPLOY

This is a browser multiplayer game.

## Easiest final setup

Deploy this folder as a Node.js WebSocket web service. `render.yaml` is included to make deployment easier on services that support Render Blueprint files.

After deployment, you get ONE HTTPS website address. Both players open that same address and enter the same room code.

## Game rules

DAYAL = 1 hit to eliminate.
MARODIKRO = 5 hits to eliminate.

## Current version

This is a playable prototype. It has:
- 2-player room code
- real-time movement synchronization
- live firing events
- server-side HP and round state
- automatic rematch
- live clock
- responsive UI

For a polished public release, add authoritative server-side aiming/collision, reconnect handling, anti-cheat/rate limiting, matchmaking, sound, sprites, mobile controls, and persistent statistics.
