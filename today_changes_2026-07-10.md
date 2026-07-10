# Today Changes - 2026-07-10

## Current Prototype State

The playable web prototype is a vertical mobile defense game.

- Target device: mobile portrait, especially iPhone 16 Pro ratio.
- Prototype URL during local testing: `http://192.168.0.165:5176`
- Main implementation files:
  - `index.html`
  - `styles.css`
  - `game.js`
  - `server.py`
  - `balance_overrides.js`

## Core Game Rules Updated Today

### Enemy Targeting

Enemies must not attack the core first.

Current rule:

1. Enemy approaches the hero assigned to that lane.
2. If that hero is alive, the enemy attacks the hero.
3. If the hero in that lane is dead, the enemy then targets the core.

This makes hero HP meaningful and prevents the core from being the only defensive objective.

### Wall Defense Hero

The wall hero's wall behavior was revised several times.

Current intended rule:

- Walls are created by the wall defense hero.
- Walls are static after creation.
- Walls do not rotate together with the hero formation.
- Walls have HP.
- Walls have a duration again.
- Default wall duration: `10` seconds.
- Walls should form around the wall hero, not randomly in the enemy field.
- Walls should appear in the wall hero's 120-degree assigned sector.
- Walls should form as an arc in front of the hero, like a partial shield surrounding the hero.
- Wall pieces should rotate along the arc, so each piece feels like part of a curved barrier.

Current default wall values:

- `wallPlaceDistance`: `78`
- `wallArcDegrees`: `104`
- `wallDuration`: `10`

These values can be adjusted in the balance debug panel.

### Level-Up Toggles

Skill level-up can now be controlled from the balance debug panel.

Supported toggles:

- Skill level-up on/off
- Attack hero cards on/off
- Area hero cards on/off
- Wall hero cards on/off

If level-ups are disabled, the core can still level up visually without showing upgrade cards.

### Upgrade Card Colors

Level-up cards are color-coded by hero role.

- Attack hero: yellow
- Area hero: blue
- Wall hero: green

### Area Hero Projectile

The area hero was changed so its skill is fired by the hero as a large projectile.

Previous behavior:

- Area skill appeared randomly around enemy positions.

Current behavior:

- Area hero launches a large, translucent projectile.
- On hit, it triggers an area blast.

The area hero's basic projectile was also made visually larger.

### Attack Hero Projectile

The attack hero projectile was changed to look more like a long arrow instead of a small dot.

### Start and Restart

The prototype now has:

- Start combat button
- Restart button
- Quick restart behavior

Combat does not begin until the player starts it.

### Rotation Feedback

Hero rotation is animated.

Previous behavior:

- Heroes instantly swapped positions.

Current behavior:

- Heroes visibly rotate between the three slots.

### Hero Health

Each hero now has HP.

- Hero HP is shown in the bottom hero UI.
- Enemy targeting depends on whether the lane hero is alive.

### Enemy Spawn Randomness

Enemies no longer spawn in a perfectly straight line.

Spawn positions now include jitter and pack spacing so waves feel more organic.

### Balance Debug Panel

A balance debug panel was added.

It supports editing:

- Core HP
- Core EXP requirement
- Level duration
- Hero HP
- Hero damage
- Hero cooldowns
- Projectile speeds
- Wall HP
- Wall width
- Wall contact damage
- Wall place distance
- Wall arc degrees
- Wall duration
- Enemy HP
- Enemy damage
- Enemy speed
- Enemy EXP
- Wave counts
- Spawn intervals
- Upgrade multipliers
- Level-up toggles

The save button writes balance values into `balance_overrides.js` through `server.py`.

If the custom server is not running, values can still be saved in browser local storage, but they will not be written into code.

## Technical Notes

### Local Server

The custom server is required for code-backed balance saving.

Run:

```bash
python3 server.py
```

Expected local port:

```text
5176
```

### Current Verification

Latest checks performed:

```bash
node --check game.js
python3 -m py_compile server.py
```

Both passed during today's work.

