from pathlib import Path
root=Path(__file__).resolve().parent
html=(root/'src/shell.html').read_text(encoding='utf-8')
for marker,file in [('THREE','vendor/three.min.js'),('AIR','src/air-data.js'),('LOCOMOTION','src/locomotion.js'),('THERMAL','src/water-thermal.js'),('WATERDETAIL','src/water-detail.js'),('FLUID','src/fluid.js'),('WINGS','src/wings.js'),('WATERSTATIONS','src/water-stations.js'),('PHYSICS','src/physics.js'),('AVATAR','src/avatar.js'),('GAME','src/game.js')]:
    html=html.replace('/*'+marker+'*/',(root/file).read_text(encoding='utf-8'))
out=root/'gravity-lab.html'
out.write_text(html,encoding='utf-8')
(root/'index.html').write_text(html,encoding='utf-8')  # same build, served by GitHub Pages
print(out, out.stat().st_size)
