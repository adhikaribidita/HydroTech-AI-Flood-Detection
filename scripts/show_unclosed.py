from pathlib import Path
s = Path('../frontend/pages/index.tsx').read_text(encoding='utf-8')
# find positions of all parentheses
pairs = {'(':')','[':']','{':'}'}
stack = []
for i,ch in enumerate(s, start=1):
    if ch in pairs:
        stack.append((ch,i))
    elif ch in pairs.values():
        if not stack:
            print('Extra closing', ch, 'at', i)
            break
        top, pos = stack.pop()
        if pairs[top] != ch:
            print('Mismatched', top, 'from', pos, 'closed by', ch, 'at', i)
            break
else:
    if stack:
        top, pos = stack[-1]
        print('Unclosed at end, top:', top, 'at char', pos)
        # map pos to line and column
        prefix = s[:pos]
        line = prefix.count('\n') + 1
        col = pos - prefix.rfind('\n')
        print('line', line, 'col', col)
        # print surrounding lines
        lines = s.splitlines()
        start = max(0, line-5)
        end = min(len(lines), line+4)
        for ln in range(start, end):
            mark = '>>' if ln+1==line else '  '
            print(f"{mark} {ln+1}: {lines[ln]}")
    else:
        print('All paired OK')
