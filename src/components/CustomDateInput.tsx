import { useRef, useEffect } from 'react';

interface CustomDateInputProps {
  value: string; // YYYY-MM-DD 형식
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CustomDateInput({ value, onChange, placeholder = '연도-월-일' }: CustomDateInputProps) {
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);

  // value를 년/월/일로 분리
  const parts = value ? value.split('-') : ['', '', ''];
  const year = parts[0] || '';
  const month = parts[1] || '';
  const day = parts[2] || '';

  // 날짜 값이 변경될 때 onChange 호출
  const updateDate = (newYear: string, newMonth: string, newDay: string) => {
    // 모든 필드가 채워진 경우에만 유효한 날짜로 간주
    if (newYear.length === 4 && newMonth.length === 2 && newDay.length === 2) {
      onChange(`${newYear}-${newMonth}-${newDay}`);
    } else if (newYear || newMonth || newDay) {
      // 부분적으로 입력된 경우에도 저장 (나중에 완성될 수 있음)
      const paddedMonth = newMonth.padStart(2, '0');
      const paddedDay = newDay.padStart(2, '0');
      onChange(`${newYear || '0000'}-${paddedMonth || '00'}-${paddedDay || '00'}`);
    } else {
      onChange('');
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // 숫자만 허용
    if (value.length > 4) value = value.slice(0, 4); // 4자리 제한
    
    updateDate(value, month, day);
    
    // 4자리 입력 완료 시 월로 자동 이동
    if (value.length === 4) {
      monthRef.current?.focus();
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // 숫자만 허용
    if (value.length > 2) value = value.slice(0, 2); // 2자리 제한
    if (parseInt(value) > 12) value = '12'; // 최대 12
    
    updateDate(year, value, day);
    
    // 2자리 입력 완료 시 일로 자동 이동
    if (value.length === 2) {
      dayRef.current?.focus();
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // 숫자만 허용
    if (value.length > 2) value = value.slice(0, 2); // 2자리 제한
    if (parseInt(value) > 31) value = '31'; // 최대 31
    
    updateDate(year, month, value);
  };

  // Backspace 처리: 빈 필드에서 Backspace 누르면 이전 필드로 이동
  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 년도 필드에서는 이전 필드가 없음
  };

  const handleMonthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && month === '') {
      yearRef.current?.focus();
    }
  };

  const handleDayKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && day === '') {
      monthRef.current?.focus();
    }
  };

  return (
    <div className="custom-date-input">
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        placeholder="연도"
        value={year}
        onChange={handleYearChange}
        onKeyDown={handleYearKeyDown}
        className="date-part-input year-input"
        maxLength={4}
      />
      <span className="date-separator">-</span>
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        placeholder="월"
        value={month}
        onChange={handleMonthChange}
        onKeyDown={handleMonthKeyDown}
        className="date-part-input month-input"
        maxLength={2}
      />
      <span className="date-separator">-</span>
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        placeholder="일"
        value={day}
        onChange={handleDayChange}
        onKeyDown={handleDayKeyDown}
        className="date-part-input day-input"
        maxLength={2}
      />
    </div>
  );
}
