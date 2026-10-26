# Project instructions

This is a static browser game with no build step (Three.js loaded from a CDN):

- `index.html` — markup/HUD only
- `style.css` — all styling
- `game.js` — the game module (ES module, imported by `index.html`)
- `multiplayer.js` — cross-tab networking (BroadcastChannel, localStorage fallback)

## Multiplayer

Two transports run at once:

1. **Same browser** — `BroadcastChannel` (localStorage events as a fallback).
2. **Internet** — MQTT over WebSocket through public brokers, so two different
   computers can play together. No account or server of your own is needed.

`multiplayer.js` joins every broker in `BROKERS` and publishes on all of them,
so two computers only need one broker that both can reach. Every message has a
unique `mid`, so copies arriving over two channels are only handled once.

- `hello` / `state` / `hit` / `bye` / `duel-*` messages
- state is sent 10x per second locally and 5x per second over the internet
- a background tab also sends state every 0.8s (`setInterval`), because its
  `requestAnimationFrame` loop is paused and the other tab would otherwise
  lose track of it
- each tab stores `beathim-client-id`, `beathim-skin` and `beathim-name` in
  `sessionStorage`, so a reload keeps the same identity
- on load a display-name gate (`#nameGate`) asks for a name, pre-filled with the
  one this tab used last time; renaming re-sends `hello` + `state` so other
  players' name tags update
- skins are re-rolled automatically if two tabs pick the same one
- remote players fade out after ~20s without a state message
- shots/hits are relayed; each tab owns its own HP and respawns
- bots are still simulated per tab (they are not synced)

URL options:

- default room is `main`; `?room=whatever` isolates a private session
- `?nolocal=1` ignores same-browser tabs, useful to test the internet relay

The lobby list header shows the connection state: `ONLINE · MAIN`, `CONNECTING…`
or `LOCAL ONLY` (relay unreachable — only tabs in the same browser will see you).

### PVP duels

The lobby shows a player list (`#lobbyPlayerList`). Clicking `PVP` there — or
clicking a player's floating name tag in the lobby — sends a `duel-invite`
straight away; the challenger only asks, they don't configure anything. The
other tab gets an ACCEPT / DECLINE popup (`#duelPrompt`).

- ACCEPT opens `#duelSetup`, two steps: the accepting player picks a map
  (Arena / Battleground) and one or more weapons (AR, sniper, handgun, fists,
  scythe), then the challenger picks their own map and weapons
- if the map choices differ, the challenger performs one 50/50 coin flip and
  sends the final map to both clients; each player keeps their own chosen
  weapon pool, and number keys 1-5 switch within that pool
- the match runs on the resolved map with `duel.active` on: no bots, first to 5
  kills
- spawns are picked from the client ids (z = +18 on Arena, ±24 on Battleground)
  so the two players always start at opposite ends facing each other
- each side counts its own deaths and reports them in `state`; the score is
  derived from the opponent's death count, so a dropped packet can never leave
  the two scoreboards disagreeing
- `duel-end` returns both tabs to the lobby, as do disconnects (15s without a
  state message) and the `LEAVE PVP` button

## Always push changes

After any change to this project, commit and push it to GitHub:

```
git add -A
git commit -m "<short description of the change>"
git push
```

- Remote: `origin` -> `git@github.com:danielhuang-111/Rivals.git`
- Branch: `main` (tracked)
- Authentication is configured via SSH (`~/.ssh/id_ed25519`).

## Testing

Serve the folder locally and check the page/console, e.g.:

```
python3 serve.py 8731
```

Then open `http://127.0.0.1:8731/index.html`.

`serve.py` sends `Cache-Control: no-store`, so edits always show up (plain
`python3 -m http.server` lets the browser cache `game.js`/`style.css`).

In game, press **Right Shift** for the debug console (stats, logs, fly mode, JS prompt).
