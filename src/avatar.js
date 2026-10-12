/* Rounded articulated expedition suit. Foot placement uses terrain-aware two-bone IK.
   Ballistic motion comes exclusively from the physical body, not animation. */
(function(root){'use strict';
root.createAuroraAvatar=function(T,P,materials){
const {orange,white,dark,rubber,glass,steel}=materials,root=new T.Group(),torso=new T.Group();root.add(torso);const axis=new T.Vector3(0,1,0),v=(x,y,z)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
function ellipsoid(parent,material,x,y,z,sx,sy,sz){let o=new T.Mesh(new T.SphereGeometry(1,16,12),material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function capsule(parent,material,radius,length){let o=new T.Mesh(new T.CapsuleGeometry(radius,length,5,12),material);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
ellipsoid(torso,orange,0,.27,0,.238,.32,.155);ellipsoid(torso,dark,0,.025,0,.18,.115,.14);ellipsoid(torso,white,0,.31,.165,.165,.22,.075);ellipsoid(torso,steel,0,.29,.225,.12,.14,.035);
const neck=ellipsoid(torso,dark,0,.56,0,.095,.085,.095),head=new T.Group();head.position.set(0,.71,0);torso.add(head);
ellipsoid(head,white,0,0,0,.186,.225,.185);ellipsoid(head,dark,0,-.01,-.125,.153,.171,.084);ellipsoid(head,glass,0,.015,-.165,.137,.133,.035);ellipsoid(head,white,0,-.16,-.08,.145,.048,.1);for(let s of [-1,1])ellipsoid(head,steel,s*.183,-.015,0,.024,.085,.07);
ellipsoid(torso,white,-.12,.27,-.146,.035,.095,.019);ellipsoid(torso,dark,.12,.28,-.151,.048,.07,.02);
function limb(material,r1,r2,L1,L2){return{upper:capsule(root,material,r1,L1-2*r1),lower:capsule(root,material,r2,L2-2*r2),joint:ellipsoid(root,dark,0,0,0,r2*1.06,r2*1.06,r2*1.06),L1,L2,r1,r2};}
const legs=[-1,1].map(s=>{let l=limb(orange,.094,.076,.43,.43);l.side=s;l.boot=ellipsoid(root,rubber,0,0,0,.102,.08,.175);l.toe=ellipsoid(l.boot,dark,0,0,-.35,.9,.75,.55);l.kneePad=ellipsoid(root,dark,0,0,0,.092,.09,.035);l.anchor=null;l.swingStart=null;l.wasStance=true;return l;});
const arms=[-1,1].map(s=>{let l=limb(orange,.075,.061,.29,.27);l.side=s;l.hand=ellipsoid(root,rubber,0,0,0,.067,.09,.062);ellipsoid(l.hand,rubber,s*.65,0,-.18,.45,.65,.6);l.shoulder=ellipsoid(root,orange,0,0,0,.095,.10,.095);return l;});
// Lightweight arm-attached membranes with visible spars. Size is physical metres.
const wingOutlines=[null,[[0,-.1],[1,0],[.9,.35],[.22,.8]],[[0,-.1],[1,0],[.92,.42],[.45,1],[.1,.85]],[[0,-.1],[1,0],[.93,.3],[.78,.58],[.54,1],[.10,1.12]]];
const wingPanels=[-1,1].map(side=>{let group=new T.Group(),membrane=new T.Mesh(new T.BufferGeometry(),new T.MeshStandardMaterial({side:T.DoubleSide,roughness:.5,metalness:.08})),spars=new T.Group();group.add(membrane,spars);root.add(group);return{group,membrane,spars,side,size:0,area:1};});
const harness=[-1,1].map(side=>({side,rod:new T.Mesh(new T.CylinderGeometry(.022,.022,1,8),steel)}));for(let h of harness)root.add(h.rod);
function fitWingMesh(w,size){if(w.size===size)return;w.size=size;let points=wingOutlines[size],shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();let geo=new T.ShapeGeometry(shape);geo.rotateX(Math.PI/2);w.membrane.geometry.dispose();w.membrane.geometry=geo;w.area=Math.abs(points.reduce((a,p,i)=>{let q=points[(i+1)%points.length];return a+p[0]*q[1]-q[0]*p[1];},0))*.5;for(let child of [...w.spars.children]){child.geometry.dispose();w.spars.remove(child);}for(let [x,z]of points.slice(1)){let end=v(x,0,z),rod=new T.Mesh(new T.CylinderGeometry(.009,.009,end.length(),6),steel);rod.position.copy(end).multiplyScalar(.5);rod.quaternion.setFromUnitVectors(axis,end.clone().normalize());w.spars.add(rod);}}
function segment(mesh,a,b,nominal){mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(axis,b.clone().sub(a).normalize());mesh.scale.y=a.distanceTo(b)/nominal;}
function poseLimb(l,a,k,b){segment(l.upper,a,k,l.L1);segment(l.lower,k,b,l.L2);l.joint.position.copy(k);}
function solve(hip,ankle,L1,L2,bend){let dir=ankle.clone().sub(hip),dist=clamp(dir.length(),.08,L1+L2-.008);dir.normalize();let along=(L1*L1-L2*L2+dist*dist)/(2*dist),h=Math.sqrt(Math.max(0,L1*L1-along*along));let normal=bend.clone().addScaledVector(dir,-bend.dot(dir)).normalize();return hip.clone().addScaledVector(dir,along).addScaledVector(normal,h);}
const smooth=(a,b,k)=>a+(b-a)*(1-Math.exp(-Math.max(0,k))),ease=x=>{let t=clamp(x,0,1);return t*t*(3-2*t);},wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
const motion={time:0,hipY:.94,pitch:0,roll:0,headYaw:0,headPitch:0,spineYaw:0,run:0,ax:0,az:0,vx:0,vz:0,phase:0,state:'stand',wasGrounded:true};
function update(b,dt,current,visible,view={}){
 root.visible=visible;root.position.set(b.x,b.y,b.z);root.rotation.set(0,-b.yaw,0);if(current?.model)root.quaternion.copy(current.model.root.quaternion);
 const g=Math.max(0,P.atmosphere(b.y).g),speed=Math.hypot(b.vx,b.vz),q=b.gait||{phase:0,duty:.6,type:'idle',reach:0,contact:.6,flight:0},phase=q.phase||0;
 const climbing=!!b.traversal,treading=!!b.treading,swimming=!!b.swimming,crawling=q.type==='crawl',prone=b.prone||0,winged=(b.wingSize||0)>0&&(b.wingSpread||0)>.12;
 let airStroke=b.wingStats?.direction||{x:0,y:1,z:0},stroke=v(Math.cos(b.yaw)*airStroke.x+Math.sin(b.yaw)*airStroke.z,airStroke.y,-Math.sin(b.yaw)*airStroke.x+Math.cos(b.yaw)*airStroke.z),wingActive=(b.wingStats?.frequency||0)>0,strokePhase=Math.sin(b.wingPhase||0)*(wingActive?1:0);
 const floating=g<.015&&!swimming,manualAir=!b.grounded&&b.takeoff!=='gait',moving=b.grounded&&speed>.12,cyclic=(q.type==='walk'||q.type==='run'||q.type==='lope')&&(moving||b.takeoff==='gait'&&!b.grounded);
 const running=q.type==='run'||q.type==='lope',runTarget=q.type==='run'?1:q.type==='lope'?.55:0;
 motion.run=smooth(motion.run,runTarget,dt*8);const run=motion.run;motion.time+=dt;motion.phase=phase;
 if(dt>0){motion.ax=smooth(motion.ax,clamp((b.vx-motion.vx)/dt,-7,7),dt*7);motion.az=smooth(motion.az,clamp((b.vz-motion.vz)/dt,-7,7),dt*7);}motion.vx=b.vx;motion.vz=b.vz;
 const toWorld=(x,z)=>v(b.x+Math.cos(b.yaw)*x-Math.sin(b.yaw)*z,0,b.z+Math.sin(b.yaw)*x+Math.cos(b.yaw)*z);
 const toLocal=p=>{let dx=p.x-b.x,dz=p.z-b.z;return v(Math.cos(b.yaw)*dx+Math.sin(b.yaw)*dz,p.y-b.y,-Math.sin(b.yaw)*dx+Math.cos(b.yaw)*dz);};
 const groundPoint=(l,z)=>{let p=toWorld(l.side*.14,z);p.y=P.terrain(p.x,p.z)+.09;return p;};
 const height=Math.max(0,b.y-P.terrain(b.x,b.z)),timeToGround=g>.015?(b.vy+Math.sqrt(b.vy*b.vy+2*g*height))/g:Infinity,landReach=1-ease((timeToGround-.08)/.30),preparation=b.jumpPreparing?clamp(b.jumpPrep/.18,0,1):0;
 motion.state=current?'riding':climbing?b.traversal.kind:swimming?'swim':crawling?(prone>.5?'prone crawl':'supported crawl'):b.pushVisual>0?'push off':winged&&!b.grounded?'wing flight':floating?'float':b.jumpPreparing?'anticipation':!b.grounded?(b.takeoff==='gait'?(q.type==='run'?'run flight':'lope flight'):'jump'):b.posture>.1?'flexed stance':cyclic?(running?'run stance':'walk'):Math.abs(b.yawRate)>.15?'pivot':'stand';
 let reaches=[];const reach=clamp(q.reach||0,.03,.51);
 for(let [i,l]of legs.entries()){
   const lp=(phase+i*.5)%1,duty=clamp(q.duty||.6,.05,.65);let ankle,contact=false,pitch=0,footYaw=b.yaw;
   if(current){let pedal=b.travel/.85;ankle=v(l.side*.16,.40+Math.sin(pedal+i*Math.PI)*.15,.07+Math.cos(pedal+i*Math.PI)*.15);l.anchor=null;l.idleSwing=null;}
   else if(swimming&&treading){let u=Math.sin(phase*2*Math.PI+i*Math.PI);ankle=v(l.side*.19,.12+.07*(1+u),.10+.12*u);pitch=-.18;l.anchor=null;l.idleSwing=null;}
   else if(swimming){let u=Math.sin(phase*4*Math.PI+i*Math.PI),effort=clamp(b.swimEffort||0,0,1);ankle=v(l.side*.135,.30+u*.055*effort,.81-.025*Math.max(0,-u)*effort);pitch=-2.8+.13*u*effort;l.anchor=null;l.idleSwing=null;}
   else if(climbing){let t=b.traversal,top=t.top-b.y,lead=i===0,u=ease(t.progress);ankle=v(l.side*.17,.10+(lead?.38:.10)*Math.sin(Math.PI*u),lead?-.25:.18);if(t.kind==='step'&&lead){let p=toLocal(v(t.point.x,t.top+.09,t.point.z));ankle=v(l.side*.14,Math.max(.09,p.y)*ease((u-.12)/.5),clamp(p.z,-.48,.20));}l.anchor=null;l.idleSwing=null;}
   else if(crawling){let u=Math.sin(phase*2*Math.PI+i*Math.PI),effort=b.crawlEffort||0;ankle=v(l.side*.22,.10+Math.max(0,u)*.05,.61+u*.09*effort);l.anchor=null;l.idleSwing=null;contact=u<=0;pitch=-.6-.6*prone;}
   else if(floating){ankle=v(l.side*.17,.22-(b.pushVisual||0)*.28,l.side>0?.11:-.09);pitch=-.08;l.anchor=null;l.idleSwing=null;}
   else if(manualAir){let tuck=ease((b.airTime-.08)/.20)*(1-landReach);ankle=v(l.side*.14,.09+.24*tuck,.03-.16*landReach);pitch=-.18*tuck+.12*landReach;l.anchor=null;l.idleSwing=null;}
   else if(cyclic){
     const stance=b.grounded&&lp<duty&&!b.jumpPreparing;
     if(stance){
       if(!l.wasStance||!l.anchor){l.anchor=groundPoint(l,-reach);l.plantYaw=b.yaw;}
       ankle=toLocal(l.anchor);contact=true;footYaw=l.plantYaw;let u=lp/duty;pitch=.15*(1-ease(u/.22))-(.22+.10*run)*ease((u-.70)/.30);
       // Release an overextended plant during an abrupt turn/obstacle impact.
       if(Math.hypot(ankle.x-l.side*.13,ankle.z)>.62){contact=false;ankle.x=clamp(ankle.x,-.32,.32);ankle.z=clamp(ankle.z,-.48,.48);l.anchor=null;}
     }else{
       let u=clamp((lp-duty)/(1-duty),0,1),u2=u*u,u3=u2*u,swingTime=Math.max(.1,(1-duty)*120/Math.max(20,q.cadence||116));
       const tangent=Math.min(running?1.2:.58,speed*swingTime),z=(2*u3-3*u2+1)*reach+(u3-2*u2+u)*tangent+(-2*u3+3*u2)*(-reach)+(u3-u2)*tangent;
       let landing=groundPoint(l,-reach),lift=Math.max(0,landing.y-b.y-.09);ankle=v(l.side*.14,.09+lift*ease(u)+(.075+.27*run+lift*.3)*Math.sin(Math.PI*u),clamp(z,-.57,.57));pitch=-(.22+.12*run)*(1-ease(u/.4))+.15*ease((u-.72)/.28);l.anchor=null;
     }
     l.wasStance=stance;l.idleSwing=null;
   }else{
     let desired=groundPoint(l,0);if(!l.anchor){l.anchor=desired.clone();l.plantYaw=b.yaw;}
     const error=Math.hypot(l.anchor.x-desired.x,l.anchor.z-desired.z),angle=Math.abs(wrap(b.yaw-l.plantYaw));
     if(!l.idleSwing&&!b.jumpPreparing&&(error>.10||angle>.27)&&!legs[1-i].idleSwing)l.idleSwing={from:l.anchor.clone(),to:desired.clone(),age:0,yaw:l.plantYaw};
     if(l.idleSwing){let sw=l.idleSwing;sw.age+=dt;let t=clamp(sw.age/.23,0,1),point=sw.from.clone().lerp(sw.to,ease(t));point.y+=.04*Math.sin(Math.PI*t);ankle=toLocal(point);footYaw=sw.yaw+wrap(b.yaw-sw.yaw)*ease(t);if(t===1){l.anchor.copy(sw.to);l.plantYaw=b.yaw;l.idleSwing=null;contact=true;}}
     else{ankle=toLocal(l.anchor);contact=true;footYaw=l.plantYaw;}
     l.wasStance=contact;if(b.jumpPreparing)pitch=-.10*ease((preparation-.6)/.4);
   }
   let footMode=climbing?'climb':treading?'tread':swimming?'swim':crawling?'crawl':floating?'float':manualAir?'jump':cyclic?'gait':'idle';if(l.footMode!==footMode){l.footMode=footMode;l.footTransition=.18;}if(!contact&&l.previousAnkle&&!current&&l.footTransition>0){ankle.lerp(l.previousAnkle,Math.exp(-dt*22));}l.footTransition=Math.max(0,(l.footTransition||0)-dt);l.previousAnkle=ankle.clone();reaches.push({l,ankle,contact,pitch,footYaw,lp});
 }
 const sine=Math.sin(phase*2*Math.PI),travelBlend=clamp(speed/.5,0,1),accForward=motion.ax*Math.sin(b.yaw)-motion.az*Math.cos(b.yaw),accSide=motion.ax*Math.cos(b.yaw)+motion.az*Math.sin(b.yaw);
 let hipTarget=cyclic?.872-.020*Math.cos(phase*4*Math.PI):.94,hipX=cyclic?.018*sine:0,hipZ=0;
 if(running&&cyclic){let stanceU=clamp((q.progress||0)*(q.contact+q.flight)/Math.max(.01,q.contact),0,1);hipTarget=b.grounded?.862-.035*Math.sin(Math.PI*stanceU):.878;}
 if(manualAir)hipTarget=.895;if(floating)hipTarget=.90;
 if(b.jumpPreparing)hipTarget=.94-.14*Math.sin(preparation*Math.PI*.5);hipTarget-=Math.min(.07,b.landing*.07);hipTarget-=.50*(b.posture||0);if(crawling)hipTarget=.46-.22*prone;if(swimming)hipTarget=treading?.78:.34;if(climbing)hipTarget=b.traversal.kind==='step'?.78:.57;
 let pitchTarget=-(.025+.07*run)*travelBlend-clamp(accForward/Math.max(1,g)*.13,-.13,.15),rollTarget=-clamp(accSide/Math.max(2,g)*.12,-.13,.13)+(cyclic?.012*sine:0);
 if(floating){pitchTarget=.05;rollTarget=0;}if(b.jumpPreparing)pitchTarget=-.13*preparation;if(b.posture>.1)pitchTarget=-.28*b.posture-1.05*prone;if(crawling)pitchTarget=-1.25-.15*prone;if(swimming)pitchTarget=treading?-.10:-1.42;if(climbing)pitchTarget=b.traversal.kind==='step'?-.18:-.48;
 if(current){hipTarget=1.09;hipZ=.05;hipX=0;pitchTarget=-.28;rollTarget=0;}
 let supportCeiling=.96;for(let r of reaches)if((r.contact||cyclic)&&!current){let dx=r.ankle.x-(r.l.side*.125+hipX),dz=r.ankle.z-hipZ;supportCeiling=Math.min(supportCeiling,r.ankle.y+Math.sqrt(Math.max(.05,.848**2-dx*dx-dz*dz)));}
 hipTarget=Math.min(hipTarget,supportCeiling);motion.hipY=smooth(motion.hipY,hipTarget,dt*16);motion.hipY=Math.min(motion.hipY,supportCeiling);motion.pitch=smooth(motion.pitch,pitchTarget,dt*8);motion.roll=smooth(motion.roll,rollTarget,dt*8);
 torso.position.set(hipX,motion.hipY,hipZ);root.updateMatrixWorld(true);
 let eye=v(hipX,motion.hipY+.71,hipZ).applyMatrix4(root.matrixWorld),focus=view.focus||eye.clone().add(v(Math.sin(b.yaw),0,-Math.cos(b.yaw)).multiplyScalar(100)),aim=focus.clone().sub(eye).normalize().applyQuaternion(root.getWorldQuaternion(new T.Quaternion()).invert());
 let gazeYaw=Math.atan2(-aim.x,-aim.z),gazePitch=Math.atan2(aim.y,Math.hypot(aim.x,aim.z));if(Math.abs(gazeYaw)>2.7&&Math.abs(motion.headYaw)>.2)gazeYaw=Math.abs(gazeYaw)*Math.sign(motion.headYaw);
 motion.spineYaw=smooth(motion.spineYaw,clamp(gazeYaw*.22,current?-.15:-.24,current?.15:.24),dt*6);
 const counter=cyclic?(.022+.045*run)*sine:0;
 motion.headYaw=smooth(motion.headYaw,clamp(gazeYaw-motion.spineYaw+counter,-1.02,1.02),dt*10);motion.headPitch=smooth(motion.headPitch,clamp(gazePitch-motion.pitch,-.60,swimming||prone>.4?1.15:.72),dt*10);
 torso.rotation.set(motion.pitch,motion.spineYaw-counter,motion.roll,'YXZ');head.rotation.set(motion.headPitch,motion.headYaw,0,'YXZ');
 for(let {l,ankle,contact,pitch,footYaw,lp}of reaches){let hip=v(l.side*.125+hipX,motion.hipY,hipZ+l.side*(cyclic?.012*sine:0)),distance=hip.distanceTo(ankle);if(distance>.852){let direction=ankle.clone().sub(hip).normalize();ankle.copy(hip).addScaledVector(direction,.852);if(contact&&ankle.y>.14)contact=false;}
   let knee=solve(hip,ankle,.43,.43,swimming&&!treading?v(l.side*.06,-1,-.15):crawling?v(l.side*(.15+.45*prone),-.25+.45*prone,-1):v(l.side*.045,0,-1));poseLimb(l,hip,knee,ankle);l.kneePad.position.copy(knee).add(v(0,0,-.073));l.boot.position.copy(ankle).add(v(0,-.035,-.060));l.boot.rotation.set(pitch,wrap(b.yaw-footYaw),0,'YXZ');
   l.contact=contact;l.ankle=ankle.clone();l.hipPoint=hip;l.kneePoint=knee;l.worldAnkle=toWorld(ankle.x,ankle.z);l.worldAnkle.y=b.y+ankle.y;l.phase=lp;
 }
 for(let [i,l]of arms.entries()){
   let shoulder=v(l.side*.245,.47,-.035).applyEuler(torso.rotation).add(torso.position),hand,elbow;
   if(climbing&&b.traversal.kind==='climb'){let p=b.traversal.point;hand=toLocal(v(p.x,p.y+.035,p.z));hand.x+=l.side*.23;let dir=hand.clone().sub(shoulder);if(dir.length()>.54)hand.copy(shoulder).addScaledVector(dir.normalize(),.54);elbow=solve(shoulder,hand,.29,.27,v(l.side,-.2,.25));}
   else if(treading){let u=phase*2*Math.PI+i*Math.PI;hand=shoulder.clone().add(v(l.side*(.26+.05*Math.sin(u)),-.27,-.23-.08*Math.cos(u)));elbow=solve(shoulder,hand,.29,.27,v(l.side,-.2,.2));}
   else if(swimming||crawling){let stroke=Math.sin(phase*2*Math.PI+i*Math.PI),effort=swimming?(b.swimEffort||0):(b.crawlEffort||0);hand=v(l.side*(swimming?.38:.31),swimming?.25+.17*Math.cos(phase*2*Math.PI+i*Math.PI)*effort:.10+Math.max(0,stroke)*.05,-.65+stroke*(swimming?.30:.13)*effort);let dir=hand.clone().sub(shoulder);if(dir.length()>.54)hand.copy(shoulder).addScaledVector(dir.normalize(),.54);elbow=solve(shoulder,hand,.29,.27,v(l.side,0,.25));}
   else if(winged){let reach=v(l.side*.50-.18*strokePhase*stroke.x,-.19*strokePhase*stroke.y,-.045-.19*strokePhase*stroke.z);if(reach.length()>.54)reach.setLength(.54);hand=shoulder.clone().add(reach);elbow=solve(shoulder,hand,.29,.27,v(l.side*.15,-1,-.3));}
   else if((b.pushVisual||0)>.05&&Math.abs(b.pushNormal?.y||0)<.7){let n=b.pushNormal,local=v(Math.cos(b.yaw)*n.x+Math.sin(b.yaw)*n.z,n.y,-Math.sin(b.yaw)*n.x+Math.cos(b.yaw)*n.z);hand=shoulder.clone().addScaledVector(local,-.48);elbow=solve(shoulder,hand,.29,.27,v(l.side,-.2,.2));}
   else if(view.holdPoint&&!current){let target=root.worldToLocal(view.holdPoint.clone());target.x+=l.side*Math.min(.22,(view.holdRadius||.18)*.8);target.z+=(view.holdRadius||.18)*.55;let dir=target.clone().sub(shoulder);if(dir.length()>.54)target.copy(shoulder).addScaledVector(dir.normalize(),.54);hand=target;elbow=solve(shoulder,hand,.29,.27,v(l.side*.65,-.15,.4));}
   else if(current){hand=v(l.side*.30,1.29,-.64);let dir=hand.clone().sub(shoulder);if(dir.length()>.54)hand.copy(shoulder).addScaledVector(dir.normalize(),.54);elbow=solve(shoulder,hand,.29,.27,v(l.side*.65,-.15,.65));}
   else{
     const lp=(phase+i*.5)%1,swing=-Math.cos(lp*2*Math.PI-.12),amp=(.27+.20*run)*travelBlend;
     let angle=cyclic?amp*swing:-.055,flex=.24+1.10*run+(cyclic?.06*Math.sin(lp*2*Math.PI):0),abd=.06+Math.min(.03,Math.abs(accSide)*.01);
     if(b.jumpPreparing){angle=-.45*preparation;flex=.35;abd=.075;}
     else if(floating){angle=.20;flex=.65;abd=.14;}
     else if(manualAir){let launch=ease(b.airTime/.20),settle=ease((b.airTime-.30)/.45);angle=(-.45+1.4*launch)*(1-settle)+(.25+.22*landReach)*settle;flex=.82;abd=.10;}
     if(b.grounded&&b.landing>.25){angle+=.15*b.landing;flex+=.16*b.landing;}
     if(l.angle===undefined){l.angle=angle;l.flex=flex;l.abduction=abd;}l.angle=smooth(l.angle,angle,dt*18);l.flex=smooth(l.flex,flex,dt*10);l.abduction=smooth(l.abduction,abd,dt*8);
     let upper=v(l.side*Math.sin(l.abduction),-Math.cos(l.angle)*Math.cos(l.abduction),-Math.sin(l.angle)*Math.cos(l.abduction)).applyEuler(torso.rotation),fore=v(l.side*Math.sin(l.abduction)*.3,-Math.cos(l.angle+l.flex),-Math.sin(l.angle+l.flex)).normalize().applyEuler(torso.rotation);
     elbow=shoulder.clone().addScaledVector(upper,.29);hand=elbow.clone().addScaledVector(fore,.27);
   }
   let poseMode=climbing?'climb':treading?'tread':swimming?'swim':crawling?'crawl':winged?'wings':b.pushVisual>0?'push':current?'bike':view.holdPoint?'hold':'free';if(l.poseMode!==poseMode){l.poseMode=poseMode;l.transition=.22;}if(l.transition>0&&l.handPoint){hand.lerp(l.handPoint,Math.exp(-dt*18));let delta=hand.clone().sub(shoulder);if(delta.length()>.54)hand.copy(shoulder).addScaledVector(delta.normalize(),.54);elbow=solve(shoulder,hand,.29,.27,v(l.side*.65,-.2,.35));l.transition=Math.max(0,l.transition-dt);}poseLimb(l,shoulder,elbow,hand);l.shoulder.position.copy(shoulder);l.hand.position.copy(hand);l.hand.quaternion.setFromUnitVectors(axis,hand.clone().sub(elbow).normalize());l.shoulderPoint=shoulder;l.elbowPoint=elbow;l.handPoint=hand;
 }
 for(let [i,w]of wingPanels.entries()){let spec=globalThis.LabWings?.presets[b.wingSize]||(typeof require==='function'?require('./wings.js').presets[b.wingSize]:null);w.group.visible=!!spec;if(spec){fitWingMesh(w,b.wingSize);let spread=b.wingSpread||0,flap=-strokePhase*(.34*stroke.y+w.side*.18*stroke.x),pitch=wingActive?Math.atan2(stroke.z,stroke.y):(b.wingStats?.trimPitch||0),bank=-Math.atan2(stroke.x,Math.hypot(stroke.y,stroke.z));w.group.position.copy(arms[i].shoulderPoint);w.group.scale.set(w.side*(spec.span/2-.245),1,spec.area/(2*(spec.span/2-.245)*w.area));w.group.rotation.set(pitch,w.side*(1-spread)*1.40,bank+w.side*flap,'ZYX');w.membrane.material.color.setHex(spec.color);}}
 for(let [i,h] of harness.entries()){h.rod.visible=(b.wingSize||0)>0;if(h.rod.visible){let a=v(h.side*.15,.05,.08).applyEuler(torso.rotation).add(torso.position),end=arms[i].shoulderPoint.clone();segment(h.rod,a,end,1);}}root.updateMatrixWorld(true);motion.wasGrounded=b.grounded;
}
return{root,update,reset(){legs.forEach(l=>{l.anchor=null;l.idleSwing=null;l.previousAnkle=null;l.wasStance=false;});arms.forEach(l=>{l.angle=undefined;l.flex=undefined;});Object.assign(motion,{time:0,hipY:.94,pitch:0,roll:0,headYaw:0,headPitch:0,spineYaw:0,run:0,ax:0,az:0,vx:0,vz:0,phase:0,state:'stand',wasGrounded:true});},get pose(){root.updateMatrixWorld(true);return{phase:motion.phase,state:motion.state,wings:wingPanels.map(w=>({size:w.size,visible:w.group.visible,scale:w.group.scale.toArray(),rotation:w.group.rotation.toArray(),color:w.membrane.material.color.getHex(),area:w.area})),hipHeight:motion.hipY,arms:arms.map(l=>({shoulder:l.shoulderPoint?.toArray(),elbow:l.elbowPoint?.toArray(),hand:l.handPoint?.toArray(),angle:l.angle,flex:l.flex})),legs:legs.map(l=>({hip:l.hipPoint?.toArray(),knee:l.kneePoint?.toArray(),ankle:l.ankle?.toArray(),phase:l.phase})),feet:legs.map(l=>l.boot.position.toArray()),contacts:legs.map(l=>!!l.contact),worldFeet:legs.map(l=>l.worldAnkle?.toArray()),head:head.getWorldPosition(new T.Vector3()).toArray(),facing:new T.Vector3(0,0,-1).applyQuaternion(root.getWorldQuaternion(new T.Quaternion())).toArray(),gaze:new T.Vector3(0,0,-1).applyQuaternion(head.getWorldQuaternion(new T.Quaternion())).toArray(),neckYaw:motion.headYaw,neckPitch:motion.headPitch,chestYaw:motion.spineYaw};}};
};
})(globalThis);

