#!/usr/bin/env python3
# HomePage.tsx를 처음부터 깨끗하게 재작성

with open('src/pages/HomePage.tsx.backup', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 제거할 줄 번호 (0-based index)
# 54-62줄: 첫 번째 중복 (무한 스크롤 관련)
# 110-113줄: 두 번째 중복 (events, isLoading, isError, displayCount)
# 179-211줄: 스크롤 복원 코드

skip_ranges = [
    (57, 62),   # 58-62줄 제거 (0-based: 57-61)
    (109, 113), # 110-113줄 제거 (0-based: 109-112) - 첫 번째 제거로 인해 -4
    (174, 206)  # 179-211줄 제거 (스크롤 복원, 0-based: 178-210) - 이전 제거로 인해 -8
]

output_lines = []
removed_count = 0

for i, line in enumerate(lines):
    should_skip = False
    
    for start, end in skip_ranges:
        adjusted_start = start - removed_count
        adjusted_end = end - removed_count
        
        if adjusted_start <= i < adjusted_end:
            should_skip = True
            if i == adjusted_start:
                print(f"Skipping lines {start+1}-{end} (adjusted: {adjusted_start+1}-{adjusted_end})")
            break
    
    if should_skip:
        removed_count += 1
    else:
        output_lines.append(line)

# 결과 저장
with open('src/pages/HomePage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(output_lines)

print(f"\n완료!")
print(f"원본: {len(lines)}줄")
print(f"제거: {removed_count}줄")
print(f"결과: {len(output_lines)}줄")
