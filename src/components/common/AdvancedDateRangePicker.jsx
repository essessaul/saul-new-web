import React, { useMemo, useState } from "react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfDay(year, monthIndex, day) {
  const d = new Date(year, monthIndex, day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildMonth(year, monthIndex) {
  const first = startOfDay(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const jsWeekday = first.getDay();
  const mondayOffset = (jsWeekday + 6) % 7;

  const cells = [];
  for (let i = 0; i < mondayOffset; i += 1) {
    cells.push({ empty: true, key: `empty-start-${monthIndex}-${i}` });
  }

  for (let day = 1; day <= lastDay; day += 1) {
    const date = startOfDay(year, monthIndex, day);
    cells.push({
      day,
      date,
      dateKey: toKey(date),
      key: `${year}-${monthIndex}-${day}`,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ empty: true, key: `empty-end-${monthIndex}-${cells.length}` });
  }

  return {
    label: first.toLocaleString("en-US", { month: "long", year: "numeric" }),
    cells,
  };
}

function nightsBetween(start, end) {
  if (!start || !end) return 0;
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

export default function AdvancedDateRangePicker({
  monthsToShow = 2,
  startMonth = new Date(2026, 3, 1),
  blockedDateKeys = [],
  minNights = 1,
  onChange,
}) {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  const blockedSet = useMemo(() => new Set(blockedDateKeys), [blockedDateKeys]);

  const months = useMemo(() => {
    return Array.from({ length: monthsToShow }).map((_, index) => {
      const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + index, 1);
      return buildMonth(monthDate.getFullYear(), monthDate.getMonth());
    });
  }, [monthsToShow, startMonth]);

  function hasBlockedBetween(start, end) {
    const startTs = start.getTime();
    const endTs = end.getTime();
    for (const month of months) {
      for (const cell of month.cells) {
        if (!cell.empty && blockedSet.has(cell.dateKey)) {
          const ts = cell.date.getTime();
          if (ts > startTs && ts < endTs) return true;
        }
      }
    }
    return false;
  }

  function resetTo(date) {
    setStartDate(date);
    setEndDate(null);
    setHoverDate(null);
    if (onChange) onChange(date, null);
  }

  function handleClick(cell) {
    if (cell.empty || blockedSet.has(cell.dateKey)) return;

    if (!startDate || (startDate && endDate)) {
      resetTo(cell.date);
      return;
    }

    if (cell.date.getTime() <= startDate.getTime()) {
      resetTo(cell.date);
      return;
    }

    const nights = nightsBetween(startDate, cell.date);
    if (nights < minNights) return;
    if (hasBlockedBetween(startDate, cell.date)) return;

    setEndDate(cell.date);
    setHoverDate(null);
    if (onChange) onChange(startDate, cell.date);
  }

  function handleMouseEnter(cell) {
    if (cell.empty || blockedSet.has(cell.dateKey)) return;
    if (!startDate || endDate) return;
    if (cell.date.getTime() > startDate.getTime()) {
      if (!hasBlockedBetween(startDate, cell.date)) {
        setHoverDate(cell.date);
      } else {
        setHoverDate(null);
      }
    }
  }

  function handleMouseLeave() {
    if (!endDate) setHoverDate(null);
  }

  const rangeEnd = endDate || hoverDate;

  function isSelected(date) {
    const ts = date.getTime();
    return (startDate && ts === startDate.getTime()) || (endDate && ts === endDate.getTime());
  }

  function isInRange(date) {
    if (!startDate || !rangeEnd) return false;
    const ts = date.getTime();
    return ts >= startDate.getTime() && ts <= rangeEnd.getTime();
  }

  return (
    <div>
      <div className="airbnb-calendar-wrap" onMouseLeave={h&&leMouseLeave}>
        {months.map((month) => (
          <div key={month.label} className="airbnb-month-card">
            <div className="airbnb-month-label">{month.label}</div>
            <div className="airbnb-weekdays">
              {WEEKDAYS.map((day) => (
                <div key={day} className="airbnb-weekday">{day}</div>
              ))}
            </div>

            <div className="airbnb-month-grid">
              {month.cells.map((cell) => {
                if (cell.empty) return <div key={cell.key} className="airbnb-day-empty" />;

                let className = "airbnb-day";
                if (blockedSet.has(cell.dateKey)) className += " blocked";
                else className += " available";
                if (isInRange(cell.date)) className += " in-range";
                if (isSelected(cell.date)) className += " selected";

                return (
                  <button
                    key={cell.key}
                    type="button"
                    className={className}
                    onClick={() => handleClick(cell)}
                    onMouseEnter={() => handleMouseEnter(cell)}
                    disabled={blockedSet.has(cell.dateKey)}
                    aria-label={cell.dateKey}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="muted" style={{ marginTop: "1rem", fontWeight: 700 }}>
        {!startDate ? "Choose check-in date" : !endDate ? "Choose checkout date" : "Range selected"}
      </div>
    </div>
  );
}
