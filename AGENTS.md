# Project instructions

This is a static browser game with no build step (Babylon.js loaded from a CDN):

- `index.html` — markup/HUD only
- `style.css` — all styling
- `game.js` — the game module (ES module, imported by `index.html`)
- `engine.js` — Three-compatible game API backed by a real Babylon.js engine
- `multiplayer.js` — cross-tab networking (BroadcastChannel, localStorage fallback)

### Babylon.js rendering

- `index.html` loads the official Babylon.js UMD build from its CDN, with a
  jsDelivr fallback before importing `game.js`.
- `game.js` imports `./engine.js`; the adapter keeps the existing game logic's
  small Three-style API while creating native Babylon engines, scenes, meshes,
  materials, lights, shadows and picking objects.
- The Babylon scene uses the right-handed coordinate system so the existing
  `+Y` up / `-Z` forward camera and gameplay conventions remain unchanged.
- New 3D systems can use native Babylon APIs through the adapter's
  `BABYLON`, `bscene` and `bengine` exports. There is still no build step.

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
- `state` includes the held catalog `slot` and a `reload` flag, which swap the
  gun model shown on remote avatars and play their reload pose
- bots are still simulated per tab (they are not synced)

URL options:

- default room is `main`; `?room=whatever` isolates a private session
- `?nolocal=1` ignores same-browser tabs, useful to test the internet relay

The lobby list header shows the connection state: `ONLINE · MAIN`, `CONNECTING…`
or `LOCAL ONLY` (relay unreachable — only tabs in the same browser will see you).

### Game modes

The lobby offers **Single Player**, **Team Deathmatch**, **Survival**,
**Gun Game** and a **Shooting Range**, plus **1v1 PVP duels** from the player
list. There is no free-for-all mode. Arena and Battleground exist only as PVP
duel maps and as the shared arena used by the CPU modes; chosen during duel
setup. `startGame('arena')` / `startGame('battleground')` without
`duel.active` falls back to the lobby. Bots are only visible in Single Player
and the CPU modes.

### PVP duels

The lobby shows a player list (`#lobbyPlayerList`). Clicking `PVP` there — or
clicking a player's floating name tag in the lobby — sends a `duel-invite`
straight away; the challenger only asks, they don't configure anything. The
other tab gets an ACCEPT / DECLINE popup (`#duelPrompt`).

- ACCEPT opens `#duelSetup` for both players at the same time; each player picks
  their own map (Arena / Battleground) and one weapon in each category:
  primary, secondary, melee and utility from the full weapon catalog, including
  unlocked extras
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

The lobby's Single Player button starts five rounds against computer players,
with Easy / Hard difficulty. Existing bots provide movement, strafing, aiming,
shooting, and reload behavior; a final report appears after the five-round run.

Either side ending a round (player eliminated or opponent eliminated) advances
to the next round after a short pause. `startSingleRound` resets both fighters
to the round-one spawn points (player z=+18, opponent z=-18), refills HP, mags
and grenades, and clears AI path/aim state. After round five the report shows
rounds won out of five. The top-centre scoreboard shows rounds won (blue) and
rounds lost (red) during Single Player.

Every round starts with a 3-2-1-GO overlay (`#countdown`). While
`single.countdown > 0`, both fighters are frozen: no movement, jumping, firing,
quick melee or scythe dash, and the opponent AI does not move or shoot.

Bots use a line-of-sight ray (`botHasLineOfSight`) before firing, so arena
cover actually blocks enemy bullets. When a bot loses sight of the player it
picks a new route instead of shooting through the wall.

The opponent also moves like the player: it sprints in bursts and slides to
close the gap or dodge (`aiSprint`, `aiSlideTime`, `aiSlideDir`,
`aiSlideCooldown`). A sliding bot is faster and crouches low (`scale.y = .5`,
forward lean), which makes it harder to hit. Hard bots sprint and slide more
often, slide for longer, and prefer routes toward the player over distant
cover.

### CPU modes

All CPU modes run on the arena map with the player plus bots, A* pathfinding
(`findBotPath` / `cpuPath`) around cover, line-of-sight checks and respawns.
`matchFrozen()` pauses the player and every CPU while a countdown runs or after
the match is over.

- **Team Deathmatch** — player + 2 blue allies vs 3 red bots, first to 20
  eliminations. Dead bots respawn after 3s; shooting a blue ally shows
  `FRIENDLY FIRE` and does nothing.
