from pathlib import Path
s = Path('../frontend/pages/index.tsx').read_text(encoding='utf-8')
stack = []
pairs = {'(':')','[':']','{':'}'}
for i,ch in enumerate(s, start=1):
    if ch in pairs:
        stack.append((ch,i))
    elif ch in pairs.values():
        if stack and pairs[stack[-1][0]]==ch:
            stack.pop()
        else:
            print('mismatch or extra close', ch, 'at', i)

print('remaining stack length', len(stack))
for ch,pos in stack[-10:]:
    # map pos to line
    line = s.count('\n',0,pos)+1
    col = pos - s.rfind('\n',0,pos)
    snippet = s[pos-40:pos+40].replace('\n','\\n')
    print(ch,pos,'line',line,'col',col,'snippet',snippet)
