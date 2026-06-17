# 로그인 점검창 백업

## 사용 목적
로그인 시스템 점검 시 사용자에게 안내하기 위한 팝업

## 적용 날짜
2026년 6월 17일

## 구현 위치
- 파일: `src/pages/LoginPage.tsx`
- 스타일: `src/styles/LoginPage.css`

---

## 1. LoginPage.tsx 코드 추가

### State 추가 (15번째 줄)
```tsx
const [showMaintenancePopup, setShowMaintenancePopup] = useState(true);
```

### JSX 추가 (115-137번째 줄)
```tsx
{/* 로그인 시스템 점검 팝업 */}
{showMaintenancePopup && (
  <div className="maintenance-overlay">
    <div className="maintenance-popup">
      <div className="maintenance-icon">⚠️</div>
      <h2>시스템 점검 안내</h2>
      <p className="maintenance-message">
        현재 로그인 시스템 점검 중입니다.<br />
        로그인이 일시적으로 불가능합니다.
      </p>
      <p className="maintenance-submessage">
        점검이 완료되는대로 다시 이용하실 수 있습니다.<br />
        불편을 드려 죄송합니다.
      </p>
      <button 
        className="maintenance-close-btn"
        onClick={() => setShowMaintenancePopup(false)}
      >
        확인
      </button>
    </div>
  </div>
)}
```

---

## 2. LoginPage.css 스타일 추가

```css
/* 점검 팝업 스타일 */
.maintenance-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.maintenance-popup {
  background: white;
  border-radius: 16px;
  padding: 40px 30px;
  max-width: 440px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  text-align: center;
  animation: slideUp 0.3s ease-in-out;
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.maintenance-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.maintenance-popup h2 {
  margin: 0 0 20px 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.maintenance-message {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #374151;
  line-height: 1.6;
  font-weight: 600;
}

.maintenance-submessage {
  margin: 0 0 32px 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
}

.maintenance-close-btn {
  padding: 14px 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  max-width: 200px;
}

.maintenance-close-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.maintenance-close-btn:active {
  transform: translateY(0);
}

@media (max-width: 480px) {
  .maintenance-popup {
    padding: 30px 20px;
  }
  
  .maintenance-icon {
    font-size: 56px;
  }
  
  .maintenance-popup h2 {
    font-size: 20px;
  }
  
  .maintenance-message {
    font-size: 15px;
  }
  
  .maintenance-submessage {
    font-size: 13px;
  }
  
  .maintenance-close-btn {
    padding: 12px 32px;
    font-size: 15px;
  }
}
```

---

## 3. 재적용 방법

### 점검창 다시 활성화하기

1. **LoginPage.tsx 수정**
   ```tsx
   // 15번째 줄에 state 추가
   const [showMaintenancePopup, setShowMaintenancePopup] = useState(true);
   
   // 115번째 줄 return 안에 JSX 추가 (위 코드 참고)
   ```

2. **CSS는 이미 적용되어 있으므로 추가 작업 불필요**

### 점검창 비활성화하기

```tsx
// 방법 1: state를 false로 변경
const [showMaintenancePopup, setShowMaintenancePopup] = useState(false);

// 방법 2: JSX 주석 처리
{/* 로그인 시스템 점검 팝업 */}
{/* showMaintenancePopup && (
  <div className="maintenance-overlay">
    ...
  </div>
) */}

// 방법 3: state와 JSX 모두 삭제 (완전 제거)
```

---

## 4. 커스터마이징

### 메시지 변경
```tsx
<p className="maintenance-message">
  현재 로그인 시스템 점검 중입니다.<br />
  로그인이 일시적으로 불가능합니다.
</p>
<p className="maintenance-submessage">
  점검이 완료되는대로 다시 이용하실 수 있습니다.<br />
  불편을 드려 죄송합니다.
</p>
```

### 아이콘 변경
```tsx
<div className="maintenance-icon">⚠️</div>
// 다른 이모지로 변경 가능: 🔧 🛠️ ⏰ 🚧
```

### 색상 변경
```css
.maintenance-close-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* 다른 그라디언트로 변경 가능 */
}
```

---

## 5. 주의사항

- 점검창은 z-index: 10000으로 설정되어 최상단에 표시됩니다
- 사용자가 "확인" 버튼을 누르면 닫을 수 있습니다
- 페이지 새로고침 시 다시 표시됩니다 (state가 초기화됨)
- 필요시 localStorage를 사용하여 닫은 후에도 다시 표시되지 않도록 구현 가능

---

## 6. 백업 날짜
2026년 6월 17일 (수요일)
