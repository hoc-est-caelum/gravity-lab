# FIELD LAB — gravity and atmosphere sandbox

Double-click **gravity-lab.html** to play in Edge or Chrome. The direct file is the tested launch method; a local server is optional. This is a separate, standalone offline game, not a mode inside the Aurora expedition. It has its own source, physics, build and copied character asset. The adjacent Aurora simulation is unchanged.

## Start an experiment

Choose any numeric gravity from **0 to 10 Earth g** and absolute pressure from **0 to 100 atm**. Zero pressure is vacuum. The gravity slider uses a squared scale (fine control below 1 g) and the pressure slider a logarithmic scale from 0.001 to 100 atm with vacuum at its far left; the numeric fields accept any value in range and Enter starts the experiment. The room contains dry Earth-composition air at a fixed 20°C. The ⅓ g / 2 atm preset matches the requested gravity and pressure, but does not reproduce Aurora's gas composition or temperature.

The 80 × 110 × 24 m hall contains:

- Loose rubber, dense and lightweight rigid test spheres to pick up, carry, push, drop and throw.
- A marked throwing lane and six movable target spheres.
- An 8 m drop rig with equal-size 8 kg and 0.25 kg objects and impact-time readings.
- Concrete, grip mat and low-friction polymer floor areas.
- Steps and separated jump platforms.
- A powered lift that rises level with the 4 m balcony and stops flush against its edge.
- A heavy pendulum on a tension-only tether, hanging at chest height so it can be pushed by walking into it or hit with a thrown ball.
- A human-powered bicycle with grip-limited steering and braking.

## Controls

| Action | Control |
|---|---|
| Move | WASD |
| Hold fast effort / pedal harder | Shift |
| Toggle fast effort | Caps Lock or Fast button |
| Directional jump / upward effort | WASD + Space |
| Swim / wing effort downward | C |
| Fit wing size / remove | 1 / 2 / 3 at the stands; 0 removes |
| Pick up / drop nearby object | E |
| Charge a throw, then release | Hold Q, release Q |
| Equip nearest wings / drop worn pair / mount bicycle | F |
| Start / stop nearby waterfall or ceiling rain | G or nearby Start/Stop button |
| Camera | Arrow keys or mouse drag |
| Camera distance | Mouse wheel |
| First / third person | V or top button |
| Pause | P or top button |
| Recover character at entrance | R or Recover person |

Bicycle: W pedals, S brakes, A/D steer. Stop before dismounting; objects cannot be handled from the saddle, and riding into the pool dismounts you and leaves the bicycle in the water (Reset objects recovers it). Touch buttons (including Dive / down) and a gamepad are supported: left stick moves, right stick / D-pad looks, A jumps, LB runs, X picks/drops, Y uses wings / bicycle, B charges/releases a throw.

**Zero g:** WASD chooses a direction and triggers a valid surface push when contact or hand reach allows it. Space also requests a push. In free flight, WASD cannot create thrust. Throwing an object gives the character an equal opposite impulse. Recover person is an explicit relocation tool if you drift out of reach.

**Movement:** walk targets 1.4 m/s (5.0 km/h); Shift targets a steady 3.0 m/s run (10.8 km/h). Gravity changes stride timing, foot contact and airborne duration. At low gravity, running becomes longer bounds and the walk command can become a lope. Zero-g drift has a relaxed pose without walking cycles. The telemetry shows horizontal speed, target pace and planned footfalls per minute. Dense air, low traction or excessive body weight can prevent the requested pace.

**High g:** moderate increases retain upright locomotion with bent knees and a progressively slower pace. Under the assumed calibration, 2 g walking is about 1.15 m/s; supported crawling begins above about 2.8 times Earth-reference weight and becomes prone between roughly 3.8–5.6 times that weight. These are model assumptions, not universal human tolerance thresholds. The muscle-force budget limits walking, jumping, carrying and pedaling. The character crouches when support demand is excessive; movement progresses to a prone crawl. At extreme load, floor resistance may exceed the available pull; the limbs show effort without artificial motion.

Environment controls pause the experiment while open. Applying new conditions keeps current positions and velocities, and changes the ambient field. A drop that spans different settings is not a clean comparison: reset the drop pair before measuring again.

## New experiments

Open **Water & wings** for equipment and test-start locations. The three wing stands are beside the entrance. Press F near one to equip its pair. F while wearing wings drops them wherever you are, including in flight; approach the dropped pair and press F to pick it up again. Empty racks stay empty. The worn geometry and size readout distinguish 2.2 m, 4.0 m and 6.4 m spans. Airborne WASD directs wing effort, Space requests upward strokes and C downward strokes. Wings add their own mass and use finite arm power, aerodynamic lift/drag and load limits. A braced torso harness carries passive gliding loads; arm torque separately limits flapping. Try large wings with **0.05 g / 10 atm**, then compare Earth conditions. For a passive glide, fit the large pair, select **2 g / 100 atm**, relocate to the balcony and move off its open edge; release controls to glide, or steer with WASD.

The north-east pool supports swimming, buoyancy, wake interaction and particle liquid in zero gravity. Move toward a nearby edge to tread water, grip it and pull out; approach the submerged stairs to wade and step up. Hold C to dive instead. Ordinary steps use the same surface detection. Lower pressure to test boiling with mass loss and evaporative cooling; sufficiently deep vacuum can eventually freeze the remaining water, followed by sublimation. Live phase readings and an estimated thermal forecast are in the equipment menu. Reset pool fill restores the initial water state.

