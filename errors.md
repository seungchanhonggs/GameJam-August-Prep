# Errors And Corrections

This file records mistakes and wrong assumptions made by Codex during planning and prototyping.

The purpose is to avoid repeating the same mistakes.

## Rule For Future Work

When the user says a mechanic feels wrong, first identify the intended player fantasy before changing implementation details.

Do not only patch the current code behavior. Re-check what the mechanic is supposed to feel like.

## Mistake 1: Misinterpreting Wall Placement As Enemy-Based

### What I Did Wrong

I interpreted the wall defense hero as placing walls in front of enemies.

This led to wall placement based on:

- Enemy position
- Enemy movement direction
- Existing wall avoidance
- Lane enemy sorting

### Why It Was Wrong

The user wanted the wall to be based on the wall hero.

The wall should visually and mechanically feel like a defensive formation around the hero, not a random obstacle appearing in enemy space.

### Correct Rule

The wall defense hero's walls should:

- Spawn around the wall hero.
- Appear in the hero's current 120-degree sector.
- Form an arc in front of the hero.
- Rotate per wall segment so the pieces look like they belong to a curved shield.
- Stay static after creation.

### Do Not Repeat

Do not place wall skill output primarily from enemy coordinates unless the user explicitly changes the design.

## Mistake 2: Making Wall Angles Too Random

### What I Did Wrong

I allowed wall angle to follow enemy movement vectors.

This made wall pieces appear at inconsistent and visually random angles.

### Why It Was Wrong

The wall fantasy requires a readable formation.

If the wall angle changes based on enemy positions, the player cannot read it as the hero's defensive skill.

### Correct Rule

Wall angles must be derived from the wall hero's facing sector and the arc position of each wall piece.

### Do Not Repeat

Do not use enemy approach angle as the main wall angle.

## Mistake 3: Removing Wall Duration When Making Walls Static

### What I Did Wrong

When changing walls so they no longer moved with the hero, I removed the duration behavior and made walls last until destroyed.

### Why It Was Wrong

The user later clarified wall duration should return.

Default duration:

- 10 seconds

### Correct Rule

Walls should be both:

- Destroyable by enemy damage
- Expire after duration

### Do Not Repeat

When changing one axis of a mechanic, do not assume the other axis should disappear.

For walls:

- Static does not mean permanent.

## Mistake 4: Treating The Wall As A Straight Blocker Instead Of A Curved Shield

### What I Did Wrong

I revised the wall into a straight line placed in front of the wall hero.

This was closer, but still not the intended shape.

### Why It Was Wrong

The user's sketch showed yellow wall blocks arranged around the red hero in an arc.

The wall should feel like it surrounds or shields the hero's front, not like a single straight barricade.

### Correct Rule

Wall pieces should be distributed along an arc in front of the hero.

### Do Not Repeat

Before implementing defensive formations, check whether the shape is:

- Straight line
- Arc
- Ring
- Cone
- Wall row
- Object placed at enemy position

For the current prototype, the answer is arc.

## Mistake 5: Not Preserving The User's Visual Mental Model

### What I Did Wrong

I overfit the implementation to combat utility and underfit it to the user's drawing.

### Why It Was Wrong

The drawing clarified the intended visual language:

- Hero is the center reference.
- Wall pieces surround the hero's front.
- The sector boundary matters.

### Correct Rule

When the user provides a sketch, preserve the spatial relationship in the sketch before optimizing gameplay behavior.

### Do Not Repeat

Do not reinterpret a sketch into a different mechanic just because it seems more practical.

## Mistake 6: Assuming The Combined Ultimate Should Be Sequential

### What I Did Wrong

I proposed that the guardian, mage, and archer effects should activate one after another so each role would be readable.

### Why It Was Wrong

The user wants the combined ultimate to feel like overwhelming simultaneous cooperation.

As the player drags across the enemy field, all hero effects should immediately affect the same drawn locations together. The magical core also participates with an additional special effect such as lightning.

### Correct Rule

The combined ultimate should apply these effects together along the live drag path:

- Guardian terrain or crowd control
- Mage area damage
- Archer concentrated rapid fire
- Core special attack

Readability should be solved through visual layering, color, height, sound, and very small frame offsets, not by changing the mechanic into a sequential attack.

### Do Not Repeat

Do not replace the user's desired simultaneous impact with a sequential presentation unless the user explicitly changes this direction.

## Mistake 7: Inventing Center-Hero Target Priority

### What I Did Wrong

I suggested that the center hero should receive more concentrated enemy attacks to give formation order additional meaning.

### Why It Was Wrong

There was no established reason for enemies to prioritize the center hero. It also contradicted the simplified pivot rule where heroes are attack and skill units while enemies advance toward the core.

### Correct Rule

Do not force enemies to target the center hero merely because of slot position. If heroes are valid targets, ordinary enemies can target the nearest living hero, which makes center and side pressure emerge naturally from enemy approach positions.

### Do Not Repeat

Do not invent combat rules merely to give another system strategic meaning. Add a rule only when it supports the established core loop and has a clear player-facing reason.

## Mistake 8: Treating A Question As A Rejection

### What I Did Wrong

When the user asked why enemies would focus the center hero, I assumed the user wanted enemies not to attack heroes at all. I immediately removed hero targeting and hero HP from the draft.

### Why It Was Wrong

The user was asking for the design rationale, not rejecting hero targeting. The response collapsed two separate questions:

- Should enemies attack heroes?
- Should enemies receive a forced priority toward the center hero?

The user is open to enemies attacking heroes, while the forced center priority still needs no artificial rule.

### Correct Rule

- Answer the reason behind a proposed rule before treating the question as a request to change it.
- Enemies may attack heroes.
- Default enemies should target the nearest living hero rather than receiving an unexplained center-slot priority.
- If a hero falls, the surviving heroes reposition and continue defending the core.
- Default enemies advance directly to the core only when no heroes remain alive.

### Do Not Repeat

Do not convert a clarification question into a design decision without checking what part of the proposal the user is actually questioning.