- **Survival** — waves of red bots with rising HP and speed. Clearing a wave
  restores 25 HP and starts the next one after 3s; player death ends the run.
  The report shows the wave reached and eliminations.
- **Gun Game** — the player advances through
  `GUN_GAME_GUNS = [AR, WASP, BREACHER, SNIPER, LONGSHOT, GREATSWORD]`; each kill
  upgrades and the last gun wins. Red bots can win by reaching 8 kills.

Every mode ends on the shared `#singleReport` overlay with `MATCH WON` or
`MATCH LOST` and a mode-specific summary, then returns to the lobby.

### Lobby shooting range

The lobby's Shooting Range button builds `rangeGroup`, an indoor range with six
destructible targets. Each target has 80 HP, falls after enough damage, then
respawns after 2.4s. The top scoreboard counts destroyed targets, `1-4` switches
weapons, and `LEAVE MATCH` returns to the lobby. Range hits and destroyed
targets feed `rangeStats` and the daily `range` quest. Shots leave bullet-hole
decals and impact sparks.

### Weapons, unlockables and clips

`WEAPON_CATALOG` in `game.js` is the single source of truth for all 14 weapons
and melees. Each entry has an `id` (0-13), a `base` archetype (rifle, pistol,
fists, grenade, scythe, sniper), category, fire rate, magazine/reserve, damage,
price in keys, icon and description. Unlockable guns and melees reuse a base
archetype but keep their own stats, model trim and wrap.

- the lobby and duel loadouts use icon cards generated from the catalog; the
  old `<select>` elements stay in the DOM as hidden `.legacy-select` data
  holders so the existing change handlers keep working
- ammo is tracked per weapon id (`player.ammo[id]`), so switching between an AR
  and a VIPER keeps each magazine
- every gun has a detachable magazine (`weaponClip` in the first-person
  viewmodel, magazine parts on the third-person gun models). Reloading plays a
  clip animation: the empty magazine drops out during the first half of the
  reload and a fresh one slides in during the second half. The HUD ammo readout
  is labelled `CLIP <mag> / <reserve>`
- locked catalog entries show `🔒` and their key price; clicking one buys it
  directly if enough keys are saved
- wraps are cosmetic color trims for the first-person and third-person guns;
  the equipped wrap is stored with progression

### Progression, keys and cosmetics

Progression persists in `localStorage` under `beathim-progress-v1`: keys,
unlocked weapons, unlocked wraps, the equipped wrap, daily quest state and
lifetime stats (kills, deaths, wins, losses, rounds, PVP, shots, hits,
headshots, range).

- four daily quests (kills, headshots, wins, range targets) each award keys
  when claimed; their progress and claim state reset by date
- the Weapon Chest costs 4 keys and unlocks a random still-locked gun or melee;
  the Wrap Chest costs 2 keys and unlocks a random unowned wrap
- the Daily Quests & Chests panel (`#progressPanel`) shows quest progress,
  chest buttons, the key count and the wrap inventory
- the leaderboard (`#leaderboardPanel`) ranks saved profiles by kills, wins and
  accuracy, with the current session added as `YOU`
- profile saves include the loadout and settings; progression itself is shared
  by every profile in the browser

### Settings and controls

`#settings` (⚙ button or `P` by default) contains sensitivity, scope
sensitivity, crosshair color/style, aim hold/toggle, invert mouse Y, sound
volume/mute, the key rebinding list and the profile opener.

- sound is procedural WebAudio (`playSound`); volume and mute live in
  `localStorage` under `beathim-sound-v1`
- controls are rebindable in `#bindList` and saved under `beathim-binds`;
  `RESET CONTROLS` restores the defaults
- a canonical translation layer (`translatedKey`) maps rebound codes back to
  the original `KeyW` / `Space` / `KeyR` actions, so the game logic is unchanged
- while a bind is capturing, the rebind listener stops immediate propagation so
  the key press does not also fire a game action

### Visual effects and player models

- bots and remote players use the detailed humanoid `buildFighter` model
  (head, visor, torso, limbs, shoulder pads, per-archetype gun) and
  `animateFighter` for walking, crouching and reload poses
- shot hits show body/head/kill hit markers and floating damage numbers; every
  marker is cleared four seconds after its latest appearance and immediately on
  entering the lobby (lobby hit feedback is suppressed)
- bullet impacts leave small dark decals (capped at 52) and short-lived
  additive sparks; decals and effects are ignored by hit and line-of-sight rays
- remote avatars swap their visible gun by the catalog entry's `base` and play
  a reload pose when the `reload` flag arrives in `state`

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
