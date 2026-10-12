/* Secondary surface and spray visualization. Does not add fluid mass or forces.
   Sources come from actual entry velocity / near-surface motion. Main coupling
   remains in fluid.js. Spray follows gravity and air drag; ripples use linear
   gravity-capillary dispersion, with approximate reflected image sources. */
(function(root){'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),bounds={x0:18,x1:26,z0:-48,z1:-38};
function create(){return{time:0,seed:1741,events:[],spray:[],history:new Map(),emitted:0,impacts:0};}
function rand(d){d.seed=(Math.imul(d.seed,1664525)+1013904223)>>>0;return d.seed/4294967296;}
function emit(d,point,velocity,energy,g,rho,kind='entry',scale=.35){if(energy<.015)return;const spread=clamp(scale,.18,.65),k=2/spread,depth=1.7,c=Math.sqrt((g/k+.072*k/998.2)*Math.tanh(k*depth));
let amplitude=Math.min(.13,Math.sqrt(energy*.012/(998.2*Math.max(.2,g)*Math.PI*spread*spread)));d.events.push({x:point.x,z:point.z,y:point.y,age:0,c,spread,amplitude,energy,kind});if(d.events.length>24)d.events.shift();d.impacts+=kind==='entry'?1:0;
if(kind!=='entry'||energy<1)return;
let count=Math.min(100,Math.max(8,Math.ceil(Math.sqrt(energy)*5))),budget=energy*.025,used=0;
for(let i=0;i<count&&d.spray.length<600;i++){let a=2*Math.PI*i/count+rand(d)*.2,r=.004+rand(d)*.011,m=998.2*4/3*Math.PI*r**3,speed=Math.min(5.5,Math.sqrt(energy)*.16)*( .6+rand(d)*.6),vx=Math.cos(a)*speed*.6+velocity.x*.22,vz=Math.sin(a)*speed*.6+velocity.z*.22,vy=speed*(.8+rand(d)*.7),cost=.5*m*(vx*vx+vy*vy+vz*vz);if(used+cost>budget)break;used+=cost;d.spray.push({x:point.x+Math.cos(a)*spread*.5,y:point.y+.025,z:point.z+Math.sin(a)*spread*.5,vx,vy,vz,r,age:0,life:g>.015?5:12});d.emitted++;}
}
function observe(d,b,sample,g,rho,dt){let last=d.history.get(b.id),wet=sample.fraction||0,top=sample.surface;let next={wet,x:b.p.x,y:b.p.y,z:b.p.z,cooldown:Math.max(0,(last?.cooldown||0)-dt)};
if(Number.isFinite(top)&&wet>0&&b.p.x>18&&b.p.x<26&&b.p.z>-48&&b.p.z<-38){let vx=b.v.x-(sample.flow?.x||0),vy=b.v.y-(sample.flow?.y||0),vz=b.v.z-(sample.flow?.z||0),entry=(!last||last.wet<.025)&&wet>=.025&&vy<-.3;
 if(entry){let energy=.5*b.mass*(vy*vy+.2*(vx*vx+vz*vz))*Math.min(.6,wet+.15);emit(d,{x:b.p.x,y:top,z:b.p.z},{x:vx,y:vy,z:vz},energy,g,rho,'entry',b.r);next.cooldown=.22;}
 else if(last&&next.cooldown===0&&wet>.03){let speed=Math.hypot(vx,vz),depth=Math.max(0,top-(b.p.y+b.height*.45));if(speed>.14&&depth<1.1){let energy=.5*998.2*(b.cdA||.1)*speed**3*.22*.08*Math.exp(-depth*4);emit(d,{x:b.p.x,y:top,z:b.p.z},{x:vx,y:vy,z:vz},energy,g,rho,'wake',b.r);next.cooldown=.22;}}
}d.history.set(b.id,next);}
function update(d,dt,g,rho,surface,liquid=1){d.time+=dt;for(let e of d.events)e.age+=dt;d.events=d.events.filter(e=>e.age<6&&liquid>.1);
for(let p of d.spray){p.age+=dt;p.vy-=g*dt;let speed=Math.hypot(p.vx,p.vy,p.vz),k=.5*rho*.47*Math.PI*p.r*p.r/(998.2*4/3*Math.PI*p.r**3),factor=1/(1+k*speed*dt);p.vx*=factor;p.vy*=factor;p.vz*=factor;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;let inside=p.x>18&&p.x<26&&p.z>-48&&p.z<-38;
if((inside&&p.vy<0&&p.y<surface(p.x,p.z))||(!inside&&p.y<.01))p.age=p.life;
}d.spray=d.spray.filter(p=>p.age<p.life&&p.y>-2.4&&p.y<24&&liquid>.1);}
function height(d,x,z){let sum=0;for(let e of d.events){let radius=e.c*e.age,width=e.spread*(1+.18*e.age),atten=Math.exp(-e.age*1.15)/Math.sqrt(1+radius/e.spread),sources=[[e.x,e.z,1]];
if(radius+width>e.x-18)sources.push([36-e.x,e.z,.45]);if(radius+width>26-e.x)sources.push([52-e.x,e.z,.45]);if(radius+width>e.z+48)sources.push([e.x,-96-e.z,.45]);if(radius+width>-38-e.z)sources.push([e.x,-76-e.z,.45]);
for(let [sx,sz,gain]of sources){let q=(Math.hypot(x-sx,z-sz)-radius)/width;if(Math.abs(q)>3.5)continue;sum+=gain*e.amplitude*atten*(1-q*q)*Math.exp(-.5*q*q);}}
return clamp(sum,-.16,.16);}
const api={create,emit,observe,update,height};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LabWaterDetail=api;
})(globalThis);
