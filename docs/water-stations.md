# Waterfall and ceiling-rain stations

FIELD LAB revision, 30 September 2026. This adds equipment to the independent indoor project only.

## Using the stations

Approach a marked pedestal and press **G**, or click its contextual **Start / Stop** button. The button lights green while enabled. Water & wings includes test relocations beside both controls. The rain pedestal is outside the bay; walk around it to enter. Starting requires proximity, while continuing operation does not. Stopping closes the supply but does not delete water already in flight. Pausing the game pauses pumps and water together.

The waterfall outlet is 6 m above the floor, 2.6 m wide, over the existing pool. It withdraws actual pool mass through an intake at −1.4 m and returns it on impact. The rain apparatus has six downward nozzles at 22.8 m, over a grated collection bay, and a finite 600 kg reservoir. Both start off. Ordinary rigid-body collision geometry includes their pedestals and the waterfall structure; small decorative pipes are not detailed collision meshes.

## Pump and supply model

| Equipment | Requested mass flow | Motor power limit | Outlet speed |
|---|---:|---:|---:|
| Waterfall | 12 kg/s | 2,000 W | 1.2 m/s, horizontal |
| Rain | 0.9 kg/s | 450 W | 5 m/s, downward cone |

The motor supplies external energy. With assumed efficiency 0.65, the mass flow cannot exceed `0.65 × power / specific work`. Specific work includes elevation gain `g Δh` measured from the source free surface (the submerged intake pressure already supplies its submergence head), the atmospheric pressure difference between source and outlet divided by liquid density, outlet kinetic energy, and an assumed pipe loss of `0.35 v²/2 + 2 J/kg`. Efficiency and pipe loss are chosen apparatus specifications. The model assumes a variable-speed/regulated pump that maintains nozzle speed while throttling flow; it is not a measured centrifugal pump curve or a transient pipe-flow solution. Motor waste heat is rejected to the temperature-controlled room. Pump electrical work is tracked separately from water enthalpy.

At Earth gravity the requested rates fit the budgets. At 10 g / 1 atm the model supplies about 2 kg/s waterfall flow and 0.13 kg/s rain. Absolute chamber pressure does not simply become a larger nozzle pressure difference: hydrostatic gas pressure is accounted for. Dry intake, less than 5 kg supply or over 10% source ice stops emission. Intake freezing/clogging is an apparatus assumption, not detailed cavitation or ice-plug dynamics.

## Moving water and impacts

Water outside the pool uses **weighted Lagrangian parcels**. Each holds a represented mass, position, velocity and thermal state. A rain parcel represents many droplets of radius 0.65–1.30 mm, rather than a single centimetre-sized ball. The rendered markers are enlarged for visibility. The waterfall uses 12 transverse lanes of weighted parcels, with a 12 mm effective aerodynamic radius; translucent strips reconstruct the sheet from their actual trajectories. This is a coarse breakup/drag approximation, not a resolved cohesive free surface. Ice renders as separated light-colored markers.

Parcels update at 120 Hz, independent of rendering. Acceleration includes gravity and displaced-air buoyancy. Air drag uses local dry-air density and viscosity, physical droplet radius, and the same Reynolds-dependent sphere correlation as other test bodies: Schiller–Naumann below Reynolds number 1,000 and Cd = 0.47 above it. The drag update dissipates speed without reversal. Deformed large-drop drag, drag crisis, detailed breakup, collisions/coalescence between airborne droplets, entrained air and spray-induced wind are omitted. The room remains a prescribed stationary gas reservoir. [NASA: sphere drag and Reynolds-number dependence](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-of-a-sphere/).

Swept point/expanded-box and sphere intersections avoid tunneling through solid fixtures and the character's collision samples. A hit transfers an equal opposite normal impulse to a free body, with low restitution for liquid and slightly higher restitution for ice. The droplet continues after deflection; it is not deleted on character contact. Collision shapes are the existing coarse body shapes, not skin, individual limbs, cloth or wing membranes. Wet clothing, adhesion and absorbed water mass are not modeled.

