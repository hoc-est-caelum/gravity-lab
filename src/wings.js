/* Finite-wing glide plus a power-limited, cycle-averaged flapping actuator.
   This is not a resolved unsteady wing CFD or a physiological strength model. */
(function(root){'use strict';
const presets=[null,{name:'Small',span:2.2,area:1.2,mass:1.5,braceLimit:900,color:0x8ae6cd},{name:'Medium',span:4,area:3.2,mass:4,braceLimit:2200,color:0xe6b666},{name:'Large',span:6.4,area:7,mass:8,braceLimit:4500,color:0x98baff}],clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function force(spec,rho,v,intent,power,spread=1){let zero={x:0,y:0,z:0},speed=Math.hypot(v.x,v.y,v.z);if(!spec||rho<=0||spread<.05)return{force:zero,lift:0,thrust:0,drag:0,power:0,frequency:spec&&power>0?clamp(Math.cbrt(power/(spec.mass*3)),.08,1.8):0,stall:false,direction:{x:0,y:1,z:0}};
 const S=spec.area*spread,span=spec.span*Math.sqrt(spread),AR=span*span/S,hs=Math.hypot(v.x,v.z),moving=hs>.1,forward=moving?{x:v.x/hs,z:v.z/hs}:{x:intent.x,z:intent.z},fl=Math.hypot(forward.x,forward.z)||1;forward.x/=fl;forward.z/=fl;
 // Assisted trim follows the flight path. This is angle of attack, not a
 // fixed pitch in world space; descending through air need not mean a stall.
 const up=clamp(intent.y||0,-1,1),alpha=.14+up*.20,stall=Math.abs(alpha)>.28;
 let cl=clamp(2*Math.PI*AR/(AR+2)*alpha,-1.15,1.15);if(stall)cl*=Math.max(.12,1-(Math.abs(alpha)-.28)*1.3);
 const q=.5*rho*speed*speed,loadLimit=spec.braceLimit*spread;
 // Braced spars transfer passive loading to a torso harness. Arms still have
 // a much smaller torque budget; they cannot flap a heavily loaded wing.
 const moment=power>250?190:120,flapLimit=2*moment/(.25+.20*spec.span),rawLift=q*S*cl;
 let lift=clamp(rawLift,-loadLimit,loadLimit);cl=q*S>0?lift/(q*S):0;
 const cd=.035+cl*cl/(Math.PI*AR*.75);let drag=q*S*cd;
 // Assumed overload feathering, not unbounded structural strength.
 const resultant=Math.hypot(lift,drag),feather=resultant>loadLimit?loadLimit/resultant:1;lift*=feather;drag*=feather;
 let f={x:speed?-v.x/speed*drag:0,y:speed?-v.y/speed*drag:0,z:speed?-v.z/speed*drag:0};
 if(speed>.1){let turn=Math.sign(lift)*clamp(forward.x*(intent.z||0)-forward.z*(intent.x||0),-.4,.4),ly=hs/speed,lx=-forward.x*v.y/speed,lz=-forward.z*v.y/speed;f.x+=lift*(lx*Math.cos(turn)-forward.z*Math.sin(turn));f.y+=lift*ly*Math.cos(turn);f.z+=lift*(lz*Math.cos(turn)+forward.x*Math.sin(turn));}
 // Direct the cycle-averaged air impulse toward the requested travel axis.
 // Horizontal strokes retain an upward component; Space commands a vertical
 // downstroke, while a negative vertical command reverses its direction.
 let horizontal=Math.hypot(intent.x||0,intent.z||0),direction={x:intent.x||0,y:up<-.1?up:horizontal>.01?1+up:1,z:intent.z||0},dl=Math.hypot(direction.x,direction.y,direction.z)||1;for(let a of ['x','y','z'])direction[a]/=dl;
 const axial=Math.max(0,v.x*direction.x+v.y*direction.y+v.z*direction.z),disk=Math.PI*(span*.5)**2*.65,efficiency=.55,available=power*efficiency;
 let lo=0,hi=flapLimit;for(let i=0;i<22;i++){let t=(lo+hi)/2,required=t*(axial*.5+Math.sqrt(axial*axial*.25+t/(2*rho*disk)));if(required>available)hi=t;else lo=t;}
 let thrust=Math.min(lo,Math.max(0,flapLimit-Math.abs(lift)),Math.max(0,loadLimit-Math.hypot(lift,drag)));f.x+=direction.x*thrust;f.y+=direction.y*thrust;f.z+=direction.z*thrust;
 const used=thrust*(axial*.5+Math.sqrt(axial*axial*.25+thrust/(2*rho*disk)))/efficiency,frequency=power>0?clamp(Math.cbrt(power/(rho*S*(span*.22)**3*8+spec.mass*3)),.08,1.8):0;
 return{force:f,lift,thrust,drag,power:used,frequency:thrust>.01?frequency:0,stall,loadLimit,flapLimit,braced:Math.abs(lift)>=flapLimit,feathered:feather<.999||Math.abs(rawLift)>loadLimit,alpha,trimPitch:Math.atan2(v.y,Math.max(.1,hs))+alpha,direction};
}
const api={presets,force};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LabWings=api;
})(globalThis);
