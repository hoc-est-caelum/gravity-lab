/* Pump-driven water experiments. Weighted Lagrangian parcels, not resolved
   droplets/CFD. Every parcel carries real represented mass and enthalpy.
   Water returns through drained collectors; no age-based deletion of water. */
(function(root){'use strict';
const F=typeof module!=='undefined'&&module.exports?require('./fluid.js'):root.LabFluid,T=F.thermal;
const V=(x=0,y=0,z=0)=>({x,y,z}),add=(a,b)=>V(a.x+b.x,a.y+b.y,a.z+b.z),sub=(a,b)=>V(a.x-b.x,a.y-b.y,a.z-b.z),mul=(a,k)=>V(a.x*k,a.y*k,a.z*k),dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z,len=a=>Math.hypot(a.x,a.y,a.z),unit=a=>mul(a,1/(len(a)||1)),clamp=(a,l,h)=>Math.max(l,Math.min(h,a));
const configurations=[{id:'waterfall',name:'Waterfall',button:V(29,1.2,-43),outlet:V(21,6,-46.5),flow:12,power:2000,speed:1.2,rate:120,radius:.012,capacity:1000},
 {id:'rain',name:'Ceiling rain',button:V(10,1.2,-33.8),outlet:V(7,22.8,-41),flow:.9,power:450,speed:5,rate:220,radius:.001,capacity:2200}];
function create(){let tank=T.create(600);tank.area=1.5;tank.conductance=20;return{stations:configurations.map(c=>({...c,button:{...c.button},outlet:{...c.outlet},on:false,flowNow:0,powerNow:0,emitted:0,returned:0,work:0,credit:0,status:'Off'})),tank,parcels:[],marks:[],seed:74219,serial:0,accumulator:0,thermalClock:0,vaporMass:0,exhaustEnergy:0,heatInput:0,impacts:0,bodyImpacts:0,collectorEnergy:0,initialTankMass:600};}
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function nearest(w){let p=w.player.p;return w.waterStations.stations.filter(s=>len(sub(p,s.button))<2.3).sort((a,b)=>len(sub(a.button,p))-len(sub(b.button,p)))[0]||null;}
function toggle(w,id){let s=w.waterStations.stations.find(s=>s.id===id);if(!s)return 'No water station';s.on=!s.on;if(!s.on){s.credit=0;s.flowNow=s.powerNow=0;}return s.name+(s.on?' started · pump enabled':' stopped · remaining water keeps moving');}
function useNearby(w){let s=nearest(w);return s?toggle(w,s.id):'Approach a water-station button and press G';}
function source(w,s){return s.id==='waterfall'?w.water.thermal:w.waterStations.tank;}
function sourcePoint(s){return s.id==='waterfall'?V(21,-1.4,-46):V(7,0,-41);}
function transfer(w,s,dm,h,v,point){if(s.id==='waterfall')return F.exchange(w.water,dm,h,v,point,w.settings.pressure);let q=w.waterStations.tank;if(q.mass+dm<.01)return false;q.mass+=dm;q.energy+=dm*h;T.decode(q,w.settings.pressure*101325);return true;}
function pump(w,s){let src=source(w,s),rho=T.density(src.temperature,w.settings.pressure,src.iceFraction),from=sourcePoint(s),g=w.air(0).g;
 let sourceLevel=s.id==='waterfall'?F.surfaceAt(w.water,from.x,from.z):from.y;
 // Submerged intake pressure supplies its hydrostatic head: lift from the
 // free surface, not from the intake depth a second time.
 let head=g*(s.outlet.y-sourceLevel)-(w.air(sourceLevel).p-w.air(s.outlet.y).p)/rho,unitWork=Math.max(0,head)+s.speed*s.speed/2*1.35+2;
 return{flow:Math.min(s.flow,s.power*.65/unitWork),unitWork,rho};}
function emit(w,s,dt){let sys=w.waterStations,src=source(w,s);s.flowNow=s.powerNow=0;
 if(!s.on){s.status='Off';return;}if(src.mass<5||src.iceFraction>.10){s.status=src.mass<5?'Supply depleted':'Intake frozen · pump stopped';s.credit=0;return;}
 let intake=s.id==='waterfall'?F.sample(w.water,{p:sourcePoint(s),r:.2,height:.4},w.air(0).g):null;if(intake&&intake.fraction<.1){s.status='Intake dry · pump stopped';s.credit=0;return;}
 let count=sys.parcels.reduce((n,p)=>n+(p.station===s.id),0);if(count>=s.capacity){s.status='Suspended-water capacity · pump waiting';s.credit=0;return;}
 let q=pump(w,s),mass=q.flow/s.rate,flow=Math.min(q.flow,Math.max(0,((s.capacity-count)*mass-s.credit)/dt));s.flowNow=flow;s.powerNow=flow*q.unitWork/.65;s.work+=s.powerNow*dt;s.status='Running';s.credit+=flow*dt;
 while(s.credit+1e-12>=mass&&count<s.capacity){let p={...s.outlet},v=V(0,0,s.speed),r=s.radius;
  let lane=(s.parcelSerial||0)%12;s.parcelSerial=(s.parcelSerial||0)+1;if(s.id==='waterfall'){p.x+=(lane/11-.5)*2.6;p.y+=(random(sys)-.5)*.014;}
  else{let nozzle=(s.parcelSerial-1)%6;p.x=4+(nozzle%3)*3;p.z=-43+Math.floor(nozzle/3)*4;let angle=random(sys)*Math.PI*2,tilt=Math.sqrt(random(sys))*.30;v=V(Math.cos(angle)*s.speed*Math.sin(tilt),-s.speed*Math.cos(tilt),Math.sin(angle)*s.speed*Math.sin(tilt));r=.00065+random(sys)*.00065;}
  let h=src.energy/src.mass,flowV=intake?intake.flow:V();if(!transfer(w,s,-mass,h,flowV,sourcePoint(s)))break;
  let thermal=T.create(mass);thermal.energy=thermal.initialEnergy=mass*h;thermal.minimumMass=1e-12;thermal.maxLossFraction=.03;thermal.conductance=0;thermal.area=3*mass/(q.rho*r);T.decode(thermal,w.air(p.y).p);
  sys.parcels.push({id:++sys.serial,station:s.id,lane,p,v,r,initialMass:mass,thermal,age:0,thermalClock:0,thermalPeriod:.05+random(sys)*.05,ignore:null,ignoreTime:0});s.emitted+=mass;s.credit=Math.max(0,s.credit-mass);count++;
 }
}
function drag(p,air,dt){let rho=T.density(p.thermal.temperature,air.p/101325,p.thermal.iceFraction),r=p.r*Math.cbrt(p.thermal.mass/p.initialMass*998.2/rho),speed=len(p.v),Re=2*r*air.rho*speed/air.viscosity;
 if(speed>1e-12&&air.rho>0){let cd=Re<1000?Math.max(.47,24/Math.max(1e-10,Re)*(1+.15*Re**.687)):.47,k=3*air.rho*cd/(8*rho*r);p.v=mul(p.v,1/(1+k*speed*dt));}
 p.rNow=r;return rho;
}
// Swept point against expanded box / sphere prevents high-g droplets tunneling.
function boxHit(a,b,q,r=0){let lo=0,hi=1,n=V();for(let axis of ['x','y','z']){let d=b[axis]-a[axis],min=q.min[axis]-r,max=q.max[axis]+r;if(Math.abs(d)<1e-10){if(a[axis]<min||a[axis]>max)return null;continue;}let t0=(min-a[axis])/d,t1=(max-a[axis])/d,sign=-Math.sign(d);if(t0>t1)[t0,t1]=[t1,t0];if(t0>lo){lo=t0;n=V();n[axis]=sign;}hi=Math.min(hi,t1);if(lo>hi)return null;}if(hi<0||lo>1)return null;return{t:lo,n};}
function sphereHit(a,b,c,r){let d=sub(b,a),o=sub(a,c),A=dot(d,d),B=dot(o,d),C=dot(o,o)-r*r;if(C<0)return{t:0,n:unit(o)};let disc=B*B-A*C;if(A<1e-15||disc<0)return null;let t=(-B-Math.sqrt(disc))/A;if(t<0||t>1)return null;return{t,n:unit(sub(add(a,mul(d,t)),c))};}
function returnWater(w,p,point,poolHit,normal=V(0,1,0)){let sys=w.waterStations,s=sys.stations.find(s=>s.id===p.station),m=p.thermal.mass,h=p.thermal.energy/m,energy=.5*m*dot(p.v,p.v);s.returned+=m;sys.impacts++;
 // Rain may physically reach the pool; that mass remains in the pool instead
 // of being teleported back to the rain cistern. All other collectors return
 // through dedicated plumbing to their source reservoir.
 if(poolHit){F.exchange(w.water,m,h,p.v,point,w.settings.pressure);if(w.air(0).g>.015)F.detail.emit(w.water.detail,point,p.v,energy,w.air(0).g,w.air(point.y).rho,'entry',p.station==='waterfall'?.28:.18);}
 else{transfer(w,s,m,h,V(),sourcePoint(s));sys.collectorEnergy+=energy;}
 sys.marks.push({p:{...point},normal:{...normal},age:0,life:.30,scale:clamp(Math.sqrt(energy)*.025,.018,.18),ice:p.thermal.iceFraction>.5});if(sys.marks.length>160)sys.marks.shift();
}
function thermal(w,p,dt){let sys=w.waterStations,t=p.thermal,air=w.air(p.p.y),Re=2*(p.rNow||p.r)*air.rho*len(p.v)/air.viscosity;
 t.area=3*t.mass/(T.density(t.temperature,air.p/101325,t.iceFraction)*Math.max(.00005,p.rNow||p.r));
 // Ranz-Marshall isolated-sphere heat transfer; fades with gas density in the
 // rarefied limit. Total-pressure opposition inherits the pool's approximation.
 t.conductance=.026*(2+.6*Math.sqrt(Re)*Math.cbrt(.71))/(2*Math.max(.00005,p.rNow||p.r))*t.area*Math.min(1,air.rho/.02);
 let vapor=t.vaporMass,heat=t.heatInput,exhaust=t.exhaustEnergy;T.step(t,air.p/101325,dt);sys.vaporMass+=t.vaporMass-vapor;sys.heatInput+=t.heatInput-heat;sys.exhaustEnergy+=t.exhaustEnergy-exhaust;
}
function advance(w,dt,api){let sys=w.waterStations;sys.thermalClock+=dt;if(sys.thermalClock>=1/30){T.step(sys.tank,w.settings.pressure,sys.thermalClock);sys.thermalClock=0;}
 for(let s of sys.stations)emit(w,s,dt);let bodies=[w.player,...w.balls,...w.droppedWings],bodySamples=bodies.map(b=>({b,samples:api.samples(b)})),keep=[];
 for(let p of sys.parcels){p.age+=dt;p.ignoreTime=Math.max(0,p.ignoreTime-dt);let old={...p.p},air=w.air(p.p.y),rho=drag(p,air,dt);p.v.y-=air.g*(1-air.rho/rho)*dt;p.p=add(p.p,mul(p.v,dt));
  p.thermalClock+=dt;if(p.thermalClock>=(p.thermalPeriod||.1)){thermal(w,p,p.thermalClock);p.thermalClock=0;p.thermalPeriod=.1;}
  let hit=null;const consider=q=>{if(q&&(!hit||q.t<hit.t))hit=q;};
  for(let q of w.solids){if(Math.max(old.x,p.p.x)<q.min.x-p.rNow||Math.min(old.x,p.p.x)>q.max.x+p.rNow||Math.max(old.y,p.p.y)<q.min.y-p.rNow||Math.min(old.y,p.p.y)>q.max.y+p.rNow||Math.max(old.z,p.p.z)<q.min.z-p.rNow||Math.min(old.z,p.p.z)>q.max.z+p.rNow)continue;let contact=boxHit(old,p.p,q,p.rNow);if(contact)consider({...contact,solid:q});}
  for(let {b,samples}of bodySamples){if(p.ignore===b.id&&p.ignoreTime>0)continue;if(Math.abs(b.p.x-p.p.x)>2||Math.abs(b.p.z-p.p.z)>2)continue;for(let sample of samples){let contact=sphereHit(old,p.p,sample.p,sample.r+p.rNow);if(contact)consider({...contact,body:b});}}
  if(p.p.x>18&&p.p.x<26&&p.p.z>-48&&p.p.z<-38&&w.water.active){if(air.g>.015){let y=F.surfaceAt(w.water,p.p.x,p.p.z);if(p.p.y<=y&&old.y>=y){let t=(old.y-y)/Math.max(1e-10,old.y-p.p.y);consider({t,n:V(0,1,0),pool:true});}}
   else for(let i of F.near(w.water,p.p.x,p.p.y,p.p.z)){let q=w.water.particles[i],contact=sphereHit(old,p.p,q,.24+p.rNow);if(contact)consider({...contact,pool:true});}}
  if(hit){let point=add(old,mul(sub(p.p,old),hit.t));if(hit.body){let b=hit.body,m=p.thermal.mass,relative=sub(p.v,b.v),vn=dot(relative,hit.n);if(vn<0){let j=-(1+(p.thermal.iceFraction>.5?.15:.02))*vn/(1/m+(b.anchored?0:b.inv)),imp=mul(hit.n,j);p.v=add(p.v,mul(imp,1/m));if(!b.anchored)api.impulse(b,mul(imp,-1));sys.bodyImpacts++;}p.p=add(point,mul(hit.n,p.rNow+.004));p.ignore=b.id;p.ignoreTime=.10;keep.push(p);}
   else{returnWater(w,p,point,!!hit.pool,hit.n);}}
  else keep.push(p);
 }sys.parcels=keep;for(let mark of sys.marks)mark.age+=dt;sys.marks=sys.marks.filter(m=>m.age<m.life);
}
function step(w,dt,api){let s=w.waterStations;s.accumulator+=dt;while(s.accumulator>=1/120){s.accumulator-=1/120;advance(w,1/120,api);}}
function state(w){let s=w.waterStations,airborne=s.parcels.reduce((m,p)=>m+p.thermal.mass,0),ice=s.parcels.reduce((m,p)=>m+p.thermal.mass*p.thermal.iceFraction,0);return{stations:s.stations.map(q=>({id:q.id,on:q.on,flow:q.flowNow,power:q.powerNow,status:q.status,emitted:q.emitted,returned:q.returned,work:q.work})),parcels:s.parcels.length,airborneMass:airborne,iceMass:ice,tankMass:s.tank.mass,vaporMass:s.vaporMass+s.tank.vaporMass,impacts:s.impacts,bodyImpacts:s.bodyImpacts,totalMass:w.water.thermal.mass+w.water.thermal.vaporMass+s.tank.mass+s.tank.vaporMass+airborne+s.vaporMass,initialMass:w.water.thermal.initialMass+s.initialTankMass+(s.resetAdjustment||0)};}
const api={configurations,create,nearest,toggle,useNearby,step,state,pump,drag,boxHit,sphereHit};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LabWaterStations=api;
})(globalThis);
