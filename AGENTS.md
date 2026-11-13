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
- saved profiles live in `localStorage` (`beathim-profiles`): name, skin,
  tag color, loadout, difficulty and settings. The profile picker in
  `#nameGate` loads one, and every change updates the active profile. The live
  identity for a tab still stays in `sessionStorage`, so two tabs can differ
- on load a display-name gate (`#nameGate`) asks for a name, pre-filled with the
  one this tab used last time; renaming re-sends `hello` + `state` so other
  players' name tags update
- the lobby customization controls (`#lobbyCustomize`) let each player choose
  a custom player-skin color and an independent name-tag color; both are saved
  in `sessionStorage` and included in `hello` / `state`
- skins are re-rolled automatically if two tabs pick the same one
- remote players fade out after ~20s without a state message
- shots/hits are relayed; each tab owns its own HP and respawns
- a `shot` message carries the muzzle point and impact point, so other clients
  draw an enemy tracer that starts at the shooter's gun
- local tracers start at the viewmodel muzzle, not the centre of the screen;
  damage still comes from the crosshair ray
- `state` includes the held `slot`, which swaps the gun model shown on remote
  avatars (rifle, pistol, sniper, scythe)
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

- ACCEPT opens `#duelSetup` for both players at the same time; each player picks
  their own map (Arena / Battleground) and one weapon in each category:
  primary (AR/sniper), secondary (handgun), melee (fists/scythe), and utility
  (grenade)
- if the map choices differ, a deterministic 50/50 coin flip resolves the map
  identically on both clients; each player keeps their own four-weapon pool,
  and number keys 1-4 select primary/secondary/melee/utility
- the match runs on the resolved map with `duel.active` on: no bots, first to 5
  kills
- spawns are picked from the client ids (z = +18 on Arena, ±24 on Battleground)
  so the two players always start at opposite ends facing each other
- each side counts its own deaths and reports them in `state`; the score is
  derived from the opponent's death count, so a dropped packet can never leave
  the two scoreboards disagreeing
- `duel-end` returns both tabs to the lobby, as do disconnects (15s without a
  state message) and the `LEAVE PVP` button

### Single player

The old shooting-range dummy targets are removed. The lobby's Single Player
button starts five rounds against computer players, with Easy / Hard
difficulty. Existing bots provide movement, strafing, aiming, shooting, and
reload behavior; a final report appears after the five-round run.

Either side ending a round (player eliminated or opponent eliminated) advances
to the next round after a short pause. `startSingleRound` resets both fighters
to the round-one spawn points (player z=+18, opponent z=-18), refills HP, mags
and grenades, and clears AI path/aim state. After round five the report shows
rounds won out of five.

Bots use a line-of-sight ray (`botHasLineOfSight`) before firing, so arena
cover actually blocks enemy bullets. When a bot loses sight of the player it
picks a new route instead of shooting through the wall.

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
