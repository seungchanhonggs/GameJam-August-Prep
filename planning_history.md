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

## 2026-07-13: Forward-Defense Pivot Draft

The team decided to explore a new direction while preserving the existing rotation prototype.

Reasons for exploration:

- The 360-degree battlefield divided attention across three directions.
- Rotation risked becoming a repetitive hero-to-lane matching action.
- A portrait mobile screen made it difficult to show all sectors, enemies, heroes, walls, and effects clearly.
- The team wanted a more direct player action with stronger audiovisual payoff.

New draft direction:

- Remove the 120-degree sectors and 360-degree defense from the new prototype.
- Place three heroes on a single defensive line facing a forward battlefield of roughly 180 degrees.
- Restore automatic basic attacks.
- Let EXP permanently accumulate for roguelike level-up cards.
- Add a separate super-charge layer to the same magical core.
- Allow the player to save charge beyond 100 percent for a stronger combined ultimate.
- Add predictable risk while overcharged.
- Activate the combined ultimate by pressing a skill button and dragging a path across the enemy field for 2 to 3 seconds.
- Express all three hero roles as a readable sequence along the drawn path.

The first draft assumed a sequential combined ultimate. The user corrected this direction.

Updated combat layers:

- Each hero has an independently charged manual ultimate.
- Hero ultimates are placed in the enemy field by dragging a skill card, similar to Clash Royale placement.
- Guardian places a wall.
- Mage places a wide area attack.
- Archer fires multiple arrows at a selected area.
- The core combined ultimate has its own separate charge.
- While drawing the combined-ultimate path, all three hero effects and a core effect occur together at each point.
- Guardian creates small rising walls or applies control such as freezing and slowing.
- Mage applies wide area damage.
- Archer applies rapid concentrated damage.
- The core adds a special effect such as lightning.
- Enemies can randomly drop magical elixirs.
- Elixirs are dragged onto a chosen hero to temporarily increase attack speed, attack power, or add poison, fire, ice, or other projectile properties.

Updated hero-targeting and formation rule:

- Enemies can attack heroes.
- Default enemies prioritize the nearest living hero.
- A dead hero does not leave a permanently open lane.
- When one hero dies, the two survivors automatically reposition to defend the core together.
- When two heroes die, the last survivor moves to the center and defends alone.
- Default enemies attack the core directly only after all heroes are dead.
- A dead hero does not contribute its effect to the combined ultimate until revived.

First prototype balance baseline:

- Archer: 110 HP, fast single-target basic attacks, 9-second multi-arrow ultimate.
- Mage: 100 HP, slow area basic attacks, 12-second wide-area ultimate.
- Guardian: 170 HP, low-damage slowing attacks, 14-second wall ultimate.
- Individual hero ultimates preserve charge while their hero is dead but cannot be used until revival.
- Combined ultimate can be used from 30 charge and can overcharge to 150.
- Using the combined ultimate consumes all current charge and grants 0.8 to 3 seconds of drawing time based on charge.
- Magical elixirs have an initial 8 percent drop chance, last 12 seconds, and are automatically collected into a temporary slot before being dragged onto a hero.
- One elixir can be active per hero; applying another replaces it.
- The first level targets 160 seconds and introduces small, group, heavy, rush, ranged, and boss threats in sequence.

Hero death and revival baseline was revised:

- Automatic revival was removed.
- A dead hero stays out of combat until the player uses a revival item.
- The revival item temporarily uses the name `Revival Stone`.
- Using one revives a selected hero at 100 percent maximum HP with 1 second of protection.
- The first prototype provides 2 free Revival Stones per run to test the flow and does not implement a shop.
- A launch version can give new players several free stones, then allow stones to be earned through play, missions, events, and chests, with the shop as an additional source.
- Players can refuse revival and continue with 2 or 1 surviving heroes.
- Surviving heroes reposition whenever the living hero count changes, including after item-based revival.
- Individual ultimate charge and permanent upgrades survive death.
- Active magical elixirs and temporary buffs are lost on death.
- Dead heroes do not contribute to basic attacks, individual ultimates, or the combined ultimate.
- The combined ultimate uses 3, 2, or 1 hero effects according to the current survivors, plus the core effect.
- With no heroes alive, only the core special effect is produced.
- Defeat occurs only when core HP reaches zero.
- After failure, players should retain some progression resources and strengthen heroes before trying again.

## 2026-07-13: Forward-Defense Web Prototype

A separate playable prototype was created under `pivot-prototype/`. The original rotation prototype remains unchanged at the repository root.

Implemented for the first comparison test:

