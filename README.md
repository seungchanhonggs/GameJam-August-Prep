# Game Jam August Prep

Playable web prototypes for a mobile portrait three-hero defense game.

## Prototype Versions

### Original Rotation Prototype

Path:

```text
/
```

Core idea:

- Three heroes rotate around a magical core.
- Each hero covers one 120-degree sector.
- Tap the left or right side to rotate the formation.

### Forward-Defense Pivot Prototype

Path:

```text
/pivot-prototype/
```

Team playtest instructions:

- [`pivot-prototype/PLAYTEST_GUIDE.md`](pivot-prototype/PLAYTEST_GUIDE.md)

Core idea:

- Three heroes automatically attack enemies approaching from the front.
- Drag each charged hero skill card into the enemy field.
- Unused, fully charged hero skills feed energy into Core Link.
- Hold Core Link to auto-target enemies with all surviving hero effects and core lightning; releasing preserves the remaining charge.
- Drag automatically collected magical elixirs onto a chosen hero.
- Dead heroes leave combat and the survivors reposition.
- Use one of two prototype Revival Stones by tapping a dead hero card.

## Play Locally

Run the local server:

```bash
python3 server.py
```

Then open:

```text
http://127.0.0.1:5176
```

Open the pivot prototype directly:

```text
http://127.0.0.1:5176/pivot-prototype/
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

## Original Rotation Design

- Three heroes rotate around a magical core.
- Each hero covers one 120-degree sector.
- Tap left/right side of the screen to rotate the formation.
- Enemies attack heroes first, then the core if the lane hero is dead.
- EXP collects into the core and triggers roguelike upgrade cards.
- Wall hero creates arc-shaped defensive walls around the hero's front sector.

## Pivot Prototype Notes

- The pivot prototype is a separate static build and does not change the original prototype.
- Core EXP level-ups pause combat and present three random upgrades from archer, mage, guardian, and core card pools.
- Art, sound, final balance, shop, permanent progression, and production revival-item economy are not implemented.
- The current prototype is intended to test battlefield readability, skill placement, upgrade choices, and Core Link hold timing first.
- The battle UI is compacted and verified at the iPhone 16 Pro viewport size of 402 x 874.
