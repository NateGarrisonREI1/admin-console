"use client";

import { useState } from "react";

export default function AvailabilityControls() {
  const [days, setDays] = useState(7);
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.8 }}>
        Days
        <input className="admin-input" type="number" min={1} max={21} value={days} onChange={(e) => setDays(Number(e.target.value || 7))} style={{ width: 110 }} />
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.8 }}>
        Slot
        <select className="admin-input" value={slotMinutes} onChange={(e) => setSlotMinutes(Number(e.target.value))} style={{ width: 130 }}>
          <option value={30}>30 min</option>
          <option value={60}>60 min</option>
          <option value={90}>90 min</option>
          <option value={120}>120 min</option>
        </select>
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.8 }}>
        Start
        <input className="admin-input" type="number" min={0} max={23} value={startHour} onChange={(e) => setStartHour(Number(e.target.value || 9))} style={{ width: 110 }} />
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.8 }}>
        End
        <input className="admin-input" type="number" min={1} max={24} value={endHour} onChange={(e) => setEndHour(Number(e.target.value || 17))} style={{ width: 110 }} />
      </label>

      {/* shared rules for SlotList */}
      <div
        data-slot-rules
        style={{ display: "none" }}
        data-days={days}
        data-slot-minutes={slotMinutes}
        data-start-hour={startHour}
        data-end-hour={endHour}
      />

      <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.65, paddingBottom: 4 }}>
        Next {days} days • {slotMinutes} min • {startHour}:00–{endHour}:00
      </div>
    </div>
  );
}
