"""Build a small offline table from the Lemmon dry-air EOS in CoolProp."""
from pathlib import Path
import sys,json
here=Path(__file__).resolve().parent
sys.path.insert(0,str(here/'python-packages'))
import CoolProp
from CoolProp.CoolProp import PropsSI
rows=[[0,0,1.8205e-5]]
for i in range(1,1001):
    p=i*.1*101325
    rows.append([i*.1,PropsSI('D','T',293.15,'P',p,'Air'),PropsSI('V','T',293.15,'P',p,'Air')])
data={'temperature':293.15,'stepAtm':.1,'source':'CoolProp '+CoolProp.__version__+' HEOS Air / Lemmon et al. 2000; viscosity Lemmon & Jacobsen 2004','rows':rows}
(here.parent/'src/air-data.js').write_text('(function(r){const data='+json.dumps(data,separators=(',',':'))+';if(typeof module!=="undefined"&&module.exports)module.exports=data;else r.LabAirData=data;})(globalThis);',encoding='utf-8')
print(json.dumps({'oneAtm':rows[10],'hundredAtm':rows[1000],'version':CoolProp.__version__}))
