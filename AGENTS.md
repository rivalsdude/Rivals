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
- each tab stores `beathim-client-id`, `beathim-skin` and `beathim-name` in
  `sessionStorage`, so a reload keeps the same identity
- skins are re-rolled automatically if two tabs pick the same one
- remote players fade out after ~4.5s without a state message
- shots/hits are relayed; each tab owns its own HP and respawns
- bots are still simulated per tab (they are not synced)

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