[Detailed mobility, wings and water model](docs/mobility-and-water.md) explains the equations, controls, assumptions and validation. Water is a coarse particle simulation with a bulk thermal model, not fully resolved two-phase CFD.

## Physics scope

Read **How it works** in the game or `docs/model.md`. Forces include gravity, real-gas air drag, displaced-gas buoyancy, finite human forces, tire grip, contact impulses, throwing recoil and tether tension. At high pressure, sufficiently light fixed-volume objects can float. Pressure does not directly multiply drag; density and relative speed determine aerodynamic loading.

The character uses the familiar Aurora suit and articulated animation with a new mechanical controller. This is a reduced-order exploration model, not a validated human biomechanics or safety simulator. Protective equipment, rigid pressure-resistant bodies and fixed displaced volumes are assumptions. Physiology, pressure injury, suit engineering and survival are not simulated.

## Waterfall and ceiling rain

Two button stations are at the north end of the hall. Approach one and press **G**, or click the nearby Start/Stop button. **Water & wings → Waterfall button / Rain button** relocates you beside them for testing. Walk around the control pedestal to enter the rain bay.

The 6 m waterfall recirculates water from the pool; the six ceiling nozzles use a 600 kg supply tank and a drained floor. Water keeps moving when a pump stops. The pumps have finite power, so flow falls at high gravity. Water exchanges momentum with the character and loose objects, disturbs the pool, and responds to air density and low-pressure cooling/freezing. Source water, airborne mass, collected water and exhausted vapor are tracked together.

Try Earth conditions first, then low gravity, dense air or vacuum. Zero g removes gravitational fall; the nozzles still supply initial velocity. A dry/frozen intake or excessive suspended water pauses the pump. Floor/wall collectors recover water through assumed plumbing; puddles and wet clothing are not simulated. See [the station model](docs/water-stations.md) for the precise approximations.

## Automatic display detail

Distant balls use fewer polygons and lose small trim/shadows. Water changes from a 20 cm display grid nearby to 40/80 cm farther away, with slower distant surface refresh and hidden distant spray/foam. Rendering resolution also adapts to workload. Physics remains at the same fixed time step; forces, collisions and liquid parcel count do not depend on viewing distance.

## Review revision (12 October 2026)

A consistency pass over the whole project. Mechanics changes:

- The pendulum bob previously hung with its centre 4 m above the floor and could not be reached; it now hangs at 1.3 m on an 8.7 m tether, moved south of the balcony so its swing stays clear.
- The lift platform stopped 2 m east of the balcony and 10 cm below its deck; it now rises to the deck height and abuts the balcony edge.
- The dense test ball had a bulk density of about 490 kg/m³ and floated in the pool; it is now 0.13 m in radius (about 1,300 kg/m³) and sinks.
- Effective weight uses air buoyancy on the dry fraction and water buoyancy on the immersed fraction, in both the controller and the HUD.
- The sphere drag coefficient is continuous at the Schiller–Naumann / constant-Cd boundary (`max(0.47, …)` below Re = 1,000), for test spheres and station droplets.
- Objects cannot be grabbed while riding; the bicycle dismounts automatically in water.

Interface changes: nonlinear sliders, Enter starts from the setup fields, buttons release keyboard focus after a click so Space never re-triggers them, the floor readout names the actual supporting surface (balcony, steps, ice), feet height is measured above that surface, weight shows its Earth-g ratio, the map shows the pool, rain bay and station buttons, Reset objects also restores wing racks, and the touch layout gained a Dive / down button. Pre-revision copies of the edited sources are in `docs/pre-review-backup`.

## Independent project files

- `gravity-lab.html`: self-contained playable build.
- `src/shell.html`: interface, setup and model notes.
- `src/game.js`: indoor environment, character integration, controls and rendering.
- `src/physics.js`: pure mechanics module, shared by game and tests.
- `src/locomotion.js`: speed, cadence, contact and takeoff calibration for the physical controller and animation.
- `src/avatar.js`: independent copy of the character rig, adapted for variable gravity and carrying.
- `src/wings.js`: finite-wing aerodynamics and power-limited flapping.
- `src/fluid.js`: particle liquid, immersion and frozen aggregate.
- `src/water-stations.js`: finite pumps, weighted water parcels, collisions, recirculation and droplet thermal balance.
- `src/water-thermal.js`: boiling, cooling, freezing, sublimation and heat/mass accounting.
- `src/air-data.js`: offline dry-air density and viscosity table from CoolProp 8.0.0.
- `vendor/three.min.js`: bundled Three.js rendering library.
- `docs`: model description, numeric results and browser screenshots.

Rebuild with Python 3 (standard library only):

```text
python build.py
```

Run numerical checks with Node.js:

```text
node tests/physics.cjs
node tests/gait.cjs
node tests/mobility.cjs
node tests/thermal.cjs
node tests/pool.cjs
node tests/splash-wings.cjs
node tests/wing-flight.cjs
node tests/gravity-glide.cjs
node tests/water-stations.cjs
```

The browser tests use Playwright and Edge paths from this computer; adjust those paths on a different machine. The game itself has no installed-package or network requirement. The air table is already embedded. `tools/make_air_table.py` documents its generation; regenerating it requires CoolProp, whereas normal edits/rebuilds do not.

For another chat, select **this gravity-lab folder** as its project and ask it to read README.md and docs/model.md before editing. Keep changes in this project; rebuilding it must not modify the Aurora expedition.
