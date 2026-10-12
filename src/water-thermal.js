/* Well-mixed, open-system phase/enthalpy balance. Prescribed chamber pressure
   is maintained by an external vapor exhaust. Rate coefficients are assumptions.
   Saturation: IAPWS SR1-86(1992), sublimation/melting: IAPWS R14-08(2011). */
(function(root){'use strict';
const cp=4180,ci=2100,fusion=333500,Rv=461.52,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function saturation(T,ice=false){T=clamp(T,130,373.15);if(ice){let t=Math.min(T,273.16)/273.16;return 611.657*Math.exp((-21.2144006*t**.00333333333+27.3203819*t**1.20666667-6.1059813*t**1.70333333)/t);}let t=1-T/647.096;return 22.064e6*Math.exp(647.096/T*(-7.85951783*t+1.84408259*t**1.5-11.7866497*t**3+22.6807411*t**3.5-15.9618719*t**4+1.80122502*t**7.5));}
function meltTemperature(p){let lo=251.165,hi=273.16;for(let i=0;i<32;i++){let T=(lo+hi)/2,t=T/273.16,pred=611.657*(1+1195393.37*(1-t**3)+80818.3159*(1-t**25.75)+3338.26860*(1-t**103.75));if(pred>p)lo=T;else hi=T;}return(lo+hi)/2;}
function create(mass=159712){return{initialMass:mass,mass,energy:mass*cp*20,initialEnergy:mass*cp*20,temperature:293.15,liquidFraction:1,iceFraction:0,vaporMass:0,exhaustEnergy:0,heatInput:0,rate:0,mode:'liquid',elapsed:0,coefficient:.1,conductance:300,pressure:-1,melting:273.15,area:80};}
function decode(s,p){if(s.pressure!==p){s.pressure=p;s.melting=meltTemperature(p);}let hl=cp*(s.melting-273.15),hi=hl-fusion,e=s.energy/Math.max(s.minimumMass??.001,s.mass);
 if(e>hl){s.temperature=273.15+e/cp;s.liquidFraction=1;}else if(e>=hi){s.temperature=s.melting;s.liquidFraction=clamp((e-hi)/fusion,0,1);}else{s.temperature=s.melting+(e-hi)/ci;s.liquidFraction=0;}s.iceFraction=1-s.liquidFraction;s.saturationPressure=saturation(s.temperature,s.liquidFraction<.001);
}
function step(s,atm,dt,area=s.area){const p=atm*101325;decode(s,p);s.elapsed+=dt;if(s.mass<(s.minimumMass??.01)){s.mode='exhausted';s.rate=0;return s;}
 // Heat enters from the assumed 20°C basin and surrounding radiation field.
 let heat=(s.conductance*(293.15-s.temperature)+.96*5.670374419e-8*area*(293.15**4-s.temperature**4))*dt;
 s.energy+=heat;s.heatInput+=heat;decode(s,p);
 const isIce=s.liquidFraction<.001,ps=s.saturationPressure,driving=Math.max(0,ps-p);
 // Effective Hertz–Knudsen relation for a vapor-dominated, pumped interface.
 // Total chamber pressure is used as a conservative opposing vapor pressure;
 // ordinary diffusion-driven evaporation into unsaturated air is omitted.
 let flux=s.coefficient*driving/Math.sqrt(2*Math.PI*Rv*Math.max(130,s.temperature)),dm=Math.min(s.mass*(s.maxLossFraction??.001),flux*area*dt),hv=2500800+1850*(s.temperature-273.15);
 // Do not cross the saturation temperature in one step. Positive-pressure
 // liquid can settle at its boiling temperature rather than evaporate forever.
 if(p>=611.657&&!isIce&&dm>0){let lo=s.melting,hi=Math.max(lo,s.temperature);for(let i=0;i<25;i++){let mid=(lo+hi)/2;if(saturation(mid)>p)hi=mid;else lo=mid;}let equilibrium=cp*((lo+hi)/2-273.15);dm=Math.min(dm,Math.max(0,(s.energy-s.mass*equilibrium)/Math.max(1,hv-equilibrium)));}
 s.mass-=dm;s.vaporMass+=dm;s.energy-=dm*hv;s.exhaustEnergy+=dm*hv;s.rate=dm/Math.max(1e-9,dt);decode(s,p);
 s.mode=s.mass<(s.minimumMass??.01)?'exhausted':s.liquidFraction<.001?(s.rate>1e-6?'ice sublimating':'ice'):s.iceFraction>.001?'freezing / boiling':s.rate>1e-6?'boiling / cooling':'liquid';return s;
}
function density(T,atm,iceFraction=0){let c=clamp(T-273.15,-1,40),liquid=1000*(1-(c+288.9414)/(508929.2*(c+68.12963))*(c-3.9863)**2)*(1+(atm*101325-101325)/2.2e9),ice=917*(1+(atm*101325-101325)/9e9);return 1/((1-iceFraction)/liquid+iceFraction/ice);}
const api={create,step,decode,density,saturation,meltTemperature,cp,ci,fusion};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LabWaterThermal=api;
})(globalThis);
