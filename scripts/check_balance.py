from pathlib import Path
s = Path('../frontend/pages/index.tsx').read_text(encoding='utf-8')
counts = {'(':0,')':0,'[':0,']':0,'{':0,'}':0}
for i,ch in enumerate(s, start=1):
    if ch in counts:
        counts[ch]+=1
    # report negative counts (more closing than opening) - not applicable here since we only increment

print('Final counts:', counts)
# attempt to find where parentheses balance is off by tracking nesting
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
        print('Unclosed at end, top:', stack[-1])
    else:
        print('All paired OK')
