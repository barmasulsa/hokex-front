import React, { useState } from 'react';
import type { EventRecord } from '../types';
import { 
  format, addMonths, subMonths, startOfMonth, 
  endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, 
  isSameMonth, isToday, startOfDay
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarWidgetProps {
  savedEvents: EventRecord[];
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ savedEvents }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

  const eventsMap = new Map<string, EventRecord[]>();
  savedEvents.forEach(evt => {
    const sDate = startOfDay(new Date(evt.startDate));
    const dtKey = sDate.getTime().toString();
    if (!eventsMap.has(dtKey)) {
      eventsMap.set(dtKey, []);
    }
    eventsMap.get(dtKey)!.push(evt);
  });

  return (
    <div className="calendar-widget glass-panel">
      <div className="cal-header">
        <button className="icon-btn" onClick={handlePrevMonth}><ChevronLeft size={20}/></button>
        <h3 className="cal-title">{format(currentDate, 'yyyy년 M월')}</h3>
        <button className="icon-btn" onClick={handleNextMonth}><ChevronRight size={20}/></button>
      </div>
      
      <div className="cal-grid cal-header-days">
        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
          <div key={d} className="cal-day-name">{d}</div>
        ))}
      </div>

      <div className="cal-grid cal-body">
        {daysInMonth.map(day => {
          const dtKey = startOfDay(day).getTime().toString();
          const dayEvents = eventsMap.get(dtKey) || [];

          return (
            <div 
              key={day.toISOString()} 
              className={`cal-cell ${!isSameMonth(day, monthStart) ? 'dimmed' : ''} ${isToday(day) ? 'today' : ''}`}
            >
              <div className="cal-cell-number">{format(day, 'd')}</div>
              <div className="cal-events">
                {dayEvents.map(e => (
                  <div key={e.id} className="cal-event-dot" title={e.title} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
