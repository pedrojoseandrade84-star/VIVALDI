import sys, re, json, os
D = os.path.dirname(os.path.abspath(__file__))
G = open(sys.argv[1], encoding="utf-8").read().strip()
data = json.load(open(os.path.join(D, "landings", "proyectos.json"), encoding="utf-8")); data.pop("_nota", None)
G = G.replace("/*PROYECTOS*/null", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
for f in sys.argv[2:]:
    s = open(f, encoding="utf-8").read()
    s = re.sub(r"<!--gestion-start-->.*?<!--gestion-end-->\n?", "", s, flags=re.S)
    i = s.rindex("</body>"); s = s[:i] + G + "\n" + s[i:]
    open(f, "w", encoding="utf-8").write(s); print("ok", f)
