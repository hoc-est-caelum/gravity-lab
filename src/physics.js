/* Indoor mechanics sandbox. SI units; y up. Pure module for browser and Node tests. */
(function(root){'use strict';
const AIR=typeof module!=='undefined'&&module.exports?require('./air-data.js'):root.LabAirData;
const L=typeof module!=='undefined'&&module.exports?require('./locomotion.js'):root.LabLocomotion;
const F=typeof module!=='undefined'&&module.exports?require('./fluid.js'):root.LabFluid;
const S=typeof module!=='undefined'&&module.exports?require('./water-stations.js'):root.LabWaterStations;
const W=typeof module!=='undefined'&&module.exports?require('./wings.js'):root.LabWings;
const G=9.80665,DT=1/240,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const V=(x=0,y=0,z=0)=>({x,y,z}),add=(a,b)=>V(a.x+b.x,a.y+b.y,a.z+b.z),sub=(a,b)=>V(a.x-b.x,a.y-b.y,a.z-b.z),mul=(a,k)=>V(a.x*k,a.y*k,a.z*k),dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z,cross=(a,b)=>V(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x),len=a=>Math.hypot(a.x,a.y,a.z),unit=a=>mul(a,1/(len(a)||1));
function airAtPressure(atm){let a=clamp(atm,0,100)/AIR.stepAtm,i=Math.min(999,Math.floor(a)),t=a-i,r=AIR.rows[i],s=AIR.rows[i+1];return{rho:r[1]+(s[1]-r[1])*t,viscosity:r[2]+(s[2]-r[2])*t,p:atm*101325};}
function atmosphere(settings){const g=settings.gravity*G,profile=[];let p=settings.pressure*101325;for(let i=0;i<=25;i++){let a=airAtPressure(p/101325);profile.push({...a,g,T:293.15});let mid=airAtPressure(Math.max(0,p-.5*a.rho*g)/101325);p=Math.max(0,p-mid.rho*g);}return h=>{let y=clamp(h,0,24.999),i=Math.floor(y),t=y-i,a=profile[i],b=profile[i+1];return{g,T:293.15,p:a.p+(b.p-a.p)*t,rho:a.rho+(b.rho-a.rho)*t,viscosity:a.viscosity+(b.viscosity-a.viscosity)*t};};}
const materials={grate:{name:'Drained metal grate',mu:.65,rolling:.012,color:0x506f77},concrete:{name:'Concrete',mu:.72,rolling:.008,color:0x8b9caa},rubber:{name:'Grip mat',mu:1.02,rolling:.022,color:0x2b7572},ice:{name:'Low-friction polymer',mu:.045,rolling:.0015,color:0x8abed0}};
function floorMaterial(x,z){if(x>1&&x<13&&z>-46.5&&z<-35.5)return materials.grate;if(x>10&&x<35&&z>-34&&z<-2)return materials.ice;if(x<-12&&x>-35&&z>-34&&z<-2)return materials.rubber;return materials.concrete;}
function makeBall(id,name,x,y,z,mass,r,color,e=.55){return{id,name,kind:'ball',p:V(x,y,z),v:V(),w:V(),mass,inv:1/mass,r,height:2*r,volume:4/3*Math.PI*r**3,cdA:.47*Math.PI*r*r,inertia:.4*mass*r*r,restitution:e,color,contacts:[],trail:[],anchored:false,spawn:V(x,y,z)};}
function makePlayer(){return{id:'player',kind:'human',name:'Equipped person',p:V(0,.91,17),v:V(),w:V(),mass:100,inv:.01,r:.34,height:1.82,volume:.1,cdA:.65,inertia:0,restitution:0,contacts:[],yaw:0,yawRate:0,grounded:false,support:null,normal:0,stanceTime:0,airTime:0,launchV:0,takeoff:'none',boundBlend:0,boundCount:0,stepSide:1,travel:0,landing:0,jumpPreparing:false,jumpPrep:0,jumpSerial:0,posture:0,cooldown:0,mode:'foot',wingSize:0,wingPhase:0,wingSpread:0,wingStats:{},submerged:0,swimming:false,prone:0,pushVisual:0,pushNormal:V(0,1,0),moveIntent:V(),gait:{phase:0,step:0,progress:0,contact:.6,flight:0,cadence:0,duty:.6,type:'idle',reach:0},walkPhase:0,gaitStep:0,gaitActive:false,tractionCarry:0,stats:{}};}
function box(id,x,y,z,sx,sy,sz,material='concrete'){return{id,min:V(x-sx/2,y-sy/2,z-sz/2),max:V(x+sx/2,y+sy/2,z+sz/2),v:V(),material:materials[material],x,y,z,sx,sy,sz};}
function fixtures(){let a=[box('floor',0,-.5,0,80,1,110),box('ceiling',0,24.5,0,80,1,110),box('west',-40.5,12,0,1,24,110),box('east',40.5,12,0,1,24,110),box('north',0,12,-55.5,80,24,1),box('south',0,12,55.5,80,24,1)];
for(let i=0;i<5;i++)a.push(box('step'+i,-25,.22*(i+1),12-i*2.6,7,.44*(i+1),2.6,'rubber'));
a.push(box('deck',-25,1.1,-2.3,7,2.2,5,'rubber'));
for(let i=0;i<4;i++)a.push(box('jump'+i,18+i*3.9,.22+i*.27,12,2.1,.44+i*.54,3,'rubber'));
a.push(box('lift',-16,.15,34,6,.3,6,'rubber'),box('balcony',-25,4,34,12,.5,10,'rubber'));
return a;}
function makeWorld(settings={gravity:1,pressure:1}){let w={settings:{gravity:1,pressure:1,...settings},time:0,stepCount:0,player:makePlayer(),wingRacks:[false,true,true,true],droppedWings:[],wingSerial:0,balls:[],solids:fixtures(),held:null,bike:{p:V(9,0,22),yaw:0,secured:true},lift:{on:false,base:.15},drop:{released:false,time:0,landings:{}},log:[]};
w.air=atmosphere(w.settings);w.water=F.create();w.waterStations=S.create();Object.assign(w.water,F.properties(w.settings.pressure));
// Four floor sections leave a real recessed pool, with solid basin walls.
w.solids[0]=box('floor',-11,-.5,0,58,1,110);w.solids.push(box('floor-east',33,-.5,0,14,1,110),box('floor-north',22,-.5,-51.5,8,1,7),box('floor-south',22,-.5,8.5,8,1,93),box('pool-bottom',22,-2.65,-43,8,.5,10),box('pool-west',17.75,-1.2,-43,.5,2.4,10),box('pool-east',26.25,-1.2,-43,.5,2.4,10),box('pool-north',22,-1.2,-48.25,8,2.4,.5),box('pool-south',22,-1.2,-37.75,8,2.4,.5));
for(let i=0;i<5;i++)w.solids.push(box('pool-step'+i,25,-1.2-.2*i,-38.25-i*.65,1.4,2.4-.4*i,.65,'rubber'));
w.solids.push(box('waterfall-support',21,3,-47.4,3.1,6,.35),box('waterfall-outlet',21,6.06,-46.85,2.9,.22,.45),box('waterfall-button',29,.62,-43,.7,1.24,.6),box('rain-button',10,.62,-33.8,.7,1.24,.6));
w.balls=[makeBall('rubber','Rubber ball',-3,.24,12,1.1,.24,0xffb867,.78),makeBall('steel','Dense ball',0,.13,11,12,.13,0x89a7c3,.24),makeBall('foam','Light shell',3,.36,12,.7,.36,0x70e5c5,.55),makeBall('large','Large hollow sphere',5,.6,10,4,.6,0xb8a0ff,.55),makeBall('drop-heavy','Drop rig · dense',-5,8.25,-24,8,.25,0xffb867,.22),makeBall('drop-light','Drop rig · light',-3,8.25,-24,.25,.25,0x70e5c5,.3),makeBall('pendulum','Pendulum bob',-25,1.3,46,15,.4,0xe9b586,.3)];
w.balls.find(b=>b.id==='pendulum').rope={anchor:V(-25,10,46),length:8.7};for(let b of w.balls)if(b.id.startsWith('drop-'))b.anchored=true;
for(let i=0;i<6;i++)w.balls.push(makeBall('target'+i,'Target sphere '+(i+1),-5+(i%3)*2,.35,37+Math.floor(i/3)*2,3,.35,0xf1e8d1,.4));
return w;}
function setEnvironment(w,g,p){w.settings.gravity=clamp(Number(g)||0,0,10);w.settings.pressure=clamp(Number(p)||0,0,100);w.air=atmosphere(w.settings);if(w.water)Object.assign(w.water,F.properties(w.settings.pressure,w.water.thermal.temperature,w.water.thermal.iceFraction));w.log.push('Environment changed');}
function samples(b){if(b.kind==='wing'){let c=Math.cos(b.yaw),s=Math.sin(b.yaw),a=b.foldLength/2;return[[0,0],[-.20,-a],[.20,-a],[-.20,a],[.20,a]].map(([x,z])=>({p:add(b.p,V(c*x-s*z,0,s*x+c*z)),r:.065}));}if(b.kind==='ball')return[{p:b.p,r:b.r}];if(b.swimming){let r=.31,vertical=Math.max(0,b.height/2-r),horizontal=Math.sqrt(Math.max(0,.60**2-vertical**2));return[-1,0,1].map(t=>({p:add(b.p,V(Math.sin(b.yaw)*horizontal*t,vertical*t,-Math.cos(b.yaw)*horizontal*t)),r}));}if((b.prone||0)>.4){let extent=.55*Math.max(b.prone||0,b.swimming?1:0),r=b.height/2;return[-extent,0,extent].map(t=>({p:add(b.p,V(Math.sin(b.yaw)*t,0,-Math.cos(b.yaw)*t)),r}));}let d=Math.max(0,b.height/2-b.r);return[-d,0,d].map(y=>({p:add(b.p,V(0,y,0)),r:b.r}));}
function closestContact(s,q){let c=V(clamp(s.p.x,q.min.x,q.max.x),clamp(s.p.y,q.min.y,q.max.y),clamp(s.p.z,q.min.z,q.max.z)),d=sub(s.p,c),l=len(d);if(l>s.r+1e-6)return null;if(l>1e-8)return{n:mul(d,1/l),depth:Math.max(0,s.r-l),point:c};let choices=[[s.p.x-q.min.x,V(-1,0,0)],[q.max.x-s.p.x,V(1,0,0)],[s.p.y-q.min.y,V(0,-1,0)],[q.max.y-s.p.y,V(0,1,0)],[s.p.z-q.min.z,V(0,0,-1)],[q.max.z-s.p.z,V(0,0,1)]];choices.sort((a,b)=>a[0]-b[0]);return{n:choices[0][1],depth:s.r+choices[0][0],point:c};}
function impulse(b,j,arm=V()){b.v=add(b.v,mul(j,b.inv));if(b.kind==='ball')b.w=add(b.w,mul(cross(arm,j),1/b.inertia));}
function contactVelocity(b,arm){return add(b.v,cross(b.w,arm));}
function staticContact(b,c,q,dt){let n=c.n,arm=mul(n,-b.r),vr=sub(contactVelocity(b,arm),q.v),vn=dot(vr,n),j=0;
if(vn<0){let e=vn<-.65?b.restitution:0;j=-(1+e)*vn*b.mass;impulse(b,mul(n,j),arm);}
let material=q.id.startsWith('floor')?floorMaterial(b.p.x,b.p.z):q.material,vt=sub(sub(contactVelocity(b,arm),q.v),mul(n,dot(sub(contactVelocity(b,arm),q.v),n))),speed=len(vt);
if(speed>1e-8&&j>0&&!(b.kind==='human'&&n.y>.7)){let denom=b.inv+(b.kind==='ball'?b.r*b.r/b.inertia:0),jt=Math.min(speed/denom,material.mu*j);impulse(b,mul(vt,-jt/speed),arm);}
// Rolling resistance dissipates spin; no Coulomb drag in free flight.
if(b.kind==='ball'&&n.y>.7&&j>0){let speed=len(b.w);if(speed>0)b.w=mul(b.w,Math.max(0,1-material.rolling*j*b.r/(b.inertia*speed)));}
b.p=add(b.p,mul(n,c.depth));b.contacts.push({n,velocity:q.v,solid:q.id,mu:material.mu,normalImpulse:j});if(n.y>.7){b.grounded=true;b.support=q;b.normal+=j/dt;}
if(vn<-.8)b.impact=Math.max(b.impact||0,-vn);
}
function collideStatic(w,b,dt){for(let q of w.solids){let best=null;for(let s of samples(b)){let c=closestContact(s,q);if(c&&(!best||c.depth>best.depth))best=c;}if(best)staticContact(b,best,q,dt);}}
function collidePair(a,b){let best=null;for(let s of samples(a))for(let t of samples(b)){let d=sub(s.p,t.p),l=len(d),depth=s.r+t.r-l;if(depth>0&&(!best||depth>best.depth))best={n:l>1e-8?mul(d,1/l):V(1,0,0),depth};}if(!best)return;let n=best.n,ia=a.anchored?0:a.inv,ib=b.anchored?0:b.inv,total=ia+ib;if(!total)return;
a.p=add(a.p,mul(n,best.depth*ia/total));b.p=add(b.p,mul(n,-best.depth*ib/total));let ra=mul(n,-a.r),rb=mul(n,b.r),rv=sub(contactVelocity(a,ra),contactVelocity(b,rb)),vn=dot(rv,n);if(vn>=0)return;let j=-(1+Math.min(a.restitution,b.restitution))*vn/total;impulse(a,mul(n,j),ra);if(!b.anchored)impulse(b,mul(n,-j),rb);
let tangent=sub(rv,mul(n,vn)),vl=len(tangent);if(vl>1e-8){let den=total+(a.kind==='ball'?a.r*a.r/a.inertia:0)+(b.kind==='ball'&&!b.anchored?b.r*b.r/b.inertia:0),jt=Math.min(.35*j,vl/den),f=mul(tangent,-jt/vl);impulse(a,f,ra);if(!b.anchored)impulse(b,mul(f,-1),rb);}}
function dragStep(b,at,dt){let speed=len(b.v);if(!at.rho||speed<1e-10){b.drag=0;return;}let cda=b.cdA,diameter=2*b.r,Re=at.rho*speed*diameter/at.viscosity;
if(b.kind==='ball'){let cd=Re<1000?Math.max(.47,24/Math.max(1e-12,Re)*(1+.15*Re**.687)):.47;cda=cd*Math.PI*b.r*b.r;}
let k=.5*at.rho*cda,old=speed;b.v=mul(b.v,1/(1+k*speed*dt/b.mass));b.drag=(old-len(b.v))*b.mass/dt;
if(b.kind==='ball'){let c=8*Math.PI*at.viscosity*b.r**3+.02*at.rho*b.r**5*len(b.w);b.w=mul(b.w,1/(1+c*dt/b.inertia));}}
function floorHeight(w,x,z,under=Infinity){let h=x>18&&x<26&&z>-48&&z<-38?-2.4:0;for(let q of w.solids){if(['ceiling','west','east','north','south'].includes(q.id))continue;if(x>q.min.x&&x<q.max.x&&z>q.min.z&&z<q.max.z&&q.max.y<=under+.15)h=Math.max(h,q.max.y);}return h;}
function gripTarget(w,aim){let b=w.player,a=unit(aim||V(Math.sin(b.yaw),0,-Math.cos(b.yaw))),yaw=Math.atan2(a.x,-a.z),delta=Math.atan2(Math.sin(yaw-b.yaw),Math.cos(yaw-b.yaw)),pitch=clamp(Math.asin(clamp(a.y,-1,1)),-.4,.45),y=b.yaw+clamp(delta,-.55,.55),dir=V(Math.sin(y)*Math.cos(pitch),Math.sin(pitch),-Math.cos(y)*Math.cos(pitch));return add(b.p,add(V(0,b.height*.20,0),mul(dir,.38+(w.held?.r||0))));}
function grab(w){if(w.player.mode==='bike')return'Dismount before handling objects';if(w.held){w.held=null;return'dropped';}let b=w.player,near=w.balls.filter(o=>!o.anchored&&!o.rope&&len(sub(o.p,b.p))<2.05).sort((a,c)=>len(sub(a.p,b.p))-len(sub(c.p,b.p)))[0];if(!near)return'No loose object within reach';w.held=near;return'Picked up '+near.name;}
function throwHeld(w,dir,strength=1){if(!w.held)return false;let a=w.player,b=w.held,reduced=1/(a.inv+b.inv),energy=clamp(strength,.05,1)*85,j=Math.sqrt(2*energy*reduced);j=Math.min(j,65);impulse(b,mul(unit(dir),j));impulse(a,mul(unit(dir),-j));w.lastThrow={name:b.name,mass:b.mass,impulse:j,energy:j*j/(2*reduced),time:w.time};w.held=null;return true;}
function pushOff(w,dir){
 const b=w.player;if(b.cooldown>0||len(dir)<.01)return false;
 let reachable=[...b.contacts],shoulder={p:add(b.p,V(0,b.height*.25,0)),r:.57};for(let q of w.solids){let c=closestContact(shoulder,q);if(c&&!reachable.some(v=>v.solid===q.id))reachable.push({n:c.n,velocity:q.v,solid:q.id,mu:q.material.mu});}
 const desired=unit(dir),contacts=reachable.filter(c=>dot(c.n,desired)>-.55);if(!contacts.length)return false;
 const c=contacts.reduce((a,c)=>dot(c.n,desired)>dot(a.n,desired)?c:a),n=c.n;
 // A surface can push only outward. Tangential impulse must lie inside its
 // friction cone; use the friction of THIS contact, including on walls.
 let tangent=sub(desired,mul(n,dot(desired,n))),normal=Math.max(.30,dot(desired,n),len(tangent)/Math.max(.05,c.mu));
 let direction=unit(add(tangent,mul(n,normal))),relative=sub(b.v,c.velocity||V()),along=dot(relative,direction),work=85;
 let j=Math.min(140,b.mass*(-along+Math.sqrt(along*along+2*work/b.mass)));
 if(j<1)return false;impulse(b,mul(direction,j));b.grounded=false;b.cooldown=.55;b.takeoff='push';b.launchV=b.v.y;b.pushVisual=.45;b.pushNormal={...n};b.lastPush={normal:{...n},impulse:mul(direction,j),mu:c.mu,solid:c.solid};if(c.solid==='pool-ice'&&w.water.frozen)w.water.frozen.v=sub(w.water.frozen.v,mul(direction,j/w.water.thermal.mass));return true;
}
function orient(b,intent,dt){let speed=Math.hypot(b.v.x,b.v.z),yaw=speed>.15?Math.atan2(b.v.x,-b.v.z):len(intent)>.1?Math.atan2(intent.x,-intent.z):b.yaw,delta=Math.atan2(Math.sin(yaw-b.yaw),Math.cos(yaw-b.yaw));b.yawRate=clamp(delta*8,-3.5,3.5);b.yaw+=b.yawRate*dt;}
function nearWingStand(w){let b=w.player,best=null;for(let size=1;size<=3;size++){let x=-6-(size-1)*7,z=24,distance=Math.hypot(b.p.x-x,b.p.z-z);if(distance<=2.8&&(!best||distance<best.distance))best={size,distance,x,z,...W.presets[size]};}return best;}
function nearDroppedWing(w,size=0){let b=w.player;return w.droppedWings.filter(q=>(!size||q.wingSize===size)&&len(sub(q.p,b.p))<1.9).sort((a,c)=>len(sub(a.p,b.p))-len(sub(c.p,b.p)))[0]||null;}
function dropWings(w){let b=w.player,size=b.wingSize;if(!size)return 'No wings equipped';let spec=W.presets[size],right=V(Math.cos(b.yaw),0,Math.sin(b.yaw)),p=add(b.p,mul(right,.85));p.x=clamp(p.x,-39.3,39.3);p.z=clamp(p.z,-54.2,54.2);
let gear={id:'wing-'+(++w.wingSerial),name:spec.name+' folded wings',kind:'wing',wingSize:size,p,v:{...b.v},w:V(),yaw:b.yaw,mass:spec.mass,inv:1/spec.mass,r:.065,height:.13,foldLength:.70+spec.span*.10,volume:spec.mass/1200,cdA:spec.area*.12,inertia:0,restitution:0,contacts:[],anchored:false};w.droppedWings.push(gear);
b.wingSize=0;b.mass-=spec.mass;b.inv=1/b.mass;b.wingStats={};b.wingAim=V();b.wingSpread=0;return spec.name+' wings dropped · F nearby picks them up';}
function wearWings(w,size,gear=null){let b=w.player,spec=W.presets[size];if(b.wingSize)dropWings(w);if(gear){let momentum=add(mul(b.v,b.mass),mul(gear.v,gear.mass));b.v=mul(momentum,1/(b.mass+gear.mass));w.droppedWings=w.droppedWings.filter(q=>q!==gear);}else w.wingRacks[size]=false;
w.held=null;b.wingSize=size;b.mass=100+spec.mass;b.inv=1/b.mass;b.wingPhase=0;b.wingAim=V();return spec.name+' wings fitted · '+spec.span.toFixed(1)+' m span';}
function useNearby(w){let b=w.player;if(b.mode==='bike')return switchBike(w);if(b.wingSize)return dropWings(w);let gear=nearDroppedWing(w);if(gear){if(len(sub(b.v,gear.v))>1.5)return 'Match the wings’ speed before picking them up';if(b.swimming)return 'Leave the water before fitting wings';return wearWings(w,gear.wingSize,gear);}let stand=nearWingStand(w);if(stand)return equipWings(w,stand.size);return switchBike(w);}
function equipWings(w,size){let b=w.player;size=clamp(Math.round(size),0,3);if(!size)return dropWings(w);if(b.wingSize===size)return 'This wing pair is already equipped';if(b.mode==='bike'||!b.grounded||len(b.v)>.8||b.submerged>.1)return 'Stop on dry ground to change equipment';let gear=nearDroppedWing(w,size);if(gear)return wearWings(w,size,gear);if(b.p.x< -21||b.p.x> -3||b.p.z<18||b.p.z>28)return 'Approach the wing stands or a dropped pair';if(!w.wingRacks[size])return 'That pair was dropped · approach it and press F';return wearWings(w,size);}
function relocate(w,where){let wing=w.player.wingSize||0;recover(w,true);let b=w.player;b.wingSize=wing;b.mass=100+(W.presets[wing]?.mass||0);b.inv=1/b.mass;b.p=where==='waterfall'?V(29,.91,-40.9):where==='rain'?V(10,.91,-31.7):where==='pool'?V(22,.91,-35.5):where==='wings'?V(-12,.91,20):where==='balcony'?V(-25,5.16,34):V(0,.91,17);return b;}
function wingControl(w,b,input,dt){let spec=W.presets[b.wingSize];if(!spec){b.wingStats={};return;}let clear=!((b.grounded&&b.gait.type==='crawl')||b.swimming||w.held),span=spec.span*.5;
 for(let q of w.solids){if(q.max.y<b.p.y+.15||q.min.y>b.p.y+.8)continue;let cx=clamp(b.p.x,q.min.x,q.max.x),cz=clamp(b.p.z,q.min.z,q.max.z);if(Math.hypot(cx-b.p.x,cz-b.p.z)<span+.25){clear=false;break;}}
 b.wingSpread+=(Number(clear)-b.wingSpread)*(1-Math.exp(-dt*5));let command={...b.moveIntent};if(!b.grounded){if(input.jump)command.y+=1;if(input.dive)command.y-=1;}if(len(command)>1)command=unit(command);
b.wingAim=b.wingAim||V();b.wingAim=add(b.wingAim,mul(sub(command,b.wingAim),1-Math.exp(-dt*7)));let effort=len(command)>.05&&clear?(input.run?350:180)*Math.min(1,len(command)):0;
 let q=W.force(spec,w.air(b.p.y).rho,b.v,b.wingAim,effort,b.wingSpread);q.command={...command};q.airborne=!b.grounded;b.wingStats=q;b.wingPhase+=q.frequency*dt*2*Math.PI;impulse(b,mul(q.force,dt));
}
function crawlControl(w,b,input,dt,weight,mu){let intent=V(input.x||0,0,input.z||0),mag=Math.min(1,len(intent));if(len(intent)>1)intent=unit(intent);
 let support=Math.min(1600,weight*.6),belly=Math.max(0,weight-support),resistance=mu*.16*belly,cap=Math.min(600,mu*support),speed=Math.hypot(b.v.x,b.v.z),target=.40/(1+Math.max(0,weight/981-2)*.20),drive=mul(sub(mul(intent,target),V(b.v.x,0,b.v.z)),b.mass*5);
 if(mag>.1)drive=add(drive,mul(unit(intent),resistance));if(len(drive)>cap)drive=mul(unit(drive),cap);
 // Static belly friction can hold the body even while the limbs strain.
 let friction=speed>.005?mul(unit(V(b.v.x,0,b.v.z)),-Math.min(resistance,speed*b.mass/dt+len(drive))):mul(unit(drive),-Math.min(resistance,len(drive)));
 impulse(b,mul(add(drive,friction),dt));b.crawlEffort=mag;b.walkPhase=(b.walkPhase+dt*(speed>.025?.50:.20)*mag)%1;b.gait={phase:b.walkPhase,type:'crawl',cadence:0};b.stats.targetSpeed=target*mag;b.stats.cadence=0;b.stats.stepLength=0;b.stats.supportForce=support;b.stats.status=cap<=resistance?'Prone effort · floor friction exceeds available pull':b.prone>.5?'Prone crawl · finite arm / leg force':'Low supported crawl';orient(b,intent,dt);
}
// Probe usable top surfaces in the requested direction. No remote snapping:
// step and ledge actions apply capped contact forces while collisions stay active.
function surfaceAhead(w,b,input){
 let d=unit(V(input.x||0,0,input.z||0));if(len(d)<.5||b.mode!=='foot'||b.prone>.25||w.held)return null;
 let foot=b.p.y-b.height/2,best=null;
 for(let q of w.solids){if(['ceiling','west','east','north','south','pool-bottom'].includes(q.id)||q.max.y>foot+2.1)continue;
  let x=clamp(b.p.x,q.min.x,q.max.x),z=clamp(b.p.z,q.min.z,q.max.z),offset=V(x-b.p.x,0,z-b.p.z),distance=len(offset),rise=q.max.y-foot;
  if(distance<.025||distance>(b.swimming?1.15:.68)||dot(unit(offset),d)<.65||rise<.065)continue;
  let step=b.grounded&&!b.swimming&&rise<=.46,shoulder=b.p.y+(b.swimming?b.height*.28:.38),handDistance=Math.hypot(Math.max(0,distance-(b.swimming?.45:0)),q.max.y-shoulder);
  let ledge=b.submerged>.15&&handDistance<.78&&rise<(b.swimming?2.1:1.35);
  if(!step&&!ledge)continue;
  let reach=add(V(x,q.max.y,z),mul(d,.09)),target=add(reach,mul(d,b.r+.12));
  if(target.x<q.min.x+.02||target.x>q.max.x-.02||target.z<q.min.z+.02||target.z>q.max.z-.02)continue;
  let blocked=w.solids.some(o=>o!==q&&o.min.y<q.max.y+1.85&&o.max.y>q.max.y+.5&&target.x>o.min.x-b.r&&target.x<o.max.x+b.r&&target.z>o.min.z-b.r&&target.z<o.max.z+b.r);
  if(blocked)continue;
  let candidate={solid:q.id,top:q.max.y,point:reach,target,direction:d,kind:step?'step':'climb',age:0,progress:0,startY:b.p.y,work:0};
  if(!best||distance<best.distance)best={...candidate,distance};
 }return best;
}
function traversalControl(w,b,input,dt,weight){let t=b.traversal;if(!t)return false;t.age+=dt;
 let intent=V(input.x||0,0,input.z||0);if(input.dive||dot(intent,t.direction)<-.2||t.age>7){b.traversal=null;return false;}
 let q=w.solids.find(q=>q.id===t.solid);if(!q){b.traversal=null;return false;}
 let bottom=b.p.y-b.height/2,cleared=bottom>t.top+.025;
 let dx=t.target.x-b.p.x,dz=t.target.z-b.p.z,dist=Math.hypot(dx,dz),upSpeed=clamp((t.top+b.height/2+.065-b.p.y)*3,-.25,t.kind==='step'?.65:.38);
 let lift=Math.max(0,weight+b.mass*(upSpeed-b.v.y)*9),cap=t.kind==='step'?2500:1600,power=t.kind==='step'?650:420;
 lift=Math.min(lift,cap,power/Math.max(.15,Math.max(0,b.v.y)));
 // Until the lowest body point clears the lip, only approach gently.
 let goal=cleared?.65:.10,force=V((dx/(dist||1)*Math.min(goal,dist*3)-b.v.x)*b.mass*7,lift,(dz/(dist||1)*Math.min(goal,dist*3)-b.v.z)*b.mass*7),horizontal=Math.hypot(force.x,force.z),grip=(q.material.mu||.72)*lift;
 if(horizontal>grip){force.x*=grip/horizontal;force.z*=grip/horizontal;}impulse(b,mul(force,dt));t.work+=Math.max(0,dot(force,b.v))*dt;
 t.progress=clamp((b.p.y-t.startY)/Math.max(.1,t.top+b.height/2-t.startY),0,1);b.gait={type:t.kind,phase:t.progress,cadence:0};b.stats.status=t.kind==='step'?'Stepping onto detected surface':'Hands on edge · pulling out';b.stats.targetSpeed=goal;b.stats.supportForce=lift;b.stats.cadence=0;orient(b,t.direction,dt);
 let inside=b.p.x>q.min.x+.1&&b.p.x<q.max.x-.1&&b.p.z>q.min.z+.1&&b.p.z<q.max.z-.1;
 if(inside&&dist<.35&&bottom>=t.top-.03){b.traversal=null;b.swimming=false;b.wading=b.submerged>.02;b.cooldown=.18;}
 return true;
}
function swimControl(w,b,input,dt){let intent=V(input.x||0,input.y||0,input.z||0);
b.seekingEdge=false;
if(!input.dive&&(input.y||0)>-.2&&w.settings.gravity>.0015){let d=unit(V(intent.x,0,intent.z));for(let q of w.solids){let offset=V(clamp(b.p.x,q.min.x,q.max.x)-b.p.x,0,clamp(b.p.z,q.min.z,q.max.z)-b.p.z),distance=len(offset);if(distance>.02&&distance<1.25&&dot(unit(offset),d)>.65&&q.max.y>b.p.y+.25&&q.max.y<(b.waterSample.surface||0)+1.1){intent.y=Math.max(intent.y,.8);b.seekingEdge=true;intent.x*=.12;intent.z*=.12;break;}}}
if(input.jump)intent.y+=1;if(input.dive)intent.y-=1;if(len(intent)>1)intent=unit(intent);let q=b.waterSample,relative=sub(b.v,q.flow),force=mul(sub(mul(intent,input.run?1.25:.75),relative),160*b.submerged),limit=(intent.y>.1?300:input.run?260:160)*b.submerged;
 if(intent.y>.1)force.y+=Math.max(0,(b.mass-w.water.rho*b.volume*b.submerged)*w.settings.gravity*G);
 if(len(intent)<.05)force=V();if(len(force)>limit)force=mul(unit(force),limit);let power=Math.max(0,dot(force,relative));if(power>220)force=mul(force,220/power);let j=mul(force,dt);impulse(b,j);F.react(w.water,q.ids,j,b.p);b.swimEffort=len(intent);b.walkPhase=(b.walkPhase+dt*.65*b.swimEffort)%1;b.gait={type:'swim',phase:b.walkPhase,cadence:0};b.stats.status=b.seekingEdge?'Swimming up toward reachable edge':'Swimming · strokes push water backward';b.stats.targetSpeed=len(intent)*(input.run?1.25:.75);b.stats.cadence=0;b.stats.waterPressure=w.settings.pressure*101325+q.pressure;orient(b,intent,dt);
}
function releaseDrop(w){w.drop={released:true,time:w.time,landings:{},settings:{...w.settings}};for(let b of w.balls.filter(b=>b.id.startsWith('drop-'))){b.p={...b.spawn};b.v=V();b.w=V();b.anchored=false;}return true;}
function resetDrop(w){w.drop={released:false,time:0,landings:{}};for(let b of w.balls.filter(b=>b.id.startsWith('drop-'))){b.p={...b.spawn};b.v=V();b.w=V();b.anchored=true;}}
function dismount(w){let b=w.player;w.bike.p=V(b.p.x,b.p.y-b.height/2,b.p.z);w.bike.yaw=b.yaw;b.mode='foot';b.mass=100;b.inv=.01;b.cdA=.65;b.volume=.1;b.r=.34;b.p=add(b.p,V(Math.cos(b.yaw)*1.1,0,Math.sin(b.yaw)*1.1));}
function switchBike(w){let b=w.player;if(b.mode==='bike'){if(len(b.v)>1)return'Stop before dismounting';dismount(w);return'Dismounted';}
if(b.wingSize)return'Remove arm wings before riding';if(len(sub(V(b.p.x,0,b.p.z),w.bike.p))>3.1)return'Approach the bicycle';if(w.settings.gravity>1.8)return'This load exceeds the modeled riding strength';b.mode='bike';b.mass=118;b.inv=1/118;b.cdA=.5;b.volume=.115;b.r=.45;b.p.x=w.bike.p.x;b.p.z=w.bike.p.z;b.yaw=w.bike.yaw;b.v=V();w.held=null;return'Bicycle · W pedals · S brakes · A/D steer';}
function recover(w,preserveWings=false){let size=preserveWings?w.player.wingSize:0;if(!preserveWings&&w.player.wingSize)dropWings(w);let b=makePlayer();if(size){b.wingSize=size;b.mass=100+W.presets[size].mass;b.inv=1/b.mass;}w.player=b;w.held=null;return b;}
function controlPlayer(w,input,dt){let b=w.player,at=w.air(b.p.y),weight=Math.max(0,(b.mass-at.rho*b.volume*(1-(b.submerged||0))-(b.submerged||0)*w.water.rho*b.volume)*at.g),ratio=Math.max(0,weight/981),desiredPosture=b.grounded?clamp((ratio-1.7)/1.5,0,1):0;
b.prone+=((b.grounded?clamp((ratio-3.8)/1.8,0,1):0)-b.prone)*(1-Math.exp(-dt*6));b.pushVisual=Math.max(0,b.pushVisual-dt);b.moveIntent=V(input.x||0,input.y||0,input.z||0);if(len(b.moveIntent)>1)b.moveIntent=unit(b.moveIntent);let supportY=floorHeight(w,b.p.x,b.p.z,b.p.y+.35),surface=b.waterSample.surface;
let canWade=at.g>.015&&Number.isFinite(surface)&&surface-supportY<1.22&&b.p.y-supportY<1.3;
b.wading=canWade&&b.submerged>.015;
b.nearSurface=surfaceAhead(w,b,input);
if(!b.traversal&&b.nearSurface&&at.g>.015&&!input.dive&&b.cooldown<=0)b.traversal=b.nearSurface;
b.swimming=b.mode!=='bike'&&!b.wading&&!b.traversal&&(b.submerged>.48||(b.swimming&&b.submerged>.18));
b.posture+=(desiredPosture-b.posture)*(1-Math.exp(-dt*6));let oldH=b.height,targetH=b.mode==='bike'?2.1:b.swimming?(b.seekingEdge||input.jump?1.60:.62):b.traversal?.kind==='climb'?1.15:b.gait.type==='crawl'?1.03-.49*b.prone:1.82-.42*b.posture;
b.treading=b.swimming&&(b.seekingEdge||input.jump);b.height+=(targetH-b.height)*(1-Math.exp(-dt*7));
// Preserve foot contact on land; rotate/extend around the body centre in water.
if(b.grounded&&!b.swimming&&!b.traversal)b.p.y+=(b.height-oldH)*.5;b.cooldown=Math.max(0,b.cooldown-dt);b.landing*=Math.exp(-dt*10);b.travel+=Math.hypot(b.v.x,b.v.z)*dt;
let oldContacts=b.contacts,ground=b.grounded,normal=Math.max(0,weight),mu=b.support?(b.support.id.startsWith('floor')?floorMaterial(b.p.x,b.p.z).mu:b.support.material.mu):.72,sv=b.support?.v||V();
b.stats={g:at.g,rho:at.rho,p:at.p,weight,normal:b.normal,mu,drag:b.drag||0,strength:clamp((L.human.sustainedSupport-weight)/1200,0,1),status:''};
if(b.mode==='bike'){
 const fw=V(Math.sin(b.yaw),0,-Math.cos(b.yaw)),rt=V(Math.cos(b.yaw),0,Math.sin(b.yaw)),u=dot(b.v,fw),side=dot(b.v,rt),steer=clamp(input.steer||0,-1,1)*.5;
 let available=clamp((3000-weight)/(3000-118*G),0,1),power=input.forward>0?(input.run?450:250)*input.forward*available:0;b.stats.power=power;
 if(ground&&normal>0){let drive=power/Math.max(2.5,Math.abs(u)),brake=input.brake||input.forward<0,roll=.012*normal,force=drive-Math.sign(u)*Math.min(roll,Math.abs(u)*b.mass/dt);if(brake)force=-clamp(u*b.mass/dt,-mu*normal,mu*normal);
 let torque=0;for(let front of [false,true]){let arm=(front?.85:-.85),angle=front?steer:0,axis=add(mul(fw,Math.cos(angle)),mul(rt,Math.sin(angle))),sideAxis=add(mul(rt,Math.cos(angle)),mul(fw,-Math.sin(angle))),local=(side+b.yawRate*arm)*Math.cos(angle)-u*Math.sin(angle),lat=-local*320,long=force/2,cap=mu*normal/2,k=Math.min(1,cap/Math.max(1e-9,Math.hypot(lat,long)));impulse(b,mul(add(mul(axis,long*k),mul(sideAxis,lat*k)),dt));torque+=arm*(lat*k*Math.cos(angle)+long*k*Math.sin(angle));}b.yawRate+=torque/90*dt;
 }b.yaw+=b.yawRate*dt;b.stats.status=available===0?'Load exceeds modeled pedaling strength':ground?'Pedal power / tire grip':'Airborne · no tire authority';b.boundBlend=0;return;
}
wingControl(w,b,input,dt);normal=Math.max(0,normal-Math.max(0,b.wingStats.force?.y||0));
if(traversalControl(w,b,input,dt,weight))return;
if(b.swimming){swimControl(w,b,input,dt);return;}
if(b.wingSize&&!ground&&!b.swimming){b.gait={type:'wing',phase:0,cadence:0};b.airTime+=dt;b.stats.cadence=0;b.stats.stepLength=0;b.stats.status=at.rho===0?'Wing strokes · no air to push':b.wingStats.frequency>0?'Flight controls · directional wing strokes':'Gliding · release controls to rest';let wish=b.wingAim;if(Math.hypot(wish.x,wish.z)>.1){let target=Math.atan2(wish.x,-wish.z),delta=Math.atan2(Math.sin(target-b.yaw),Math.cos(target-b.yaw));b.yawRate=clamp(delta*3,-1.5,1.5);b.yaw+=b.yawRate*dt;}return;}
if(at.g<=.015){if(len(b.moveIntent)>.05||input.jump){let wish=len(b.moveIntent)>.05?b.moveIntent:input.aim||V(0,1,0);if(input.jump&&len(b.moveIntent)>.05)wish=unit(add(wish,V(0,.65,0)));pushOff(w,wish);}b.gait={type:'float',phase:0,cadence:0};b.stats.cadence=0;b.stats.stepLength=0;b.stats.status=b.pushVisual>0?'Contact push · friction-limited impulse':b.contacts.length?'Touching surface · choose a direction to push':'Free drift · direction needs contact, air wings or recoil';orient(b,b.moveIntent,dt);return;}
if(ratio>2.8&&ground){crawlControl(w,b,input,dt,weight,mu);return;}
const H=L.human;let move=V(input.x||0,0,input.z||0),mag=Math.min(1,len(move));if(len(move)>1)move=unit(move);
let speed=Math.hypot(b.v.x,b.v.z),command=input.run?H.runSpeed:H.walkSpeed,target=command;
if(b.wading)target=Math.min(target,.75);
if(ratio>1.5)target*=clamp(1-(ratio-1.5)*.36,.35,1);
const effectiveG=Math.max(0,weight/b.mass),plan=L.plan(speed,effectiveG,weight,b.mass,!!input.run);
b.stats.targetSpeed=target*mag;b.stats.speed=speed;b.stats.cadence=mag>.05||speed>.12?plan.cadence:0;
b.stats.stepLength=plan.cadence>0?speed*60/plan.cadence:0;b.stats.contactTime=plan.contact;b.stats.flightTime=plan.flight;
const loadCapacity=clamp((H.sustainedSupport-weight)/1000,0,1),muscleLimit=H.horizontalForce*loadCapacity;
const useFlight=!b.wading&&plan.usesFlight&&mag>.1&&!b.jumpPreparing&&b.takeoff!=='jump'&&b.takeoff!=='push'&&ratio<2.5;
if(ground&&at.g>.015){
 if(!b.gaitActive&&useFlight){b.stanceTime=0;b.gaitStep=Math.floor(b.walkPhase*2);b.stepSide=b.gaitStep%2===0?-1:1;}b.gaitActive=useFlight;
 const supportNormal=useFlight?plan.normal:normal,gripLimit=mu*supportNormal;
 const dragK=.5*at.rho*b.cdA,dragForce=dragK*speed*speed;
 const coastLoss=useFlight?Math.min(.15,dragForce/b.mass*plan.flight*.5):0;
 let desired=add(mul(move,target+coastLoss),sv),err=V(desired.x-b.v.x,0,desired.z-b.v.z);
 let f=mul(err,b.mass*6),feed=mag>.1?mul(unit(move),dragK*target*target*(useFlight?1+plan.flight/plan.contact:1)):V();f=add(f,feed);
 const powerLimit=H.horizontalPower/Math.max(1.2,speed),maxForce=Math.min(muscleLimit,powerLimit,gripLimit);
 if(len(f)>maxForce)f=mul(unit(f),maxForce);impulse(b,mul(f,dt));
 b.stats.effort=maxForce>0?len(f)/maxForce:0;b.stats.tractionLimited=gripLimit<Math.min(muscleLimit,powerLimit)&&len(err)>.12;
 b.stats.forceLimited=len(err)>.18&&len(f)>maxForce*.97;b.stats.supportForce=supportNormal;
 b.stanceTime+=dt;
 if(input.jump&&!b.jumpPreparing&&b.cooldown===0&&weight<H.peakLegForce-300){b.jumpPreparing=true;b.jumpPrep=0;b.gaitActive=false;}
 if(b.jumpPreparing){b.jumpPrep+=dt;if(b.jumpPrep>=.18){let energy=Math.max(0,Math.min(H.jumpEnergy,(H.peakLegForce-weight)*.32)),dv=Math.sqrt(2*energy/b.mass),horizontal=mag>.05?sub(mul(move,input.run?3:1.8),V(b.v.x,0,b.v.z)):V();if(len(horizontal)>1.5)horizontal=mul(unit(horizontal),1.5);if(len(horizontal)>mu*dv)horizontal=mul(unit(horizontal),mu*dv);let work=Math.max(0,b.mass*(dot(b.v,horizontal)+.5*dot(horizontal,horizontal)));if(work>energy*.45){horizontal=mul(horizontal,energy*.45/work);work=Math.max(0,b.mass*(dot(b.v,horizontal)+.5*dot(horizontal,horizontal)));}dv=Math.sqrt(2*Math.max(0,energy-work)/b.mass);if(len(horizontal)>mu*dv)horizontal=mul(unit(horizontal),mu*dv);b.v=add(b.v,horizontal);b.v.y+=dv;b.launchV=dv;b.takeoff='jump';b.jumpPreparing=false;b.cooldown=.35;b.grounded=false;b.airTime=0;b.jumpSerial++;}}
 else if(useFlight&&b.stanceTime>=plan.contact&&b.cooldown===0){
   b.v.y+=plan.launch;b.launchV=plan.launch;b.takeoff='gait';b.grounded=false;b.airTime=0;b.boundCount++;
   b.gaitLaunch={...plan};
 }
}else{
 b.stats.effort=0;if(input.jump&&at.g<=.015)pushOff(w,input.aim||V(0,1,0));
 if(b.jumpPreparing){b.jumpPreparing=false;b.jumpPrep=0;}
}
if(!ground)b.airTime+=dt;else b.airTime=0;
if(b.takeoff==='gait'&&!b.grounded){
 let q=b.gaitLaunch||plan,progress=clamp((q.contact+b.airTime)/(q.contact+q.flight),0,.999);
 b.gait={...q,phase:((b.gaitStep%2)+progress)/2,step:b.gaitStep,progress,type:q.type};
}else if(useFlight&&b.grounded){let progress=clamp(b.stanceTime/(plan.contact+plan.flight),0,.99);b.gait={...plan,phase:((b.gaitStep%2)+progress)/2,step:b.gaitStep,progress};}
else{
 const moving=clamp(speed/.25,0,1);if(ground&&!b.jumpPreparing)b.walkPhase=(b.walkPhase+plan.cadence/120*dt*moving)%1;
 b.gait={...plan,phase:b.walkPhase,step:Math.floor(b.walkPhase*2),progress:(b.walkPhase*2)%1,type:at.g<=.015?'float':!ground?'flight':speed>.1?'walk':'idle',usesFlight:false};
}
b.boundBlend+=(Math.max(0,(b.gait.type==='run'?1:b.gait.type==='lope'?.45:0))-b.boundBlend)*(1-Math.exp(-dt*8));
if(at.g<=.015||speed<.1||b.takeoff==='jump'||b.takeoff==='push'){b.stats.cadence=0;b.stats.stepLength=0;}
let desiredYaw=speed>.18?Math.atan2(b.v.x,-b.v.z):mag>.1?Math.atan2(move.x,-move.z):b.yaw;
if(mag<.1&&speed<.15&&ratio<1.8&&input.aim){let focus=Math.atan2(input.aim.x,-input.aim.z),lookDelta=Math.atan2(Math.sin(focus-b.yaw),Math.cos(focus-b.yaw));if(Math.abs(lookDelta)>.8)desiredYaw=b.yaw+lookDelta-Math.sign(lookDelta)*.7;}
let delta=Math.atan2(Math.sin(desiredYaw-b.yaw),Math.cos(desiredYaw-b.yaw));b.yawRate=clamp(delta*10,-5.2,5.2);b.yaw+=b.yawRate*dt;
if(b.wingSize&&!b.grounded){b.stats.cadence=0;b.stats.stepLength=0;}
b.stats.status=b.wading?'Wading · feet use submerged steps':b.wingSize&&!b.grounded?(b.wingStats.stall?'Wing flight · stalled flow':b.wingStats.power>1?'Wing-powered flight':'Gliding · arms resting'):ratio>1.7?'Increased load · flexed walking stance':at.g<.015?(oldContacts.length?'Contact · Space pushes away':'Free drift · throw for recoil'):b.stats.tractionLimited?'Grip limits acceleration':b.stats.forceLimited?'Force / drag limit':!b.grounded?(b.takeoff==='gait'?'Ballistic stride · no air steering':'Ballistic flight'):b.gait.type==='run'?'Alternating running stance':b.gait.type==='lope'?'Low-gravity loping stance':'Heel-to-toe walking';

}
// Fully frozen pool: a rigid translational aggregate. Rotation and fracture
// are deliberately omitted; contact impulse still recoils the finite ice mass.
function collideIce(w,b,dt){let f=w.water;if(!f.frozen||!f.active)return;let best=null;for(let sample of samples(b))for(let i of F.near(f,sample.p.x,sample.p.y,sample.p.z,sample.r+.3)){let p=f.particles[i],d=sub(sample.p,p),r=len(d),depth=sample.r+.26-r;if(depth>0&&r>1e-7&&(!best||depth>best.depth))best={n:mul(d,1/r),depth};}if(!best)return;let n=best.n,mass=f.thermal.mass,relative=sub(b.v,f.frozen.v),vn=dot(relative,n),j=vn<0?-vn/(b.inv+1/mass):0;impulse(b,mul(n,j));f.frozen.v=sub(f.frozen.v,mul(n,j/mass));b.p=add(b.p,mul(n,best.depth));b.contacts.push({n,velocity:f.frozen.v,solid:'pool-ice',mu:.045,normalImpulse:j});if(n.y>.7){b.grounded=true;b.support={id:'pool-ice',v:f.frozen.v,material:materials.ice};b.normal+=j/dt;}}
function step(w,input={},dt=DT){w.time+=dt;w.stepCount++;let b=w.player,all=[b,...w.balls,...w.droppedWings];
b.waterSample=F.sample(w.water,b,w.settings.gravity*G);b.submerged=b.waterSample.fraction;if(b.mode==='bike'&&b.submerged>.4){dismount(w);w.log.push('Bicycle left in the water');}
let lift=w.solids.find(s=>s.id==='lift'),old=lift.y,target=w.lift.on?4.1:.15,maxStep=.65*dt;lift.y+=clamp(target-lift.y,-maxStep,maxStep);lift.min.y=lift.y-.15;lift.max.y=lift.y+.15;lift.v.y=(lift.y-old)/dt;
controlPlayer(w,input,dt);
if(w.held){let o=w.held,target=gripTarget(w,input.aim),err=sub(target,o.p),relative=sub(o.v,b.v),f=sub(mul(err,650),mul(relative,45)),max=220;if(len(f)>max)f=mul(unit(f),max);impulse(o,mul(f,dt));impulse(b,mul(f,-dt));if(len(err)>2.2){w.held=null;w.log.push('Grip lost');}}
for(let o of all){if(o.anchored){o.v=V();continue;}let at=w.air(o.p.y),oldGround=o.grounded;o.grounded=false;o.normal=0;o.contacts=[];o.impact=0;let wet=o===b?b.waterSample:F.sample(w.water,o,at.g),fraction=wet.fraction; o.submerged=fraction;
if(w.water.active&&!w.water.frozen)F.detail.observe(w.water.detail,o,wet,at.g,at.rho,dt);
o.v.y-=at.g*(1-at.rho*o.volume*(1-fraction)/o.mass)*dt;dragStep(o,{...at,rho:at.rho*(1-fraction)},dt);
if(fraction>0){let before={...o.v};o.v.y+=w.water.rho*o.volume*fraction*at.g/o.mass*dt;let relative=sub(o.v,wet.flow),k=.5*w.water.rho*o.cdA*fraction*(1+8*(w.water.iceFraction||0)),scale=1/(1+k*len(relative)*dt/o.mass);o.v=add(wet.flow,mul(relative,scale));F.react(w.water,wet.ids,mul(sub(o.v,before),o.mass),o.p);}
o.p=add(o.p,mul(o.v,dt));
if(o.rope){let d=sub(o.p,o.rope.anchor),l=len(d);if(l>o.rope.length){let n=unit(d),vn=dot(o.v,n);o.p=add(o.rope.anchor,mul(n,o.rope.length));if(vn>0)o.v=sub(o.v,mul(n,vn));}}
collideStatic(w,o,dt);collideIce(w,o,dt);if(o===b&&!oldGround&&o.grounded){b.landing=clamp(o.impact/5,0,1);b.stanceTime=0;if(b.takeoff==='gait'){b.gaitStep++;b.stepSide=b.gaitStep%2===0?-1:1;b.walkPhase=(b.gaitStep%2)/2;}else{b.takeoff='none';b.gaitActive=false;}}
if(o.id.startsWith('drop-')&&w.drop.released&&o.grounded&&!w.drop.landings[o.id])w.drop.landings[o.id]=w.time-w.drop.time;
}
for(let pass=0;pass<3;pass++){for(let o of w.balls){if(o===w.held)continue;collidePair(b,o);}for(let i=0;i<w.balls.length;i++)for(let j=i+1;j<w.balls.length;j++)if(!w.balls[i].anchored)collidePair(w.balls[i],w.balls[j]);}
for(let gear of w.droppedWings){collidePair(b,gear);for(let ball of w.balls)if(!ball.anchored)collidePair(gear,ball);}
// Resolve static boundaries after pair separation, so no body can be pushed through a wall.
for(let o of all)if(!o.anchored){collideStatic(w,o,dt);collideIce(w,o,dt);}
const nearPool=b.p.x>10&&b.p.x<34&&b.p.z< -29;w.water.accumulator+=dt;if(w.water.accumulator>=1/30){w.water.accumulator-=1/30;F.thermalStep(w.water,w.settings.pressure,w.settings.gravity*G,1/30);F.detail.update(w.water.detail,1/30,w.settings.gravity*G,w.air(0).rho,(x,z)=>F.surfaceAt(w.water,x,z),1-(w.water.iceFraction||0));if(nearPool||w.water.awake){let substeps=w.settings.gravity>2?2:1;for(let i=0;i<substeps;i++)F.advance(w.water,w.settings.gravity*G,w.settings.pressure,1/(30*substeps),all.filter(o=>!o.anchored&&o.submerged>.01),w.solids.filter(q=>!q.id.startsWith('floor')&&!['ceiling','west','east','north','south','pool-bottom','pool-west','pool-east','pool-north','pool-south'].includes(q.id)));}}
S.step(w,dt,{samples,impulse});
return w;}
function kinetic(b){return .5*b.mass*dot(b.v,b.v)+(b.kind==='ball'?.5*b.inertia*dot(b.w,b.w):0);}
const api={waterStations:S,fluid:F,wings:W,nearWingStand,nearDroppedWing,dropWings,useNearby,equipWings,relocate,locomotion:L,G,DT,V,add,sub,mul,dot,cross,len,unit,clamp,airAtPressure,atmosphere,materials,floorMaterial,makeBall,makeWorld,setEnvironment,step,grab,throwHeld,pushOff,releaseDrop,resetDrop,switchBike,dismount,recover,gripTarget,floorHeight,surfaceAhead,kinetic,dragStep,collidePair};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LabPhysics=api;
})(globalThis);

