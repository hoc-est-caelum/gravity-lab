# Directional mobility, arm wings and water

Revision: 30 September 2026. This extends FIELD LAB only. The Aurora expedition remains separate.

## Controls and behavior

WASD supplies a desired direction. Grounded movement uses available traction and muscle force; zero-g movement selects an actual contact or reachable hand contact; immersion changes the controller to swimming. In free flight without wings or water, a direction input does not create propulsion. Arrows or mouse drag still control the camera.

- **Space + a direction:** a directional jump, with horizontal and vertical takeoff sharing the jump-work budget and contact friction limit. In water, Space requests upward swimming; C requests downward swimming.
- **Caps Lock:** toggles fast effort. Shift remains hold-to-use fast effort. The top button shows and toggles the same state.
- **1 / 2 / 3:** fit small, medium or large wings while stopped beside the entrance stands. **0 or F while equipped:** release the pair at your current position, including airborne. **F near a dropped pair:** pick it up with low relative speed. The pair stays in the world, inherits release velocity and leaves an empty rack. Pickup merges person/equipment linear momentum; rack fitting is an external equipment transfer. Folded gear uses five contact samples, gravity, air/water forces and a fixed orientation (tumbling and flexible contact are omitted). Wings cannot be combined with bicycling or carrying an object.
- **Wings & pool:** equipment, live thermal readings, a forecast, particle display, pool refill and explicit test-start relocations. These relocations reset velocity and are experiment tools, not physical movement.

Zero-g push-offs use the chosen surface's normal, velocity and friction coefficient. The impulse cannot pull on a surface, and its tangential magnitude cannot exceed μ times its normal magnitude. A finite 85 J positive-work budget and 140 N·s impulse cap apply. A sideways floor push necessarily includes an upward component: without normal load, the floor cannot supply a purely tangential push. Contact impulses are idealized short strokes, not a resolved muscle-force history. The wall/ceiling hand reach is approximate. The suit blends reach, push and drift poses and does not keep cycling its legs in free drift.

The assumed 3,000 N support and 3,600 N peak leg budgets permit upright movement under moderately increased gravity. Pace tapers above 1.5 times reference weight; supported crawling begins above 2.8, followed by a smooth prone transition across 3.8–5.6. These thresholds use effective weight including displaced-air/water buoyancy. Airborne legs relax instead of retaining a ground-load crouch. Crawl poses lower the pelvis and lean the trunk far enough for fixed-length arms to reach the floor; knees remain above it. Limbs provide up to 1,600 N of normal support and 600 N of horizontal pull; material grip also limits the pull. The remaining weight loads the sliding suit, with an assumed suit-contact coefficient of 0.16 times the floor coefficient. At 3–5 g the default concrete permits a slow crawl. At 10 g, modeled belly friction exceeds the available pull: limbs show effort, but there is no artificial translation. These assumptions do not predict a real person's strength, tolerance or endurance.

## Arm-wing model

| Pair | Span | Total area | Added mass |
|---|---:|---:|---:|
| Small | 2.2 m | 1.2 m² | 1.5 kg |
| Medium | 4.0 m | 3.2 m² | 4.0 kg |
| Large | 6.4 m | 7.0 m² | 8.0 kg |

Lift uses dynamic pressure, wing area, finite-aspect-ratio lift slope and an angle-of-attack stall approximation. Profile drag is supplemented by `CL² / (π AR e)`, with e = 0.75. Passive lift acts perpendicular to air-relative velocity; drag opposes it. [NASA induced-drag relation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/induced-drag-coefficient/)