At nonzero gravity, pool entry uses the reconstructed water surface. At zero g it uses actual liquid parcels, so there is no fictitious horizontal water plane. Incoming mass, specific enthalpy and momentum enter the pool. Uniform parcel-mass redistribution plus a localized velocity correction preserves the specified total momentum; it is not a locally resolved inlet pressure solve. The main fluid responds and the existing secondary splash/ripple model receives the impact energy. Secondary spray remains a visualization of that impact, not additional physical water mass. A frozen pool receives incoming aggregate momentum through its finite-mass ice body.

Floor and wall collection surfaces are assumed connected to pumped return plumbing. On contact they recover the water to its source tank/pool and absorb the remaining kinetic energy; this collector loss is recorded. That is an explicit open mechanical boundary, not water disappearing. Rain that reaches the pool stays in the pool, progressively depleting the rain reservoir. The grate uses a fixed friction coefficient of 0.65. Puddles, slow drainage films, dynamic wet-floor friction and wetting/contact-angle physics are not solved. Collection is idealized even in zero gravity, representing active suction rather than gravitational runoff.

## Temperature and phase

The existing IAPWS-based bulk enthalpy model is also applied separately to each represented parcel, with its own area and mass. Low ambient pressure permits vapor loss, evaporative cooling, freezing and sublimation. Vapor leaves through the assumed chamber exhaust, carrying enthalpy. Source withdrawal and return transfer specific enthalpy, so recycling cold water cools its supply. The pool and rain reservoir retain their own thermal states.

For droplets, the exposed area is `3m/(ρr)`. Gas heat exchange uses an isolated-sphere Ranz–Marshall approximation, `Nu = 2 + 0.6 Re^0.5 Pr^(1/3)`, with assumed air conductivity 0.026 W/(m K) and Pr = 0.71. [NASA contractor report: droplet heat/mass-transfer correlations, section 4.4](https://ntrs.nasa.gov/api/citations/19830004083/downloads/19830004083.pdf). Heat transfer fades toward vacuum; thermal radiation remains. These constant-property and rarefied-gas approximations are not a detailed transport model. Thermal updates occur about every 0.1 s with an explicit per-update mass-loss limit. The same total-pressure opposition and effective evaporation coefficient as the pool are retained: humidity, interface vapor clouds, condensation and ordinary unsaturated-air evaporation are not resolved. Small-particle freezing times are model estimates, not validated predictions.

The full mass diagnostic sums pool, rain supply, airborne parcels and all exhausted vapor. Pool refill is an explicit external reset and adjusts the reference mass accordingly. Mechanical pump work, collector dissipation, thermal heat and exhausted enthalpy are tracked, but the PBF liquid/contact approximations do not constitute a globally energy-conserving CFD solver.

## Performance and verification

There are at most 1,000 waterfall parcels and 2,200 rain parcels. If prolonged suspension fills that budget, an explicit pump interlock stops new supply until collection frees capacity; existing mass is not discarded. This is a simulation resource limit represented as equipment control, not a natural fluid effect. Distant visuals draw fewer representative markers and refresh at 10 Hz; nearby visuals refresh at 30 Hz. Physical parcel counts and time steps do not depend on camera distance.

`tests/water-stations.cjs` checks mass accounting, emission/stop/recirculation, pool momentum exchange, character impact momentum, vacuum and dense-air motion, low-pressure cooling, source freezing, pump power limits, bounded capacity and stability of the receiving pool. `tests/water-stations-browser.cjs` uses the actual controls and checks both stations, continued flow after shutoff, character interaction, mobile layout and browser errors. Results and screenshots are saved in this folder.

These additions are consistent with the stated reduced-order model. They do not make FIELD LAB a validated multiphase-fluid, biomechanics or safety simulator.
