# AI Prototype Brief: 3-Hero Rotation Defense

## Goal

Build a playable web prototype for a vertical mobile roguelike formation defense game.

The prototype must test whether tapping the left/right side of the screen to rotate three heroes around a central core is fun and readable.

## One-Line Game Definition

Three heroes rotate around a magical core and defend it from enemies approaching from three directions.

## Target Platform

- Web prototype first
- Design for vertical mobile aspect ratio, 9:16
- Must be playable with mouse clicks on desktop and taps on mobile

## Core Screen Layout

Use a vertical mobile layout.

- Top 12%: core EXP bar only
- Middle 70%: combat arena
- Bottom 18%: each hero's skill charge/cooldown UI

Combat arena contents:

- 3 heroes
- 1 central magical core
- Enemies
- EXP pickup/absorption feedback
- A large circular arena divided into 3 sectors

Do not add extra UI such as:

- Speed button
- Auto button
- Pause button
- Currency
- Stage selector
- Settings
- Shop
- Character selection

## Controls

Use tap/click only.

- Tap/click right half of the screen: rotate the hero formation clockwise by one slot
- Tap/click left half of the screen: rotate the hero formation counterclockwise by one slot
- Do not add drag controls
- Do not add visible left/right rotation buttons

There are 3 fixed slots around the core.

- Slot A
- Slot B
- Slot C

Clockwise rotation:

- A -> B
- B -> C
- C -> A

Counterclockwise rotation:

- A -> C
- C -> B
- B -> A

## Combat Structure

The prototype contains 1 level.

Target length:

- 2 to 3 minutes

Win condition:

- Defeat the boss

Lose condition:

- Core HP reaches 0

The level contains:

- Constant small enemy waves
- Several larger enemy waves
- One boss sequence at the end

Enemies approach from 3 directions. Each direction corresponds to one 120-degree hero sector.

## Core and EXP

Enemies drop EXP when defeated.

EXP should visually move or be absorbed into the central magical core.

When the core EXP bar fills:

1. Pause or slow combat briefly.
2. Show 3 random level-up cards.
3. Let the player pick one card.
4. Apply the upgrade.
5. Resume combat.

Cards are random.

Do not guarantee one card per hero role. It is allowed for multiple cards from the same hero role to appear together.

## Heroes

There are exactly 3 heroes in the prototype:

1. Attack hero
2. Area hero
3. Wall defense hero

All heroes must be able to attack.

The difference between heroes is not whether they can attack. The difference is their combat focus, charge behavior, and upgrades.

### Attack Hero

Role:

- Short charge
- Frequent projectile attacks
- Good against small and mid-low enemies

Upgrade cards:

- Increase attack speed
- Increase simultaneous projectile count
- Increase damage
- Add projectile piercing
- Fire an extra projectile on kill

### Area Hero

Role:

- Longer charge
- Area damage
- Good against groups of small enemies
- Still performs weak basic attacks between area attacks

Upgrade cards:

- Increase damage
- Reduce cooldown
- Increase area size
- Add extra projectile
- Increase damage near the center of the area

### Wall Defense Hero

Role:

- Low direct damage
- Creates walls to block or slow enemy entry
- Useful against large waves and rush enemies
- Still performs weak basic attacks

Upgrade cards:

- Increase wall HP
- Add damage when enemies collide with the wall
- Increase wall width
- Increase number of walls
- Make wall explode when destroyed

## Enemies

Use 5 enemy types.

### Small Enemy

- Low HP
- Normal speed
- Appears constantly
- Best handled by the attack hero

### Group Enemy

- Multiple low-HP enemies spawned together
- Best handled by the area hero

### Medium Enemy

- Medium HP
- Slower than small enemies
- Survives longer and tests damage output

### Rush Enemy

- Warn briefly before appearing or accelerating
- Moves quickly toward the core
- Best handled by wall defense

### Boss

- High HP
- Appears at the end of the level
- Should pressure one direction strongly, or shift pressure between directions
- The player should need attack damage, area support, and wall control to survive

## Wave Flow

Use this structure for the first prototype:

### Early Phase

Purpose:

- Teach rotation and basic attacks

Composition:

- Mostly small enemies
- Occasional medium enemy

### Mid Phase

Purpose:

- Teach hero role differences

Composition:

- Group enemies
- Rush enemies
- Larger waves in one direction at a time

### Late Phase

Purpose:

- Create simultaneous pressure

Composition:

- Constant small enemies
- Larger waves from two or more directions

### Boss Phase

Purpose:

- End-of-level climax

Composition:

- Boss plus continued small enemies

## Required Feedback

The prototype must make these things readable:

- Which direction enemies are coming from
- Which hero is currently assigned to each sector
- When the formation rotates
- When enemies hit the core
- When EXP moves into the core
- When a hero skill is charging or cooling down
- When a level-up card is selected

## Prototype Scope

Build:

- 1 level
- 3 heroes
- 5 enemy types
- 15 upgrade cards
- Core HP
- Core EXP bar
- Left-side level progress bar with boss marker
- Bottom hero skill charge/cooldown UI
- Win/lose state

Do not build:

- Meta progression
- Currency
- Equipment
- Shop
- Character unlocks
- Multiple stages
- Story
- Drag controls
- Production art pipeline
- Account save
- Mobile app packaging

## Implementation Priority

1. Implement the 9:16 playfield and input.
2. Implement hero slot rotation.
3. Implement core HP and enemy movement from 3 directions.
4. Implement basic attacks for all 3 heroes.
5. Implement hero skills and cooldown/charge UI.
6. Implement EXP absorption and card selection.
7. Implement wave flow and boss.
8. Add simple hit, damage, EXP, and rotation feedback.

Keep visuals simple. Prioritize playability and readability over final art.
