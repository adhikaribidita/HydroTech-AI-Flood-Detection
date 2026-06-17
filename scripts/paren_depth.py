from pathlib import Path
s = Path('../frontend/pages/index.tsx').read_text(encoding='utf-8')
lines = s.splitlines()
depth = 0
max_depth = 0
for i,line in enumerate(lines, start=1):
    for ch in line:
        if ch=='(':
            depth+=1
            max_depth=max(max_depth,depth)
        elif ch==')':
            depth-=1
    if i>=420 and i<=452:
        print(i, 'depth=', depth, line)
print('final depth', depth, 'max', max_depth)
