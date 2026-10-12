# FIELD LAB — mechanics and validation

Locomotion and fluid revision, 30 September 2026. See [mobility-and-water.md](mobility-and-water.md) for the current contact, crawling, wing, liquid and thermal models. This is an independent indoor project inspired by the Aurora expedition.

## Environment

Earth reference gravity is 9.80665 m/s². The input varies uniform downward acceleration from zero to ten times this value. Floor pressure is absolute: 0–100 × 101,325 Pa. Gas composition is dry terrestrial air at 293.15 K.

An offline table at 0.1 atm intervals was generated using CoolProp 8.0.0 HEOS Air. It uses the Lemmon et al. (2000) real-gas equation of state and Lemmon & Jacobsen (2004) viscosity formulation. Linear interpolation supplies density and dynamic viscosity. Density is zero at vacuum; very low nonzero pressures use interpolation to the first sample. A one-metre midpoint hydrostatic integration supplies the height profile, with dp/dy = −ρg. Maximum hall height is 24 m.

At floor level, density is 1.204575 kg/m³ at 1 atm and 121.835257 kg/m³ at 100 atm. These are air at 20°C, not Aurora's atmosphere. [CoolProp Air reference and formulation](https://coolprop.org/fluid_properties/fluids/Air.html)

## Dynamics

The simulation advances in fixed 1/240-second steps. Gravity and buoyancy produce acceleration `−g(1 − ρV/m)` vertically. The environment supplies no background wind. Drag is proportional to `0.5 ρ Cd A |v| v`; an implicit scalar decay prevents numerical reversal when drag is stiff. Rough spheres use a low-Re correction `Cd = 24/Re (1 + 0.15 Re^0.687)` below Re = 1,000, floored at the assumed Cd = 0.47 that applies above, so the coefficient is continuous. Rotational air drag is dissipative and approximate. Rarefied flow, drag crisis, wakes and pressure transients are not resolved. [NASA drag equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/)

Objects are rigid spheres with linear velocity, angular velocity and solid-sphere inertia; hollow shells use that same approximate inertia rather than a detailed mass distribution. Sphere collisions include restitution and friction impulses; floor contact creates spin and rolling, with assumed rolling resistance. World obstacles are rigid boxes. Character contact uses three sphere samples, upright or extended horizontally for prone/swimming poses; character yaw and pose are controlled rather than full rigid-body rotation.

Concrete, grip mat and polymer have assumed friction coefficients 0.72, 1.02 and 0.045. Friction needs normal loading. Character locomotion supplies stance traction directly within its friction budget; an extra passive sliding-friction force is not applied on top of that controller. The bicycle uses two axle lateral forces, a friction circle at each axle, and force-integrated yaw. Balance assistance keeps it upright; detailed wheel inertia, tire pressure, leaning dynamics and suspension are omitted. Solid pressure-resistant tires are assumed.

The lift is kinematic, powered equipment that rises to the balcony deck height (4.25 m). Contact with its moving surface transfers momentum and can do work on a rider. The pendulum (15 kg, 8.7 m tether, resting centre 1.3 m above the floor) has a tension-only distance constraint: its tether can pull but cannot push. Structural supports are decorative except where represented by the documented box collision geometry.

## Human mechanics and animation

The equipped person has a 100 kg mass, 0.10 m³ displaced volume and 0.65 m² drag area. Effective weight is `(m − ρ_air V (1 − s) − ρ_water V s) g` for immersed fraction s. Finite assumptions are 3,000 N sustained support, 3,600 N peak leg force, a 480 J jump-work ceiling, 220 N grip force and an 85 J throwing-work ceiling. Throw impulse is also capped at 65 N·s. Equal and opposite impulse goes to the person and object, conserving their combined linear momentum in a free-flight throw.

