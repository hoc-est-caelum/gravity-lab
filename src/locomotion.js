/* Representative adult gait calibration. Not a fitted individual biomechanics model.
   Speeds are commands; plan() changes timing, not the commanded speed. */
(function(root){'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),G=9.80665;
const human={walkSpeed:1.4,runSpeed:3.0,legLength:.86,sustainedSupport:3000,peakLegForce:3600,horizontalForce:520,horizontalPower:650,jumpEnergy:480};
function plan(speed,g,weight,mass=100,run=false){
 const ratio=Math.max(.0001,g/G),v=Math.max(.05,speed),fr=speed*speed/(Math.max(.0001,g)*human.legLength);
 const wantsFlight=g>.015&&speed>.35&&(run||fr>.92),type=wantsFlight?(run?'run':'lope'):'walk';
 let contact,flight=0,launch=0,cadence,duty,normal=Math.max(0,weight),limited=weight>=human.sustainedSupport;
 if(wantsFlight&&!limited){
   contact=clamp((run?.225:.30)*ratio**(-.10),.17,.34);
   // Short Earth running flight; lower gravity extends it at the same takeoff speed.
   launch=(run?.66:.32)*clamp(speed/(run?2.5:1.1),.25,1);
   const availableImpulse=Math.max(0,(human.peakLegForce/1.12-weight)*contact);
   launch=Math.min(launch,availableImpulse/(2*mass));
   flight=2*launch/Math.max(.015,g);
   normal=Math.max(0,weight)+2*mass*launch/contact;
   cadence=60/(contact+flight);duty=contact/(2*(contact+flight));
 }else{
   cadence=(run?170:116)*clamp((v/(run?3:1.4))**.32,.34,1.25)*ratio**.16;
   cadence=clamp(cadence,36,220);duty=run?.52:.60;
   contact=duty*120/cadence;
 }
 let period=flight>0?contact+flight:60/cadence;
 // Long low-gravity 'walking' changes to a loping gait before exceeding leg reach.
 let reach=Math.min(.51,v*contact*.5),peakForce=normal*1.12;
 return{type:limited?'overload':type,contact,flight,period,cadence,duty,launch,reach,normal,peakForce,fr,limited,usesFlight:flight>.008};
}
const api={human,plan};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LabLocomotion=api;
})(globalThis);
