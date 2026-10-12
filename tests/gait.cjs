const P=require('../src/physics.js'),T=require('../vendor/three.min.js'),assert=require('assert/strict'),fs=require('fs'),path=require('path');require('../src/avatar.js');
function world(g,p=1){let w=P.makeWorld({gravity:g,pressure:p});w.balls=[];w.solids=w.solids.filter(s=>['floor','lift'].includes(s.id));w.solids[0].min.z=-1000;w.solids[0].max.z=1000;w.solids[0].min.x=-1000;w.solids[0].max.x=1000;return w;}
function body(b){return{x:b.p.x,y:b.p.y-b.height/2,z:b.p.z,vx:b.v.x,vy:b.v.y,vz:b.v.z,yaw:b.yaw,yawRate:b.yawRate,grounded:b.grounded,airTime:b.airTime,launchV:b.launchV||.1,boundBlend:b.boundBlend,stanceTime:b.stanceTime,stepSide:b.stepSide,landing:b.landing,jumpPreparing:b.jumpPreparing,jumpPrep:b.jumpPrep,takeoff:b.takeoff,travel:b.travel,posture:b.posture,prone:b.prone,swimming:b.swimming,crawlEffort:b.crawlEffort,swimEffort:b.swimEffort,gait:b.gait};}
const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));let results=[];
function trial(g,run,pressure=1){let w=world(g,pressure),m=new T.MeshStandardMaterial(),rig=createAuroraAvatar(T,{atmosphere:y=>w.air(y),terrain:()=>0},{orange:m,white:m,dark:m,rubber:m,glass:m,steel:m}),prev=null,prevState=null,contacts=0,flight=0,steps=0,sumSpeed=0,maxSlide=0,maxHandStep=0,hipStep=0,lastGround=true,states=new Set(),poseSamples=[];
 for(let frame=0;frame<60*20;frame++){for(let j=0;j<4;j++)P.step(w,{z:-1,run});let b=w.player;rig.update(body(b),1/60,null,true,{focus:new T.Vector3(b.p.x,b.p.y,b.p.z-30)});let pose=rig.pose;states.add(pose.state);
 assert(pose.arms.flatMap(a=>[...a.shoulder,...a.elbow,...a.hand]).every(Number.isFinite));for(let a of pose.arms){assert(Math.abs(dist(a.shoulder,a.elbow)-.29)<1e-8);assert(Math.abs(dist(a.elbow,a.hand)-.27)<1e-8);}for(let l of pose.legs){assert(Math.abs(dist(l.hip,l.knee)-.43)<1e-8);assert(Math.abs(dist(l.knee,l.ankle)-.43)<1e-7);}
 if(frame>600){sumSpeed+=Math.hypot(b.v.x,b.v.z);steps++;if(b.grounded&&!lastGround)contacts++;if(!b.grounded)flight++;
 if(prev){for(let i=0;i<2;i++){if(prev.contacts[i]&&pose.contacts[i]&&Math.abs(pose.legs[i].phase-prev.legs[i].phase)<.1)maxSlide=Math.max(maxSlide,dist(prev.worldFeet[i],pose.worldFeet[i]));maxHandStep=Math.max(maxHandStep,dist(prev.arms[i].hand,pose.arms[i].hand));}hipStep=Math.max(hipStep,Math.abs(pose.hipHeight-prev.hipHeight));}
 if(poseSamples.length<6&&frame%6===0)poseSamples.push(pose);}
 lastGround=b.grounded;prev=pose;prevState=body(b);
 }
 let b=w.player,result={g,run,pressure,speed:sumSpeed/steps,cadence:b.stats.cadence,measuredContactsPerMin:contacts*60/(steps/60),airFraction:flight/steps,maxPlantedFootDisplacement:maxSlide,maxLocalHandStep:maxHandStep,maxHipStep:hipStep,states:[...states]};results.push(result);
 if(g>=.165&&g<=1.5&&pressure<=2)assert(Math.abs(result.speed-(run?3:1.4))<.07,'Constant commanded speed where forces permit '+JSON.stringify(result));
 assert(maxSlide<.012,'Planted feet should not slide '+JSON.stringify(result));assert(maxHandStep<.12,'No large free-arm jumps '+JSON.stringify(result));assert(hipStep<.065,'No pelvis snaps '+JSON.stringify(result));return result;
}
for(let g of [.165,1/3,1,1.3,1.5])for(let run of [false,true])trial(g,run);
const runs=results.filter(r=>r.run),walks=results.filter(r=>!r.run);for(let i=1;i<runs.length;i++)assert(runs[i].cadence>runs[i-1].cadence,'Cadence rises with gravity');assert(runs.find(r=>r.g===1).cadence>155&&runs.find(r=>r.g===1).cadence<185,'Earth running cadence');
trial(1,true,100);trial(10,true,1);
let z=world(0,0),m=new T.MeshStandardMaterial(),rig=createAuroraAvatar(T,{atmosphere:y=>z.air(y),terrain:()=>0},{orange:m,white:m,dark:m,rubber:m,glass:m,steel:m});z.player.p.y=8;z.player.v=P.V(1,0,0);let oldPose;for(let i=0;i<300;i++){for(let j=0;j<4;j++)P.step(z,{z:-1,run:true});rig.update(body(z.player),1/60,null,true);if(i===200)oldPose=rig.pose;}assert.equal(rig.pose.state,'float');assert.equal(rig.pose.phase,oldPose.phase);assert(dist(rig.pose.feet[0],oldPose.feet[0])<1e-8,'Zero-g legs do not cycle');assert(Math.abs(z.player.v.x-1)<1e-10);
fs.writeFileSync(path.join(__dirname,'../docs/gait-results.json'),JSON.stringify({trials:results,zeroG:'Relaxed non-cycling float; no input thrust'},null,2));console.log(JSON.stringify(results,null,2));

