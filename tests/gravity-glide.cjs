const P=require('../src/physics.js'),T=require('../vendor/three.min.js'),assert=require('assert/strict'),fs=require('fs'),path=require('path');require('../src/avatar.js');
const run=(w,t,input={})=>{for(let i=0;i<t*240;i++)P.step(w,input);};
let loads=[];for(let g of [1,1.5,1.8,2,2.5,3,4,5,6,10]){
 let w=P.makeWorld({gravity:g,pressure:1});w.balls=[];run(w,5,{z:-1});let b=w.player;
 if(g<=2.5){assert.equal(b.prone,0);assert.notEqual(b.gait.type,'crawl');assert(-b.v.z>.7,'Moderate loads retain useful walking');}
 if(g>=3)assert.equal(b.gait.type,'crawl');
 let m=new T.MeshStandardMaterial(),rig=createAuroraAvatar(T,{atmosphere:y=>w.air(y),terrain:()=>0},{orange:m,white:m,dark:m,rubber:m,glass:m,steel:m});
 for(let i=0;i<120;i++)rig.update({...b,x:b.p.x,y:0,z:b.p.z,vx:b.v.x,vy:b.v.y,vz:b.v.z},1/60,null,true);
 if(g>=3){for(let arm of rig.pose.arms)assert(arm.hand[1]>.05&&arm.hand[1]<.22,'Crawling hands reach floor');for(let leg of rig.pose.legs)assert(leg.knee[1]>.04,'Crawling knees stay above floor');}
 loads.push({g,speed:-b.v.z,posture:b.posture,prone:b.prone,pose:rig.pose.state,hands:rig.pose.arms.map(a=>a.hand),knees:rig.pose.legs.map(l=>l.knee)});
}
let glides=[];for(let [g,p,size]of [[2,1,3],[2,50,3],[3,100,3],[3,100,1],[3,100,0]]){
 let w=P.makeWorld({gravity:g,pressure:p});w.balls=[];P.relocate(w,'wings');run(w,.4);if(size)assert(P.equipWings(w,size).includes('fitted'));let b=w.player;b.p=P.V(0,16,0);b.v=P.V(0,0,-3);b.grounded=false;b.contacts=[];
 let t=0,maxLift=0;for(let i=0;i<8*240;i++){let incoming={...b.v};P.step(w);t+=P.DT;let q=b.wingStats;assert(!q.power,'Passive glide uses no arm power');assert(P.dot(q.force||P.V(),incoming)<.5,'Passive wings do not supply positive mechanical power');maxLift=Math.max(maxLift,q.lift||0);if(b.grounded)break;}
 glides.push({g,p,size,time:t,distance:-b.p.z,height:b.p.y,descent:b.v.y,maxLift});
}
assert(glides[1].time>7&&glides[1].descent>-2);assert(glides[2].height>8&&glides[2].distance>20,'Braced large wing supports a dense-air high-g glide');assert(glides[3].time<3&&glides[4].time<3,'Small wings and bare body cannot match that glide');assert(glides[0].time<2,'Low-density air needs more launch speed / height');
for(let spec of P.wings.presets.slice(1))for(let rho of [0,.01,1.2,12,122])for(let speed of [.1,1,3,15,50])for(let vertical of [-10,-1,0,1,10]){let v=P.V(speed,vertical,-speed*.7),q=P.wings.force(spec,rho,v,P.V(.6,0,-.8),0);assert(P.dot(q.force,v)<=1e-7,'Passive lift/bank must not add energy');assert(P.len(q.force)<=spec.braceLimit+.001,'Combined wing force respects structural limit');}
fs.writeFileSync(path.join(__dirname,'../docs/gravity-glide-results.json'),JSON.stringify({loads,glides},null,2));console.log(JSON.stringify({loads:loads.map(({g,speed,prone,pose})=>({g,speed,prone,pose})),glides},null,2));