Flapping is a cycle-averaged actuator-disk approximation, using 180 W arm input or a 350 W fast-effort budget, with 55% assumed aerodynamic efficiency. Induced power and forward/vertical advance speed limit thrust. Passive gliding now assumes braced spars attached to a torso harness: resultant force limits are 900, 2,200 and 4,500 N for small, medium and large pairs. These are chosen equipment specifications, not measured hardware. An idealized load limiter feathers above these limits; structural failure and brace dynamics are not resolved. The arm moment budget remains 120 N·m per root (190 at fast effort), divided by the modeled moment arm to obtain a separate flapping force limit. Passive wing load consumes that arm budget; at higher loads the arms brace rather than flap. This allows a sufficiently large wing to glide without falsely requiring the arms to hold all lift through muscle torque alone. Higher density increases loading and slows the displayed stroke frequency. Airborne WASD directs the cycle-averaged stroke force, Space requests upward force and C downward force. Arm and wing stroke planes follow that force direction; input is smoothed. In vacuum the arms can attempt strokes but cannot propel the person. Passive angle-of-attack trim follows the flight path, centered at 0.14 radians, with up/down commands changing incidence and entering the approximate stall region. Passive lift and bank remain perpendicular to air velocity; drag dissipates energy. [NASA glider force balance](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/vector-balance-of-forces-glider/) Wings automatically fold around obstructions, for crawling and for swimming. They produce no aerodynamic force in vacuum. Arm-powered takeoff and passive gliding are different: launch height can supply gravitational energy even when arm power cannot sustain level flight. There is no direct airborne velocity steering: intent changes the direction of aerodynamic forces.

The tested large-wing case at 0.05 g / 10 atm lifts the person; 1 g / 1 atm does not. From a 16 m test release at 3 m/s, the large pair at 3 g / 100 atm glides over 24 m during 8 seconds and settles near 0.74 m/s descent; the small pair lands in about 2.32 seconds. At 2 g / 1 atm, the same low-speed release with large wings lands in about 1.29 seconds. These are numerical comparisons of this model, not universal glide performance. Those are outcomes of the stated model, not predictions for a buildable human wing. Unsteady vortex dynamics, elastic membranes, detailed stall, arm inertia, fatigue, structural design and fully physical attitude control are not solved. The upright character controller supplies approximate yaw/attitude assistance.

## Particle liquid and swimming

The recessed pool is 8 × 10 m and 2.4 m deep, with exit steps on its east side. Its initial fill contains 1,196 representative liquid parcels, about 149 tonnes of water. Each parcel represents roughly 125 litres initially; this is intentionally coarse and must not be mistaken for molecular or bubble-scale resolution.

