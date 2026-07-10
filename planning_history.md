# Planning History

## Team Context

The game jam team has three people.

- User: planning and general production work
- Developer: Heejun
- TA / technical art: Youngsik

The target is not just a jam submission. The team wants a highly polished result that can compete for the win and potentially launch afterward.

## Starting Reference

The initial reference game was described as `콩콩던전`.

English reference name:

- `Wittle Defender`

The useful reference points were:

- Compact mobile defense screen
- Hero combination
- Roguelike skill selection
- Clear wave pressure
- Satisfying projectile and enemy feedback

## Original Direction

The initial concept was a mobile defense game with three heroes defending 360 degrees.

Core idea:

- Three heroes are arranged around a central point.
- Each hero covers one 120-degree sector.
- The player rotates the three heroes to match threats.
- The fun should come from deciding which hero should face which direction.

The initial hero role examples were:

- Attack-focused hero
- Area-focused hero
- Defense-focused hero

## Control Direction

Several input options were considered.

Early thought:

- Tap and drag could both work.

Decision:

- Use tap only for the first prototype.

Current control rule:

- Tap right side: rotate formation clockwise.
- Tap left side: rotate formation counterclockwise.

Reason:

- Simple for mobile.
- Easy to test quickly.
- Keeps the prototype focused on rotation decision-making.

## Screen Layout Direction

The prototype moved toward a clean vertical mobile layout.

The user wanted to remove unnecessary UI from the reference screen.

Removed or avoided:

- Speed button
- Auto button
- Pause button
- Currency
- Extra stage UI
- Unneeded menu clutter

Kept:

- Top EXP bar
- Left level/wave progress bar with boss marker
- Three heroes
- Central magic core
- Bottom hero skill charge/cooldown UI

The magic core became important because EXP from defeated enemies should collect there.

## Core and EXP Direction

The central object should feel like a magical core.

Direction:

- Enemies drop EXP.
- EXP flows into the core.
- Core EXP progress fills.
- When the core levels up, the player chooses from random skill upgrade cards.

Important decision:

- Cards are random.
- It is not guaranteed that one card appears for each hero every time.

## Combat Structure Direction

The combat structure became level-based.

One level contains:

- Constant small enemy waves
- Several larger enemy waves
- One or more boss moments

Current prototype:

- One level
- Constant ambient enemies
- Scripted larger waves
- End boss

## Hero Role Direction

The user clarified that all heroes must attack.

Important correction:

- The difference between heroes is not whether they can attack.
- The difference is where their balance and special strength are focused.

### Attack Hero

Focus:

- Short charge
- Frequent projectiles
- Good against small and mid-low enemies

Upgrade examples:

- Attack speed up
- More projectiles per shot
- Damage up
- Pierce
- Extra shot on kill

### Area Hero

Focus:

- Longer charge
- Area damage
- Good against many small enemies
- Still performs weaker basic attacks

Upgrade examples:

- Damage up
- Cooldown reduction
- Area size up
- Extra projectile
- Center damage bonus

### Wall Defense Hero

Focus:

- Defensive wall creation
- Low direct damage
- Still performs weak basic attacks

Upgrade examples:

- Wall HP up
- Wall collision damage up
- Wall width up
- Wall count up
- Wall explosion on destruction

## Wall Design Direction Changes

The wall hero went through the biggest design correction.

### Early Misread

The wall was first implemented too much like an enemy-facing blocker.

Behavior:

- Wall placement was based on enemy positions.
- Wall could appear at inconsistent angles.
- Wall could feel random.

### User Correction

The user clarified that the wall should be based on the hero, not the enemy.

Current intended wall fantasy:

- Red circle: hero.
- Yellow blocks: walls.
- Walls surround the front of the hero inside the hero's 120-degree sector.
- The wall pieces form an arc, like a curved defensive shell.

Current wall behavior target:

- Spawn around the wall hero.
- Stay in front of the wall hero at creation time.
- Be arranged across an arc.
- Stay static after placement.
- Last for a default of 10 seconds.
- Also be destroyable by enemy contact.

## Prototype Implementation Direction

The prototype is web-first.

Reason:

- Fast iteration.
- Easy mobile browser testing.
- Can validate fun before Unity implementation.

Final production target:

- Unity
- Mobile build
- Possible launch after jam

The web prototype is for testing the core fun:

- Is tap rotation readable?
- Is three-hero role matching fun?
- Does the wall/area/attack triangle create interesting decisions?
- Is the core EXP level-up loop satisfying?

## Current Design Pillars

1. Three-role rotation decision
2. Mobile one-tap readability
3. Clear 120-degree lane responsibility
4. Core EXP roguelike progression
5. Small screen clarity with minimal UI
6. Heroes first, core second as defensive priority
7. Wall hero creates curved positional defense, not random obstacles

## Open Design Questions

- How wide should the wall arc feel: 90 degrees, 104 degrees, or almost full 120 degrees?
- Should wall count upgrades add more wall pieces within the same arc, or create multiple arc rows?
- Should enemies be blocked physically by walls, slowed by walls, or take damage and push back?
- Should a dead hero revive after level-up, wave clear, or not at all?
- Should boss pressure rotate lanes or commit to one lane?
- Should tap rotation have a cooldown to prevent accidental over-rotation?

