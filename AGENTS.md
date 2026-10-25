# Project instructions

This is a static browser game with no build step (Three.js loaded from a CDN):

- `index.html` — markup/HUD only
- `style.css` — all styling
- `game.js` — the game module (ES module, imported by `index.html`)
- `multiplayer.js` — cross-tab networking (BroadcastChannel, localStorage fallback)

## Multiplayer

There is no server: tabs of the *same browser* find each other over
`BroadcastChannel`. Open `http://127.0.0.1:8731/index.html` in two tabs, and
each tab shows the other player (lobby and matches) wearing a different skin.

- `hello` / `state` / `hit` / `bye` messages, state sent 10x per second
- a background tab also sends state every 0.8s (`setInterval`), because its
  `requestAnimationFrame` loop is paused and the other tab would otherwise
  lose track of it
- each tab stores `beathim-client-id`, `beathim-skin` and `beathim-name` in
  `sessionStorage`, so a reload keeps the same identity
- skins are re-rolled automatically if two tabs pick the same one
- remote players fade out after ~20s without a state message
- shots/hits are relayed; each tab owns its own HP and respawns
- bots are still simulated per tab (they are not synced)

### 1v1 duels

The lobby shows a player list (`#lobbyPlayerList`). Clicking `1V1` there — or
clicking a player's floating name tag in the lobby — sends a `duel-invite`.
The other tab gets an ACCEPT / DECLINE popup (`#duelPrompt`).

- accepting starts `gameMode='duel'`: arena map, no bots, first to 5 kills
- spawns are picked from the client ids (z = +18 / -18) so the two players
  always start at opposite ends
- kills are relayed with `duel-kill`; each side counts its own score and the
  HUD shows your score vs the opponent's (taken from their `state` message)
- winner sends `duel-end`; both tabs fall back to the lobby, as do
  disconnects (15s without a state message) and the `LEAVE 1V1` button

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