Three-dimensional particle density constraints approximate incompressibility, with poly6/spiky kernels, solid-boundary kernel support, symmetric velocity smoothing and weak cohesion. The design follows the position-based fluid approach; it is a simplified independent implementation. [Macklin & Müller, Position Based Fluids](https://mmacklin.com/pbf_sig_preprint.pdf)

Rigid-body mechanics remain at 240 Hz. Liquid updates at 30 Hz, using 60 Hz substeps above 2 g. Unvisited, undisturbed water is parked until approached; its bulk thermal balance still advances. Once disturbed, the fluid remains active. A reconstructed surface helps show water under gravity; zero g displays the liquid parcels because a horizontal free surface is no longer assumed. Surface reconstruction and bubble markers are visual approximations.

Immersion determines displaced-water buoyancy, relative-flow drag and swimming response. Strokes require liquid, have finite force and power, and return their opposing impulse to nearby parcels. Drag and buoyancy reactions are also transferred to the liquid. Body exclusion displaces parcels to create a wake. That geometric exclusion is not an exact energy-conserving solid/fluid pressure solve. Surface sampling, capillarity, viscosity and turbulent wakes remain coarse; results are not converged engineering CFD. Bath motion and numerical smoothing can affect measured swim speed.

## Boiling, freezing and sublimation

The pool has a separate well-mixed temperature and enthalpy state. Ambient dry-air properties remain those of the 20°C chamber. Low-pressure liquid is **not deleted or switched off**. Vapor leaves the pool, removes its share of mass and enthalpy, and cools the remaining material. At sufficiently low pressure, continued loss can freeze the remainder; ice can then sublime. Raising pressure does not instantaneously recreate the vapor that was removed. Reset pool fill explicitly restores the initial mass and 20°C temperature.

Liquid saturation pressure uses the IAPWS saturation correlation; ice sublimation and melting use the IAPWS ice-Ih relations. Their reference checks include approximately 2,339 Pa at 20°C and 103.24 Pa over ice at −20°C. [IAPWS saturation release](https://iapws.org/technical-guidance/release/Supp-sat), [IAPWS melting and sublimation release](https://iapws.org/technical-guidance/release/MeltSub)

The thermal model uses 4,180 J/(kg·K) liquid heat capacity, 2,100 J/(kg·K) ice heat capacity and 333.5 kJ/kg latent heat of fusion. Vapor enthalpy has a temperature-dependent sensible component. An enthalpy balance determines temperature and the liquid/ice mixture, including the latent-heat plateau. Density includes an approximate liquid temperature relation, weak compression with a 2.2 GPa bulk modulus, and lower-density ice. These caloric/density assumptions are approximations rather than a full IAPWS-95 state solver.

The modeled vapor flux is an effective Hertz–Knudsen relation with coefficient 0.1. Opposing interface vapor pressure is approximated by total chamber pressure. Thus the model addresses boiling into a pressure-controlled, vapor-dominated interface; ordinary diffusion-driven evaporation into humid/unsaturated air and condensation are omitted. An external exhaust is assumed to maintain the requested pressure and remove produced vapor. A 300 W/K basin conductance and thermal radiation supply heat from 20°C surroundings. Different boundary conditions and evaporation coefficients would give different time histories. Research documents substantial limitations and uncertainty in simple Hertz–Knudsen descriptions: [Persad & Ward, 2016](https://pubmed.ncbi.nlm.nih.gov/27314250/).

The balance explicitly tracks remaining mass, vapor removed, outgoing enthalpy and incoming heat. A 1-hour numerical trial at 0.01 atm approaches about 7.17°C. At 0.001 atm the same assumed thermal model predicts partial freezing. These are **model estimates**, not experimentally validated boiling times. In reality, interface cooling, spatial temperature gradients, dissolved gas, nucleation, thermal transport, vapor pressure fields and pumping capacity can dominate. Individual bubbles, two-phase vapor CFD, evaporative recoil and detailed boiling-induced liquid motion are not resolved. White markers merely show the boiling region and activity. They do not add fabricated mechanical energy to the liquid.

Increasing ice fraction raises the modeled flow resistance. Above 98% ice, the material becomes a rigid translational aggregate with finite mass, contact and recoil; melting below 90% releases that constraint. Its orientation is fixed, and crystal formation, rotation, fracture and detailed ice/liquid interfaces are omitted. Sublimation reduces its mass and scale. It supports contact rather than continuing to behave as swimmable water.

The **thermal forecast** integrates this same bulk model at unchanged settings without advancing the game. It is provided because the large pool need not cool or freeze within a few seconds.

## Checks

`tests/mobility.cjs` verifies floor/wall/ceiling pushes, the contact friction cone, absence of free-air steering, all directional jump inputs, high-load crawling, wing power/load limits, vacuum wing behavior, possible/impossible takeoff cases, liquid stability and swimming.

`tests/thermal.cjs` checks saturation reference values, pressure-dependent melting, mass and open-system enthalpy conservation, boiling cooling, freezing, sublimation, and contact with fully frozen water. The mass/energy checks validate accounting inside this model, not all its physical approximations.

`tests/experiments-browser.cjs` exercises the delivered HTML using actual controls: Caps Lock, directional jumping, wing fitting/takeoff, prone crawling, entering/swimming in the pool, low-pressure boiling, the forecast and mobile layout. Results and screenshots are stored in this folder.

## Pool and surface-contact revision

Surface probes now inspect top height, approach direction, hand reach and overhead clearance. Moving toward a reachable pool edge transitions through upright treading, hand support, lifting and moving over the lip. C cancels this assistance for diving. Shallow supported water switches to wading. Grounded step-ups handle rises up to 0.46 m; the stair course and submerged exit use the same detector. Forces are applied through a simplified contact controller: up to 2,500 N / 650 W for steps, or 1,600 N / 420 W for pull-outs. They do not teleport the character, and excessive gravity can prevent completion. These are assumed controller limits, not measured human capability.

Swimming retains its 220 W propulsive-power limit. Upward treading allows up to 300 N times immersion and compensates for weight not supported by buoyancy within that cap. The body changes height gradually, the swim collision capsule rotates, and an upright pose makes the hands available at a wall. Swim kicks extend behind the pelvis with ventral knee bend; tread-water and step poses have separate transitions. Foot swings account for the next surface height.

Initial water excludes the stair solids. Basin/stair boundary corrections no longer become artificial rebound velocity. The visual surface and immersion use a shared weighted reconstruction from populated columns, avoiding holes from empty display cells, and surface triangles are hidden over solid steps. Liquid remains coarse; thin films, small splashes and detailed interfaces are unresolved.

`tests/pool.cjs` checks edge and stair exits, fixed limb lengths and swim-knee direction, absence of teleportation, finite force/speed, free-drift isolation and resting-water stability. The browser sequence also enters the pool, returns to the edge using movement controls, and exits onto land.

## Disturbance detail and contextual equipment

F uses the nearest wing stand within 2.8 m, equips that stand's size, or removes an already worn matching pair. The bicycle uses the same F action near the bike. Stand contents disappear while their pair is worn. Keyboard shortcuts and equipment-menu selection remain available. Worn membranes have distinct outlines, mint/gold/blue colors, and meshes scaled to each preset's actual total span and planform area. The HUD names the size and span.

Fluid reaction impulses are now distributed with normalized local weights, preserving their total opposing momentum while concentrating wakes around the disturbance. Fine detail is provided separately by `src/water-detail.js`: actual surface entry and near-surface motion seed damped gravity-capillary ripple packets, approximate wall reflections, ballistic spray tracers with air drag, short crown sheets and fading foam markers. Greater entry energy creates more detail; submerged movement attenuates the surface response. Zero gravity omits the planar crown and foam overlay.

These are secondary render details, not an additional mass-carrying liquid/vapor solve. They do not apply extra force or add water to the main fluid. Spray launch uses a small fraction of the source impact-energy estimate as its visual budget, but its lifetime, crown shape, damping and foam visibility are rendering approximations. Wave propagation uses linear dispersion at representative depth; it does not resolve turbulent breaking, atomization or detailed foam chemistry. The original mass/thermal accounting remains in the coarse-fluid and enthalpy models.

`tests/splash-wings.cjs` verifies contextual equipment, each worn mesh's span and area, wing colors, spray gravity/air-density response, cleanup, localized impulse conservation and splash emission from an actual falling object. Browser tests exercise F at a stand and capture a real character water entry.

## Display detail and additional checks

Rendering alone changes with distance: sphere meshes use 24×16, 12×8 or 8×6 segments; trim and distant dynamic shadows disappear. Water surface reconstruction uses 20/40/80 cm grids and 30/10/~3 Hz display refresh, restoring detail within 12 m. Distant foam, spray and bubble markers are hidden; underlying parcels, thermal balance and spray trajectories continue. Shadows refresh at up to 30 Hz. Screen resolution adapts between 0.75 and min(device pixel ratio, 1.6) rendered pixels per CSS pixel. None of these change rigid-body time steps, contact forces or liquid resolution.

`tests/wing-flight.cjs` checks all six flight directions, vacuum, reversal, equipment momentum and pickup/drop lifecycle. `tests/gravity-glide.cjs` checks moderate-g upright speed, supported/prone limb reach, high-g dense-air glides, small-wing limitations, structural load and passive aerodynamic power. Browser checks cover the actual keys, size changes and detail transitions.
