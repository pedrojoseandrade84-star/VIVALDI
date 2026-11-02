# inlines Three.js r128 + OrbitControls + app into one offline HTML file
import os
D=os.path.dirname(os.path.abspath(__file__))
s=open(f"{D}/shell.html",encoding="utf-8").read()
v="<script>"+open(f"{D}/vendor/three.min.js",encoding="utf-8").read()+"</script>\n<script>"+open(f"{D}/vendor/OrbitControls.js",encoding="utf-8").read()+"</script>\n<script>"+open(f"{D}/vendor/Sky.js",encoding="utf-8").read()+"</script>"
s=s.replace("<!--VENDOR-->",v).replace("<script>/*APP*/</script>","<script>"+open(f"{D}/app.js",encoding="utf-8").read()+"</script>")
out=os.path.join(D, "..", "..", "entregables", "simulador"); os.makedirs(out,exist_ok=True)
open(f"{out}/Simulador-3D-Lotes-Vivaldi.html","w",encoding="utf-8").write(s); print("ok",len(s)//1024,"KB")
