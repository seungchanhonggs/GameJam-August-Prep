# Game Jam August Prep

Playable web prototype for a mobile portrait tri-hero rotation defense game.

## Play Locally

Run the local server:

```bash
python3 server.py
```

Then open:

```text
http://127.0.0.1:5176
```

On a phone connected to the same Wi-Fi, use the Mac's local IP:

```text
http://192.168.0.165:5176
```

## GitHub Pages

This prototype can be hosted as a static site through GitHub Pages.

Required runtime files:

- `index.html`
- `styles.css`
- `game.js`
- `balance_overrides.js`

Notes:

- The game is playable on GitHub Pages.
- `server.py` is only for local development.
- The balance panel can still update browser localStorage on GitHub Pages.
- Code-backed balance saving requires local `server.py`, then pushing the updated `balance_overrides.js`.

## Current Design

- Three heroes rotate around a magical core.
- Each hero covers one 120-degree sector.
- Tap left/right side of the screen to rotate the formation.
- Enemies attack heroes first, then the core if the lane hero is dead.
- EXP collects into the core and triggers roguelike upgrade cards.
- Wall hero creates arc-shaped defensive walls around the hero's front sector.