Walking commands 1.4 m/s; Shift commands a representative steady run of 3.0 m/s. These are baseline targets. Beyond 1.5 Earth-reference weights, target pace tapers by 36% per added reference weight; force/traction limits apply independently. Walking speed varies between people and situations: 1.4 m/s lies within reported adult comfortable-speed ranges ([Bohannon 1997](https://pubmed.ncbi.nlm.nih.gov/9143432/)); outdoor usual/medium paces and cadence also vary ([Murtagh et al. 2021](https://pubmed.ncbi.nlm.nih.gov/33030707/)). The chosen run is a calibration pace, not a universal population average. Horizontal muscle force is limited to 520 N and horizontal mechanical power to 650 W, with force capacity falling as the 3,000 N support budget is approached. Friction and atmospheric drag can prevent the requested pace. There is no speed clamp that overrides these forces.

`src/locomotion.js` separates target speed from stride timing. Walking at Earth gravity targets about 116 footfalls/min with 60% stance per leg and double support. Cadence varies with speed and effective gravity; stride length follows speed/cadence. At Froude number above 0.92, the slower movement command becomes a lope rather than demanding an unreachably long walking step. This is an illustrative transition rule, not an experimentally fitted boundary. Reduced-gravity walking and running show changed limb timing and excursions ([Sylos-Labini et al. 2013](https://pubmed.ncbi.nlm.nih.gov/24079466/)).

Running alternates left and right supports. Earth-reference stance duration is 0.225 s; the steady-speed launch velocity is 0.66 m/s, producing about 0.135 s of ballistic flight. Flight time follows effective gravity, approximately `2 v_vertical / g_effective`, with actual gravity, buoyancy, drag and collisions integrated during flight. Stance duration scales weakly with gravity and stays within 0.17–0.34 s. A takeoff budget caps the launch impulse; representative mean stance load is `weight + 2 m v_vertical / contact_time`, allowing for both landing and takeoff. A 1.12 peak/mean factor must fit the assumed 3,600 N leg-force limit. Contact applies finite braking/propulsion; airborne input applies no translational steering. Shorter aerial periods and increased cadence at higher gravity agree qualitatively with hypergravity experiments ([Cavagna et al. 2005](https://pubmed.ncbi.nlm.nih.gov/15939774/)). These parameters are reduced-order assumptions, not a validated fit across 0–10 g.

Steady numerical trials at 1 atm give:

| Gravity | Walk-command speed | Run-command speed | Planned run cadence |
|---|---:|---:|---:|
| 0.165 g | 1.40 m/s, loping | 3.01 m/s | 55 steps/min |
| ⅓ g | 1.40 m/s | 3.01 m/s | 92 steps/min |
| 1 g | 1.40 m/s | 3.00 m/s | 167 steps/min |
| 1.3 g | 1.40 m/s | 3.00 m/s | 186 steps/min |
| 1.5 g | 1.40 m/s | 3.00 m/s | 196 steps/min |

Actual footfalls differ slightly from planned cadence because drag and discrete contact integration change flight time. At 1 g / 100 atm, the same run command reaches about 2.17 m/s under the modeled force/power budget. At 10 g this person cannot locomote. Jump anticipation precedes a work-limited takeoff impulse. Excessive support demand reduces available locomotion force and causes crouching. These thresholds illustrate finite strength; they do not measure tolerance or predict injury.

In zero g, desired movement selects a contact push-off constrained by the surface normal and friction. Without contact, bare WASD does not create thrust; wing or liquid propulsion requires its modeled surrounding medium. Recover person explicitly relocates the body; it is not represented as a physical maneuver.

The articulated suit uses the physical stance/flight phase rather than an independent animation clock. World-space feet stay planted during stance; smooth swing paths recover the foot for its next landing. Heel/toe orientation, double support, anticipatory pelvis height and fixed-length two-bone limbs keep the feet and body coordinated. Arms counter-swing opposite the legs with relaxed elbows in walking and greater elbow flexion in running. Acceleration controls restrained torso lean; gaze follows the camera within neck limits, and body yaw follows travel. Jump anticipation, tuck and landing preparation are separate from cyclic running. Zero-g free drift uses a non-cycling relaxed pose. Holding hands track the nearby object.

Visual poses do not constitute a muscle solver or a joint-torque model. The collision samples adapt to upright, prone and swimming posture; pose changes do not redistribute physical mass. Running support is represented by stance and takeoff/landing impulses rather than a continuous joint-force curve. Full human tumbling, angular momentum redistribution, strength fatigue, fall recovery and suit stiffness are omitted. The bicycle's 250 / 450 W effort is assumed available while the corresponding control is held; long-duration exercise fatigue is not modeled.

Rendering no longer limits simulation time to 50 ms per frame: the fixed 240 Hz solver catches up through frames as long as 200 ms. Longer stalls are capped to avoid runaway catch-up, so real time is not preserved below 5 frames/s or through long stalls. Hiding the page clears input and discards hidden elapsed time. Stationary hall geometry is batched by material to reduce rendering overhead.

## Pressure and high-gravity interpretation

All bodies are assumed to retain their stated displaced volume and structural integrity across the full pressure range. In particular, the lightweight test spheres are hypothetical rigid pressure-resistant shells, not freely compressing balloons. The person assumes protective equipment without claiming a suit capable of these conditions. Water has a separate bulk thermal/phase model. Breathing, physiological decompression, tissue pressure effects, survival, oxygen toxicity, injury and crushing are outside scope. The chamber is a mechanics experiment, not a pressure-vessel design or a human safety tool.

Changing conditions, the powered lift, muscular effort and resets can exchange energy with the system. Do not treat an experiment spanning those interventions as isolated. For a drop comparison, reset the pair after changing conditions. Both balls begin with an 8 m bottom clearance and the same radius, but have different masses and therefore different drag/weight and buoyancy/weight ratios.

## Verification

`tests/physics.cjs` exercises reference gas properties, the hydrostatic gradient, vacuum freefall, equal-time unequal-mass vacuum drops, zero-g momentum persistence and contact push-off, jump work, high-g strength limitation, dense-air buoyancy, throw recoil/energy, dissipative collisions/drag, powered-lift contact, bicycle acceleration/steering and finite states across 35 gravity/pressure combinations.

`tests/browser.cjs` uses the standalone delivered build and actual controls for walking, jumping, pickup, throwing, zero-g push-off/coasting, dense air, high gravity, low-gravity running, bicycling, model notes and a narrow viewport. `tests/presentation.cjs` checks the first-person view, pause, mobile layout and touch setup. Results and images are stored alongside this document.

Passing these checks verifies the implemented equations and selected interactions. It does not validate every approximation against experimental human or equipment data.

`tests/gait.cjs` checks steady speeds and cadence across five gravities, dense-air and high-load limits, fixed limb lengths, planted-foot stability, arm/pelvis continuity, and non-cycling zero-g motion. `tests/timing.cjs` compares simulated travel at 15, 30 and 60 render frames/s. `tests/gait-view.cjs` renders `gait-sequence.png` from the delivered build for visual inspection.
