/* Coarse 3-D position-based liquid, SI units. Equal parcel masses with thermal mass loss, density
   constraints, XSPH viscosity and weak pair cohesion; coupled bulk enthalpy model. */
(function(root){'use strict';
const Detail=typeof module!=='undefined'&&module.exports?require('./water-detail.js'):root.LabWaterDetail;
const Thermal=typeof module!=='undefined'&&module.exports?require('./water-thermal.js'):root.LabWaterThermal;
const bounds={x0:18,x1:26,z0:-48,z1:-38,bottom:-2.4},spacing=.5,h=.9,h2=h*h,volume=spacing**3,poly=315/(64*Math.PI*h**9),spiky=-45/(Math.PI*h**6),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const key=(x,y,z)=>x+','+y+','+z;
let restCache=null;
function create(){let particles=[];for(let x=0;x<16;x++)for(let z=0;z<20;z++)for(let y=0;y<4;y++){let px=18.25+x*spacing,py=-2.12+y*spacing,pz=-47.75+z*spacing;let stair=px>24.18&&px<25.82&&pz>-41.62&&pz<-37.88&&py<-.4*Math.max(0,Math.floor((-38-pz)/.65))+.12;if(!stair)particles.push({x:px,y:py,z:pz,vx:0,vy:0,vz:0,ox:px,oy:py,oz:pz,lambda:0});}let f={particles,hash:new Map(),rho:998.2,active:true,awake:false,time:0,steps:0,maxSpeed:0,accumulator:0,phase:'liquid',particleMass:998.2*volume};hash(f);if(restCache){for(let [i,p]of particles.entries())Object.assign(p,restCache[i]);hash(f);}else{for(let i=0;i<30;i++){advance(f,0,1);for(let p of particles)p.vx=p.vy=p.vz=0;}restCache=particles.map(p=>({...p}));}f.steps=0;f.time=0;f.maxSpeed=0;f.detail=Detail.create();f.thermal=Thermal.create(particles.length*f.particleMass);return f;}
function properties(atm,T=293.15,iceFraction=0){return{rho:Thermal.density(T,atm,iceFraction),active:true,phase:atm*101325<Thermal.saturation(T)?'boiling / cooling':'liquid'};}
function thermalStep(f,atm,g,dt){let state=f.thermal;if(!state)return;Thermal.step(state,atm,dt);f.rho=Thermal.density(state.temperature,atm,state.iceFraction);f.particleMass=state.mass/f.particles.length;f.phase=state.mode;f.active=state.mass>.01;f.iceFraction=state.iceFraction;}
function hash(f){f.hash.clear();f.extent={x0:Infinity,x1:-Infinity,y0:Infinity,y1:-Infinity,z0:Infinity,z1:-Infinity};for(let i=0;i<f.particles.length;i++){let p=f.particles[i],k=key(Math.floor(p.x/h),Math.floor(p.y/h),Math.floor(p.z/h));for(let a of ['x','y','z']){f.extent[a+'0']=Math.min(f.extent[a+'0'],p[a]);f.extent[a+'1']=Math.max(f.extent[a+'1'],p[a]);}if(!f.hash.has(k))f.hash.set(k,[]);f.hash.get(k).push(i);}}
function near(f,x,y,z,r=h){let out=[],cx=Math.floor(x/h),cy=Math.floor(y/h),cz=Math.floor(z/h),n=Math.ceil(r/h);for(let a=-n;a<=n;a++)for(let b=-n;b<=n;b++)for(let c=-n;c<=n;c++){let list=f.hash.get(key(cx+a,cy+b,cz+c));if(list)for(let i of list)out.push(i);}return out;}
const basinSteps=Array.from({length:5},(_,i)=>({x0:24.3,x1:25.7,z0:-38.575-i*.65,z1:-37.925-i*.65,top:-.4*i}));
function projectBoundary(p){let r=.16,inside=p.x>bounds.x0&&p.x<bounds.x1&&p.z>bounds.z0&&p.z<bounds.z1;
 if(p.y<r){if(!inside&&p.ox>bounds.x0&&p.ox<bounds.x1&&p.oz>bounds.z0&&p.oz<bounds.z1&&p.oy<r){p.x=clamp(p.x,bounds.x0+r,bounds.x1-r);p.z=clamp(p.z,bounds.z0+r,bounds.z1-r);p.y=Math.max(p.y,bounds.bottom+r);}else if(!inside)p.y=Math.max(p.y,r);else{p.x=clamp(p.x,bounds.x0+r,bounds.x1-r);p.z=clamp(p.z,bounds.z0+r,bounds.z1-r);p.y=Math.max(p.y,bounds.bottom+r);}}
 for(let q of basinSteps){if(p.x>q.x0-r&&p.x<q.x1+r&&p.z>q.z0-r&&p.z<q.z1+r&&p.y<q.top+r){let options=[['x',q.x0-r],['x',q.x1+r],['z',q.z0-r],['z',q.z1+r],['y',q.top+r]];options=options.filter(([axis,value])=>axis!=='z'||value>bounds.z0+r&&value<bounds.z1-r);options.sort((a,b)=>Math.abs(p[a[0]]-a[1])-Math.abs(p[b[0]]-b[1]));p[options[0][0]]=options[0][1];}}
 p.x=clamp(p.x,-39.8,39.8);p.z=clamp(p.z,-54.8,54.8);p.y=Math.min(p.y,23.8);
}
function constrain(p){let old={x:p.x,y:p.y,z:p.z};projectBoundary(p);if(!p.boundaries)return;for(let a of ['x','y','z']){let delta=p[a]-old[a];if(Math.abs(delta)>1e-10){p['c'+a]+=delta;p.boundaries.add(a+(delta>0?'+':'-'));}}}
// Analytic poly6 half-space support supplies the kernel volume missing inside
// solid basin walls. Without it, the bottom particle layers over-compress.
function wallKernel(p){let a={density:0,x:0,y:0,z:0},planes=[[p.y-bounds.bottom,0,1,0]];if(p.y<.1)planes.push([p.x-bounds.x0,1,0,0],[bounds.x1-p.x,-1,0,0],[p.z-bounds.z0,0,0,1],[bounds.z1-p.z,0,0,-1]);for(let [d,x,y,z]of planes){if(d<0||d>=h)continue;let t=d/h,integral=t-4*t**3/3+6*t**5/5-4*t**7/7+t**9/9,gradient=-315/(256*h)*(1-t*t)**4;a.density+=315/256*(128/315-integral);a.x+=gradient*x;a.y+=gradient*y;a.z+=gradient*z;}return a;}
function freezeStep(f,g,dt){let ps=f.particles,n=ps.length;if(!f.frozen){let c={x:0,y:0,z:0},v={x:0,y:0,z:0};for(let p of ps)for(let a of ['x','y','z']){c[a]+=p[a]/n;v[a]+=p['v'+a]/n;}f.frozen={c,v,mass:f.thermal.mass,rho:f.rho,shape:ps.map(p=>({x:p.x-c.x,y:p.y-c.y,z:p.z-c.z}))};}
 let r=f.frozen,old={...r.c},scale=Math.cbrt(f.thermal.mass/r.mass*r.rho/f.rho);r.v.y-=g*dt;for(let a of ['x','y','z'])r.c[a]+=r.v[a]*dt;
 for(let pass=0;pass<2;pass++)for(let q of r.shape){let p={x:r.c.x+q.x*scale,y:r.c.y+q.y*scale,z:r.c.z+q.z*scale},before={...p};constrain(p);for(let a of ['x','y','z'])r.c[a]+=p[a]-before[a];}
 for(let a of ['x','y','z'])r.v[a]=(r.c[a]-old[a])/dt;
 for(let [i,p]of ps.entries())for(let a of ['x','y','z']){p[a]=r.c[a]+r.shape[i][a]*scale;p['v'+a]=r.v[a];}hash(f);
}
function advance(f,g,atm,dt=1/60,bodies=[],obstacles=[]){if(f.thermal){f.rho=Thermal.density(f.thermal.temperature,atm,f.thermal.iceFraction);}else Object.assign(f,properties(atm));if(!f.active)return;const vol=f.particleMass/f.rho,ps=f.particles;f.time+=dt;f.steps++;
 if((f.iceFraction||0)>.98||(f.frozen&&(f.iceFraction||0)>.90)){freezeStep(f,g,dt);return;}f.frozen=null;
 for(let p of ps){p.ox=p.x;p.oy=p.y;p.oz=p.z;p.cx=p.cy=p.cz=0;p.boundaries=new Set();p.vy-=g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;constrain(p);}hash(f);
 const lists=ps.map(p=>near(f,p.x,p.y,p.z).filter(j=>{let q=ps[j];return (p.x-q.x)**2+(p.y-q.y)**2+(p.z-q.z)**2<h2;}));
 for(let iteration=0;iteration<3;iteration++){
  for(let [i,p]of ps.entries()){let wall=wallKernel(p),density=wall.density,gx=wall.x,gy=wall.y,gz=wall.z,sum=0;for(let j of lists[i]){let q=ps[j],dx=p.x-q.x,dy=p.y-q.y,dz=p.z-q.z,r2=dx*dx+dy*dy+dz*dz;if(r2>=h2)continue;density+=vol*poly*(h2-r2)**3;if(r2<1e-9)continue;let r=Math.sqrt(r2),s=vol*spiky*(h-r)**2/r,ax=s*dx,ay=s*dy,az=s*dz;gx+=ax;gy+=ay;gz+=az;sum+=ax*ax+ay*ay+az*az;}p.lambda=-Math.max(0,density-1)/(sum+gx*gx+gy*gy+gz*gz+.025);}
  let corrections=ps.map((p,i)=>{let wall=wallKernel(p),dx=p.lambda*wall.x,dy=p.lambda*wall.y,dz=p.lambda*wall.z;for(let j of lists[i]){if(j===i)continue;let q=ps[j],x=p.x-q.x,y=p.y-q.y,z=p.z-q.z,r=Math.hypot(x,y,z);if(r<1e-6||r>=h)continue;let a=vol*(p.lambda+q.lambda)*spiky*(h-r)**2/r;dx+=a*x;dy+=a*y;dz+=a*z;}let scale=Math.min(1,.12/(Math.hypot(dx,dy,dz)||1));return[dx*scale,dy*scale,dz*scale];});
  for(let [i,p]of ps.entries()){p.x+=corrections[i][0];p.y+=corrections[i][1];p.z+=corrections[i][2];constrain(p);for(let q of obstacles){if(p.x>q.min.x-.12&&p.x<q.max.x+.12&&p.z>q.min.z-.12&&p.z<q.max.z+.12&&p.y>q.min.y-.12&&p.y<q.max.y+.12){let options=[['x',q.min.x-.12],['x',q.max.x+.12],['y',q.max.y+.12],['z',q.min.z-.12],['z',q.max.z+.12]];options.sort((a,b)=>Math.abs(p[a[0]]-a[1])-Math.abs(p[b[0]]-b[1]));p[options[0][0]]=options[0][1];}}}
 }
 // Kinematic body exclusion creates a displaced wake; analytical body forces
 // below return drag, buoyancy and swimming impulses to the liquid separately.
 for(let p of ps){for(let b of bodies){let y=clamp(p.y,b.p.y-b.height*.32,b.p.y+b.height*.32),dx=p.x-b.p.x,dy=p.y-y,dz=p.z-b.p.z,r=Math.hypot(dx,dy,dz),radius=(b.r||.3)+.13;if(r<radius&&r>1e-7){let s=(radius-r)/r;p.x+=dx*s;p.y+=dy*s;p.z+=dz*s;}}constrain(p);p.vx=(p.x-p.ox-p.cx)/dt;p.vy=(p.y-p.oy-p.cy)/dt;p.vz=(p.z-p.oz-p.cz)/dt;for(let contact of p.boundaries){let a='v'+contact[0];p[a]=contact[1]==='+'?Math.max(0,p[a]):Math.min(0,p[a]);}}
 // Symmetric velocity exchange dissipates relative kinetic energy.
 for(let [i,p]of ps.entries())for(let j of lists[i])if(j>i){let q=ps[j],r2=(p.x-q.x)**2+(p.y-q.y)**2+(p.z-q.z)**2;if(r2>=h2)continue;let a=Math.min(.08,vol*poly*(h2-r2)**3*(.02+.5*(f.iceFraction||0))),dx=(q.vx-p.vx)*a,dy=(q.vy-p.vy)*a,dz=(q.vz-p.vz)*a;p.vx+=dx;p.vy+=dy;p.vz+=dz;q.vx-=dx;q.vy-=dy;q.vz-=dz;
  let r=Math.sqrt(r2);if(r>.1){let a=.072/(f.rho*spacing*spacing)*(1-r/h)*dt/r;p.vx+=(q.x-p.x)*a;p.vy+=(q.y-p.y)*a;p.vz+=(q.z-p.z)*a;q.vx-=(q.x-p.x)*a;q.vy-=(q.y-p.y)*a;q.vz-=(q.z-p.z)*a;}}
 f.maxSpeed=0;for(let p of ps)f.maxSpeed=Math.max(f.maxSpeed,Math.hypot(p.vx,p.vy,p.vz));hash(f);
}
function surfaceAt(f,x,z){let ix=Math.round((x-18.25)/.5),iz=Math.round((z+47.75)/.5),sum=0,weight=0;
 if(f.surfaceStamp!==f.steps){f.surfaceStamp=f.steps;f.columns=new Float64Array(320).fill(-Infinity);for(let p of f.particles){let a=Math.round((p.x-18.25)/.5),b=Math.round((p.z+47.75)/.5);if(a>=0&&a<16&&b>=0&&b<20)f.columns[b*16+a]=Math.max(f.columns[b*16+a],p.y+.23*Math.cbrt(f.particleMass/(998.2*volume)));}}
 for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){let a=ix+dx,b=iz+dz;if(a<0||a>=16||b<0||b>=20)continue;let y=f.columns[b*16+a];if(!Number.isFinite(y))continue;let distance=(18.25+a*.5-x)**2+(-47.75+b*.5-z)**2,w=Math.exp(-distance/.3);sum+=w*y;weight+=w;}
 return weight>0?sum/weight:bounds.bottom;
}
function sample(f,b,g){let e=f.extent,p0=b.p,outside=p0.x<e.x0-1.8||p0.x>e.x1+1.8||p0.y<e.y0-1.8||p0.y>e.y1+1.8||p0.z<e.z0-1.8||p0.z>e.z1+1.8;if(!f.active||outside||f.frozen)return{fraction:0,flow:{x:0,y:0,z:0},ids:[],pressure:0};const p=b.p,r=b.r||.3;let ids=near(f,p.x,p.y,p.z,1.8).filter(i=>{let q=f.particles[i];return Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z)<1.8;});if(!ids.length)return{fraction:0,flow:{x:0,y:0,z:0},ids,pressure:0};let top=-Infinity,flow={x:0,y:0,z:0},count=0,fill=0;
 for(let i of ids){let q=f.particles[i],horizontal=Math.hypot(q.x-p.x,q.z-p.z);if(horizontal<1.0)top=Math.max(top,q.y+.25);flow.x+=q.vx;flow.y+=q.vy;flow.z+=q.vz;count++;let d=Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z);if(d<h)fill+=(f.particleMass/f.rho)*poly*(h2-d*d)**3;}
 flow.x/=count;flow.y/=count;flow.z/=count;if(g>.015&&p.x>bounds.x0&&p.x<bounds.x1&&p.z>bounds.z0&&p.z<bounds.z1)top=surfaceAt(f,p.x,p.z);let fraction=g>.015&&p.x>bounds.x0&&p.x<bounds.x1&&p.z>bounds.z0&&p.z<bounds.z1?clamp((top-(p.y-b.height/2))/b.height,0,1):clamp(fill/.60,0,1);
 return{fraction,flow,ids,pressure:f.rho*g*Math.max(0,top-p.y),surface:top};
}
function react(f,ids,j,point){if(!ids.length)return;let weights=ids.map(i=>{let p=f.particles[i];return point?Math.exp(-((p.x-point.x)**2+(p.y-point.y)**2+(p.z-point.z)**2)/.65):1;}),sum=weights.reduce((a,b)=>a+b,0);if(sum<1e-12)return;for(let [k,i]of ids.entries()){let q=f.particles[i],factor=weights[k]/(f.particleMass*sum);q.vx-=j.x*factor;q.vy-=j.y*factor;q.vz-=j.z*factor;}f.awake=true;}
// Equal-mass parcels share transferred mass. Local velocity correction preserves
// the prescribed incoming/outgoing momentum despite that coarse redistribution.
function exchange(f,dm,specificEnergy,velocity,point,atm){let state=f.thermal,old=state.mass,next=old+dm;if(next<.01)return false;
 let mean={x:0,y:0,z:0};for(let p of f.particles)for(let a of ['x','y','z'])mean[a]+=p['v'+a]/f.particles.length;
 state.mass=next;state.energy+=dm*specificEnergy;state.boundaryMass=(state.boundaryMass||0)+dm;state.boundaryEnergy=(state.boundaryEnergy||0)+dm*specificEnergy;Thermal.decode(state,atm*101325);
 f.particleMass=next/f.particles.length;f.rho=Thermal.density(state.temperature,atm,state.iceFraction);f.iceFraction=state.iceFraction;f.active=true;
 let ids=near(f,point.x,point.y,point.z,1.4);if(!ids.length)ids=f.particles.map((_,i)=>i);
 if(f.frozen){for(let a of ['x','y','z'])f.frozen.v[a]=(old*f.frozen.v[a]+dm*velocity[a])/next;for(let p of f.particles)for(let a of ['x','y','z'])p['v'+a]=f.frozen.v[a];}else react(f,ids,{x:-dm*(velocity.x-mean.x),y:-dm*(velocity.y-mean.y),z:-dm*(velocity.z-mean.z)},point);f.surfaceStamp=-1;f.awake=true;return true;
}
const api={exchange,detail:Detail,thermal:Thermal,thermalStep,surfaceAt,near,create,advance,properties,sample,react,bounds,spacing,h};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LabFluid=api;
})(globalThis);