- Front-facing portrait battlefield
- Automatic basic attacks for three heroes
- Role-specific automatic targeting
- Enemies attack the nearest living hero, then the core when no heroes remain
- Hero HP, death, and automatic 3-to-2-to-1 formation repositioning
- Drag placement for multi-arrow, area blast, and defensive wall hero ultimates
- Separate Core Link charge from 30 to 150
- Live Core Link path drawing with simultaneous surviving-hero effects and core lightning
- Random magical elixir drops collected into two temporary slots
- Dragging an elixir from a slot onto a living hero
- Two prototype Revival Stones and full-HP revival from a dead hero card
- Five enemy types, a boss, and a 160-second wave timeline

The roguelike level-up card pool is intentionally not implemented yet. Core EXP temporarily grants automatic health growth and a small heal so the team can first test the combat screen and drag interactions.

The build was checked at an iPhone 16 Pro viewport of 402 x 874. Individual skill dragging, Core Link path dragging, elixir assignment, hero death, and item revival were verified without browser console errors.

Current combined ultimate example:

1. Guardian control is applied along the drawn path.
2. Mage area damage is applied to the same locations.
3. Archer concentrated fire hits the same locations.
4. Core lightning or another special effect strikes with them.

The original rotation prototype remains intact as a comparison baseline. The new direction is documented separately in `pivot_design_draft_v0.1.md` and is not yet final.

## 2026-07-13: Core Link Hold-Control Revision

The first pivot prototype used path drawing for the combined ultimate. After testing, the path itself did not feel sufficiently enjoyable and occupied too much visual attention on a small phone screen, so the interaction was revised while preserving the earlier build direction in history.

- Fully charged, unused individual hero ultimates now feed charge into Core Link.
- Each ready living hero contributes to the charge rate.
- Energy particles visibly travel from ready heroes toward the core.
- Core Link now auto-targets dangerous enemies while its button is held.
- Charge drains only while a valid target is being attacked.
- Releasing the button stops the attack and preserves all remaining charge.
- Core Link still combines the effects of every surviving hero plus the core effect.
- The overcharge cap remains 150, with a gradual basic-attack cooldown penalty above 100.
- A pause/resume button was added.
- The bottom controls were reduced to 158px so the three heroes and core remain visible on iPhone 16 Pro.
- Generated dummy character art replaced the hero circles for archer, mage, and guardian readability.

## 2026-07-13: Core Link Tuning and Upgrade Cards

- Core Link drain increased from 24 to 56 charge per second, reducing a full 150-charge use from 6.25 seconds to about 2.68 seconds.
- Damage per Core Link pulse was reduced to keep the shorter attack powerful without erasing entire waves.
- A continuous core-to-enemy beam and traveling energy particles were added during Core Link use.
- iOS text selection, touch callouts, and image dragging were disabled inside the game surface for reliable hold input.
- Core EXP level-ups now pause combat and present three random upgrade cards.
- The initial pool contains 12 stackable cards across archer, mage, guardian, and core groups.
- The previous temporary automatic HP growth on level-up was removed.

## 2026-07-14: Return to 360-Degree Rotation

Team feedback found the single-row forward-defense version less enjoyable than the original rotation concept. The forward-defense prototype remains available for comparison, but the active exploration returned to 360-degree defense.

The new `rotation-v2-prototype/` changes the original rotation rules:

- Discrete left/right taps and 120-degree slot swaps were removed.
- Players rotate the formation continuously with a circular finger drag.
- Heroes no longer own complete 120-degree sectors.
- Archer starts with a narrow long range, mage with a medium wide range, and guardian with a short broad range.
- Target selection now checks each hero's current direction, personal angle, and range.
- Enemies advance toward the core and interact with heroes or walls that physically intercept them.
- All individual hero ultimates now trigger automatically when charged and a valid target is available.
- The recommended new Core Link is `Resonance Rotation`, where sweeping enemies with different hero ranges builds a multi-hero combo and a core-lightning finisher.

`Resonance Rotation` was then implemented for testing:

- Each hero has a separate colored Core Link charge segment.
- Successful automatic ultimates charge the archer and mage segments; a wall's first enemy block charges the guardian segment.
- Tapping the ready core begins a six-second link mode.
- During link mode, each enemy can receive each living hero's sweep effect once.
- Connecting every living hero effect on the same enemy triggers a core-lightning finisher.
- If a hero dies during link mode, the required combo immediately contracts to the surviving roles and the finisher scales down.

Enemy spawning was then changed from the legacy three fixed lanes to full 360-degree entry:

- Ambient enemies choose a new random perimeter angle for every spawn.
- Group enemies share an entry angle and spread along that point's tangent so they remain visually grouped from any direction.
- Major waves choose a fresh concentrated angle each time.
- The boss enters from a random angle each run.
- Enemy movement and targeting no longer depend on lane identifiers.
