#!/usr/bin/env python3
# 중복 선언을 제거하는 스크립트

with open('src/pages/HomePage.tsx.backup', 'r', encoding='utf-8') as f:
    content = f.read()

# 54-62줄의 중복 제거 (무한 스크롤 관련 중복)
# 59-62줄 제거: "  // 무한 스크롤 관련 상태" 부터 "  const isError = false;" 까지
lines_to_remove_1 = """  
  // 무한 스크롤 관련 상태
  const [displayCount, setDisplayCount] = useState(30);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isLoading = loading;
  const isError = false;"""

# 110-113줄의 중복 제거
lines_to_remove_2 = """  const [events, setEvents] = useState<EventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [displayCount, setDisplayCount] = useState(48); // 48개로 시작"""

# 스크롤 복원 코드 제거
scroll_restore_start = "  // 스크롤 복원 (sessionStorage 사용)"
scroll_restore_end = "  }, [loading, filteredEvents.length]);"

# 첫 번째 중복 제거
content = content.replace(lines_to_remove_1, "")

# 두 번째 중복 제거  
content = content.replace(lines_to_remove_2, "")

# 스크롤 복원 코드 제거
lines = content.split('\n')
output_lines = []
skip = False

for line in lines:
    if scroll_restore_start in line:
        skip = True
        continue
    
    if skip and scroll_restore_end in line:
        skip = False
        continue
    
    if not skip:
        output_lines.append(line)

# 결과 저장
with open('src/pages/HomePage.tsx', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines))

print("완료!")
