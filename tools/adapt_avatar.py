from pathlib import Path
p=Path(__file__).resolve().parent.parent/'src/avatar.js'
s=p.read_text(encoding='utf-8')
s=s.replace('const gravity=P.atmosphere(b.y).g,','const gravity=Math.max(.05,P.atmosphere(b.y).g),')
s=s.replace('hipTarget-=b.landing*.095;','hipTarget-=b.landing*.095;hipTarget-=.50*(b.posture||0);')
s=s.replace('if(b.jumpPreparing)pitchTarget=-.13*preparation;','if(b.jumpPreparing)pitchTarget=-.13*preparation;if(b.posture>.1)pitchTarget=-.28*b.posture;')
s=s.replace('if(current){\n     let target=current.kind', '''if(view.holdPoint&&!current){
     let target=root.worldToLocal(view.holdPoint.clone());target.x+=l.side*.15;
     let direction=target.clone().sub(shoulder);if(direction.length()>.54)target.copy(shoulder).addScaledVector(direction.normalize(),.54);
     hand=target;elbow=solve(shoulder,hand,.29,.27,v(l.side*.65,-.15,.4));
   }else if(current){
     let target=current.kind''')
p.write_text(s,encoding='utf-8')
