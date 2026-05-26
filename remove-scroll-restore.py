#!/usr/bin/env python3
# 스크롤 복원 코드를 제거하는 스크립트

with open('src/pages/HomePage.tsx.backup', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 스크롤 복원 useEffect 제거 (179-210줄, 0-based index로는 178-209)
# "// 스크롤 복원 (sessionStorage 사용)" 부터
# "}, [loading, filteredEvents.length]);" 까지 제거

output_lines = []
skip = False
skip_start_marker = "  // 스크롤 복원 (sessionStorage 사용)"
skip_end_marker = "  }, [loading, filteredEvents.length]);"

for i, line in enumerate(lines):
    if skip_start_marker in line:
        skip = True
        print(f"스크롤 복원 코드 시작 발견: 줄 {i+1}")
        continue
    
    if skip and skip_end_marker in line:
        skip = False
        print(f"스크롤 복원 코드 끝 발견: 줄 {i+1}")
        continue
    
    if not skip:
        output_lines.append(line)

# 결과 저장
with open('src/pages/HomePage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(output_lines)

print(f"완료! 총 {len(lines)}줄에서 {len(lines) - len(output_lines)}줄 제거됨")
print(f"결과: {len(output_lines)}줄")
