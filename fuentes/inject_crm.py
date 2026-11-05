import sys, re
G = open(sys.argv[1], encoding="utf-8").read().strip()
for f in sys.argv[2:]:
    s = open(f, encoding="utf-8").read()
    s = re.sub(r"<!--crm-hist-start-->.*?<!--crm-hist-end-->\n?", "", s, flags=re.S)
    i = s.rindex("</body>"); s = s[:i] + G + "\n" + s[i:]
    open(f, "w", encoding="utf-8").write(s); print("ok", f)
