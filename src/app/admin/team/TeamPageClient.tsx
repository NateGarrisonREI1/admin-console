// src/app/admin/team/TeamPageClient.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/20/solid";
import { AdjustmentsHorizontalIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import type { TeamPageData, UnifiedTeamMember, UnifiedScheduleEntry, MemberType } from "./actions";
import { addTeamMember, scheduleService, fetchScheduleWeek, fetchScheduleMonth } from "./actions";
import type { ServiceCatalog, ServiceCatalogCategory } from "../_actions/services";
import { fetchServiceCatalog } from "../_actions/services";
// ─── Design tokens ──────────────────────────────────────────────────
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";
const BG = "#0f172a";

type FilterType = "all" | "hes" | "inspector";
type ScheduleView = "week" | "month";

type Props = {
  data: TeamPageData;
  initialTab?: string;
};

// ─── Cert/Area presets ──────────────────────────────────────────────
const HES_CERTS = ["BPI", "DOE HES", "RESNET", "ENERGY STAR"];
const INSP_CERTS = ["ASHI", "InterNACHI", "State Licensed", "Radon", "Mold"];
const SERVICE_AREAS = ["Portland Metro", "Salem", "Eugene", "Bend", "Medford", "Corvallis"];

// ─── Helpers ────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return mon;
}

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDayLabel(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function isOnTimeOff(member: UnifiedTeamMember, date: string): boolean {
  return member.time_off.some((p) => date >= p.start && date <= p.end);
}

function getStatusDot(member: UnifiedTeamMember, todayJobs: number): { color: string; label: string } {
  if (member.status !== "active") return { color: "#64748b", label: "Inactive" };
  if (isOnTimeOff(member, todayStr())) return { color: "#ef4444", label: "Time Off" };
  if (todayJobs > 0) return { color: "#fbbf24", label: "Busy" };
  return { color: "#10b981", label: "Available" };
}

// ─── KPI Card ───────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px" }}>
      <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

// ─── Pill Toggle ────────────────────────────────────────────────────

function PillToggle({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: Set<string>;
  onToggle: (val: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((opt) => {
        const active = selected.has(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            style={{
              padding: "5px 12px",
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "all 0.12s",
              background: active ? EMERALD : "#334155",
              color: active ? "#fff" : TEXT_SEC,
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Toast ──────────────────────────────────────────────────────────

function ListToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 100,
      padding: "12px 20px",
      borderRadius: 10,
      background: EMERALD,
      color: "#fff",
      fontWeight: 700,
      fontSize: 13,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      {message}
    </div>
  );
}

// ─── Mobile Card (< 640px) ──────────────────────────────────────────

function TeamMobileCard({
  member, todayInfo, onClick,
}: {
  member: UnifiedTeamMember;
  todayInfo: { count: number; assignment: string | null };
  onClick: () => void;
}) {
  const dot = getStatusDot(member, todayInfo.count);
  return (
    <div
      onClick={onClick}
      style={{
        background: "rgba(30,41,59,0.5)",
        borderRadius: 12,
        padding: 16,
        border: "1px solid rgba(51,65,85,0.5)",
        marginBottom: 12,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{member.name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot.color }} />
          <span style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 500 }}>{dot.label}</span>
        </div>
      </div>
      <div style={{ marginBottom: 6 }}>
        <span style={{
          display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
          background: member.type === "hes" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
          color: member.type === "hes" ? "#10b981" : "#f59e0b",
        }}>
          {member.type === "hes" ? "HES" : "Inspector"}
        </span>
      </div>
      <div style={{ fontSize: 12, color: TEXT_MUTED }}>
        {member.email ?? "No email"}
        {member.phone && <span style={{ marginLeft: 8, color: TEXT_DIM }}>{member.phone}</span>}
      </div>
    </div>
  );
}

// ─── Team Table ─────────────────────────────────────────────────────

function TeamTable({
  members,
  todayJobMap,
  onView,
}: {
  members: UnifiedTeamMember[];
  todayJobMap: Map<string, { count: number; assignment: string | null }>;
  onView: (m: UnifiedTeamMember) => void;
}) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Info bar */}
      <div style={{ padding: "8px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED }}>{members.length} team members</span>
      </div>

      {/* Table */}
      <div className="admin-table-desktop" style={{ overflowX: "auto" }}>
        <table className="admin-table" style={{ minWidth: 800 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Certifications</th>
              <th>Today&apos;s Schedule</th>
              <th>Status</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const info = todayJobMap.get(member.id) ?? { count: 0, assignment: null };
              const dot = getStatusDot(member, info.count);
              return (
                <tr
                  key={member.id}
                  onClick={() => onView(member)}
                  style={{ cursor: "pointer", transition: "background 0.1s ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(148,163,184,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                >
                  {/* Name + Email */}
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{member.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: TEXT_MUTED, marginTop: 1 }}>
                      {member.email ?? "No email"}
                    </div>
                  </td>

                  {/* Type badge */}
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        background: member.type === "hes" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                        color: member.type === "hes" ? "#10b981" : "#f59e0b",
                      }}
                    >
                      {member.type === "hes" ? "HES" : "Inspector"}
                    </span>
                  </td>

                  {/* Certifications */}
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {member.certifications.length === 0 ? (
                        <span style={{ fontSize: 12, color: TEXT_DIM }}>—</span>
                      ) : (
                        member.certifications.slice(0, 3).map((c) => (
                          <span
                            key={c}
                            style={{
                              display: "inline-block",
                              padding: "2px 7px",
                              borderRadius: 5,
                              fontSize: 10,
                              fontWeight: 600,
                              background: "rgba(148,163,184,0.08)",
                              color: TEXT_MUTED,
                              border: "1px solid rgba(148,163,184,0.15)",
                            }}
                          >
                            {c}
                          </span>
                        ))
                      )}
                      {member.certifications.length > 3 && (
                        <span style={{ fontSize: 10, color: TEXT_DIM, alignSelf: "center" }}>+{member.certifications.length - 3}</span>
                      )}
                    </div>
                  </td>

                  {/* Today's Schedule */}
                  <td>
                    <span style={{ fontSize: 12, color: info.assignment ? TEXT_SEC : TEXT_DIM, fontWeight: info.assignment ? 500 : 400 }}>
                      {info.assignment ?? "Free"}
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 500 }}>{dot.label}</span>
                    </div>
                  </td>

                  {/* Rating */}
                  <td>
                    <span style={{ fontSize: 13, fontWeight: 600, color: member.avg_rating > 0 ? "#fbbf24" : TEXT_DIM }}>
                      {member.avg_rating > 0 ? member.avg_rating.toFixed(1) : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: TEXT_DIM, fontSize: 13 }}>
                  No team members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="admin-card-mobile" style={{ padding: 16 }}>
        {members.length === 0 ? (
          <div style={{ padding: "32px 24px", textAlign: "center", color: TEXT_DIM, fontSize: 13 }}>
            No team members found.
          </div>
        ) : members.map((member) => {
          const info = todayJobMap.get(member.id) ?? { count: 0, assignment: null };
          return (
            <TeamMobileCard
              key={member.id}
              member={member}
              todayInfo={info}
              onClick={() => onView(member)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Schedule Week View ─────────────────────────────────────────────

function ScheduleWeekView({
  schedule,
  members,
  weekStart,
  onPrevWeek,
  onNextWeek,
}: {
  schedule: UnifiedScheduleEntry[];
  members: UnifiedTeamMember[];
  weekStart: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}) {
  const days: string[] = [];
  const d = new Date(weekStart + "T12:00:00");
  for (let i = 0; i < 7; i++) {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    days.push(dd.toISOString().slice(0, 10));
  }
  const today = todayStr();
  const activeMembers = members.filter((m) => m.status === "active");

  return (
    <div>
      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={onPrevWeek} style={navBtnStyle}><ChevronLeftIcon style={{ width: 14, height: 14 }} /></button>
        <span style={{ fontSize: 13, color: TEXT, fontWeight: 600, minWidth: 160, textAlign: "center" }}>
          {formatDate(days[0])} — {formatDate(days[6])}
        </span>
        <button type="button" onClick={onNextWeek} style={navBtnStyle}><ChevronRightIcon style={{ width: 14, height: 14 }} /></button>
      </div>

      {/* Grid */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ ...schedHeadStyle, position: "sticky", left: 0, background: CARD, minWidth: 140, zIndex: 1, textAlign: "left" }}>
                Team Member
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  style={{
                    ...schedHeadStyle,
                    textAlign: "center",
                    minWidth: 100,
                    color: day === today ? EMERALD : TEXT_DIM,
                    background: day === today ? "rgba(16,185,129,0.06)" : "transparent",
                  }}
                >
                  {formatDayLabel(day)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeMembers.map((member) => (
              <tr key={member.id} style={{ borderBottom: `1px solid rgba(51,65,85,0.5)` }}>
                <td style={{ padding: "8px 12px", color: TEXT, fontWeight: 600, fontSize: 12, position: "sticky", left: 0, background: CARD, whiteSpace: "nowrap", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ padding: "1px 5px", borderRadius: 4, fontSize: 9, fontWeight: 700, color: member.type === "hes" ? "#10b981" : "#f59e0b", background: member.type === "hes" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)" }}>
                      {member.type === "hes" ? "H" : "I"}
                    </span>
                    {member.name}
                  </div>
                </td>
                {days.map((day) => {
                  const timeOff = isOnTimeOff(member, day);
                  const jobs = schedule.filter((s) => s.team_member_id === member.id && s.scheduled_date === day && s.status !== "cancelled");
                  const isToday = day === today;
                  return (
                    <td key={day} style={{ padding: "6px 6px", textAlign: "center", background: isToday ? "rgba(16,185,129,0.06)" : "transparent" }}>
                      {timeOff ? (
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                          Time Off
                        </span>
                      ) : jobs.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {jobs.map((j) => (
                            <span
                              key={j.id}
                              style={{ padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: j.type === "hes" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: j.type === "hes" ? "#10b981" : "#f59e0b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                              title={`${j.customer_name} ${j.scheduled_time ?? ""}`}
                            >
                              {j.scheduled_time ? j.scheduled_time.slice(0, 5) : j.type === "hes" ? "HES" : "Insp"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 10, color: "#475569" }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const schedHeadStyle: React.CSSProperties = {
  padding: "8px 12px",
  color: TEXT_DIM,
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: `1px solid ${BORDER}`,
};

const navBtnStyle: React.CSSProperties = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  padding: "5px 8px",
  color: TEXT_MUTED,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

// ─── Schedule Month View ────────────────────────────────────────────

function ScheduleMonthView({
  monthData,
  year,
  month,
  onPrevMonth,
  onNextMonth,
}: {
  monthData: { date: string; hesCount: number; inspCount: number }[];
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDow = firstDay.getDay();
  const offset = startDow === 0 ? 6 : startDow - 1;
  const today = todayStr();
  const dataMap = new Map<string, { hesCount: number; inspCount: number }>();
  for (const d of monthData) dataMap.set(d.date, d);
  const monthLabel = firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={onPrevMonth} style={navBtnStyle}><ChevronLeftIcon style={{ width: 14, height: 14 }} /></button>
        <span style={{ fontSize: 13, color: TEXT, fontWeight: 600, minWidth: 160, textAlign: "center" }}>{monthLabel}</span>
        <button type="button" onClick={onNextMonth} style={navBtnStyle}><ChevronRightIcon style={{ width: 14, height: 14 }} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, color: TEXT_DIM, fontWeight: 700, padding: 4 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} style={{ minHeight: 56 }} />;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const counts = dataMap.get(dateStr);
          const isToday = dateStr === today;
          return (
            <div
              key={dateStr}
              style={{
                minHeight: 56,
                background: isToday ? "rgba(16,185,129,0.06)" : CARD,
                border: `1px solid ${isToday ? "rgba(16,185,129,0.3)" : BORDER}`,
                borderRadius: 6,
                padding: 5,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: isToday ? EMERALD : TEXT_DIM, marginBottom: 3 }}>{day}</div>
              {counts ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {counts.hesCount > 0 && <div style={{ fontSize: 9, color: "#10b981", fontWeight: 600 }}>{counts.hesCount} HES</div>}
                  {counts.inspCount > 0 && <div style={{ fontSize: 9, color: "#f59e0b", fontWeight: 600 }}>{counts.inspCount} Insp</div>}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Modal Primitives ───────────────────────────────────────────────

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.60)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div style={{
        background: "#1e293b",
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: 28,
        maxHeight: "85vh",
        overflowY: "auto",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
      }}>
        {children}
      </div>
    </div>
  );
}

function ModalField({ label, value, onChange, type = "text", placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="admin-input"
        style={{ fontSize: 13, padding: "9px 12px" }}
      />
    </div>
  );
}

function ModalSelect({ label, value, onChange, children }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="admin-input"
        style={{ fontSize: 13, padding: "9px 12px" }}
      >
        {children}
      </select>
    </div>
  );
}

function ModalTextarea({ label, value, onChange, rows = 3 }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="admin-input"
        style={{ fontSize: 13, padding: "9px 12px", resize: "vertical" }}
      />
    </div>
  );
}

const modalBtnCancel: React.CSSProperties = {
  padding: "9px 20px",
  borderRadius: 8,
  border: "none",
  background: "#334155",
  color: TEXT_SEC,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const modalBtnPrimary: React.CSSProperties = {
  padding: "9px 20px",
  borderRadius: 8,
  border: "none",
  background: EMERALD,
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

// ─── Type Selector Card ─────────────────────────────────────────────

function TypeSelectorCard({
  icon,
  title,
  description,
  selected,
  onClick,
  accent = EMERALD,
  accentBg = "rgba(16,185,129,0.08)",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  accent?: string;
  accentBg?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "14px 16px",
        borderRadius: 10,
        border: `1.5px solid ${selected ? accent : "#475569"}`,
        background: selected ? accentBg : "transparent",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        transition: "all 0.12s",
      }}
    >
      <div style={{ color: selected ? accent : TEXT_DIM, flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: selected ? TEXT : TEXT_SEC }}>{title}</div>
        <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>{description}</div>
      </div>
    </button>
  );
}

// ─── Add Team Member Modal ──────────────────────────────────────────

function AddTeamMemberModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [memberType, setMemberType] = useState<MemberType>("hes");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [license, setLicense] = useState("");
  const [selectedCerts, setSelectedCerts] = useState<Set<string>>(new Set());
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  function toggleCert(val: string) {
    setSelectedCerts((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  }

  function toggleArea(val: string) {
    setSelectedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await addTeamMember({
        type: memberType,
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        license_number: memberType === "inspector" ? (license.trim() || undefined) : undefined,
        certifications: Array.from(selectedCerts),
        service_areas: Array.from(selectedAreas),
      });
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  const certOptions = memberType === "hes" ? HES_CERTS : INSP_CERTS;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="admin-modal-content" style={{ width: 500 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: TEXT, margin: "0 0 18px" }}>Add Team Member</h3>

        {/* Type selector cards */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <TypeSelectorCard
            icon={<ClipboardDocumentCheckIcon style={{ width: 20, height: 20 }} />}
            title="HES Assessor"
            description="Home energy score evaluations"
            selected={memberType === "hes"}
            onClick={() => { setMemberType("hes"); setSelectedCerts(new Set()); }}
            accent="#10b981"
            accentBg="rgba(16,185,129,0.08)"
          />
          <TypeSelectorCard
            icon={<MagnifyingGlassIcon style={{ width: 20, height: 20 }} />}
            title="Home Inspector"
            description="Property condition inspections"
            selected={memberType === "inspector"}
            onClick={() => { setMemberType("inspector"); setSelectedCerts(new Set()); }}
            accent="#f59e0b"
            accentBg="rgba(245,158,11,0.08)"
          />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: BORDER, margin: "0 0 18px" }} />

        <ModalField label="Full Name *" value={name} onChange={setName} placeholder="e.g. John Smith" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <ModalField label="Email" value={email} onChange={setEmail} placeholder="john@example.com" />
          <ModalField label="Phone" value={phone} onChange={setPhone} placeholder="(503) 555-0100" />
        </div>
        {memberType === "inspector" && (
          <ModalField label="License Number" value={license} onChange={setLicense} placeholder="OR-12345" />
        )}

        {/* Certifications pills */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Certifications
          </label>
          <PillToggle options={certOptions} selected={selectedCerts} onToggle={toggleCert} />
        </div>

        {/* Service Areas pills */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Service Areas
          </label>
          <PillToggle options={SERVICE_AREAS} selected={selectedAreas} onToggle={toggleArea} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" onClick={onClose} style={modalBtnCancel}>Cancel</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
            style={{ ...modalBtnPrimary, opacity: saving || !name.trim() ? 0.5 : 1, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Adding..." : "Add Member"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Tier Selector Pill ─────────────────────────────────────────────

function TierPill({
  tier,
  selected,
  onClick,
}: {
  tier: { id: string; size_label: string; price: number };
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 12px",
        borderRadius: 10,
        border: `1.5px solid ${selected ? EMERALD : "#475569"}`,
        background: selected ? "rgba(16,185,129,0.08)" : "transparent",
        cursor: "pointer",
        textAlign: "center",
        transition: "all 0.12s",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: selected ? TEXT : TEXT_SEC }}>{tier.size_label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: selected ? EMERALD : TEXT_MUTED, marginTop: 2 }}>
        ${tier.price}
      </div>
    </button>
  );
}

// ─── Schedule Service Modal ─────────────────────────────────────────

function ScheduleServiceModal({
  members,
  catalog,
  onClose,
  onScheduled,
}: {
  members: UnifiedTeamMember[];
  catalog: ServiceCatalog;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [serviceType, setServiceType] = useState<MemberType>("hes");
  const [memberId, setMemberId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [inspType, setInspType] = useState("standard");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Catalog-driven pricing
  const [selectedTierId, setSelectedTierId] = useState("");
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [sqFt, setSqFt] = useState("");

  const today = todayStr();

  // Resolve catalog categories
  const hesCat = catalog.find((c) => c.slug === "hes");
  const inspCat = catalog.find((c) => c.slug === "inspection");
  const activeCat = serviceType === "hes" ? hesCat : inspCat;
  const activeTiers = (activeCat?.tiers ?? []).filter((t) => t.is_active);
  const activeAddons = (activeCat?.addons ?? []).filter((a) => a.is_active);

  // Auto-select tier from sq footage
  function handleSqFtChange(val: string) {
    setSqFt(val);
    const sqFtNum = parseInt(val, 10);
    if (!isNaN(sqFtNum) && activeTiers.length > 0) {
      const match = activeTiers.find((t) => {
        const min = t.sq_ft_min ?? 0;
        const max = t.sq_ft_max ?? Infinity;
        return sqFtNum >= min && sqFtNum <= max;
      });
      if (match) setSelectedTierId(match.id);
    }
  }

  function toggleAddon(addonId: string) {
    setSelectedAddonIds((prev) => {
      const next = new Set(prev);
      if (next.has(addonId)) next.delete(addonId);
      else next.add(addonId);
      return next;
    });
  }

  // Compute total
  const selectedTier = activeTiers.find((t) => t.id === selectedTierId);
  const basePrice = selectedTier?.price ?? 0;
  const addonsTotal = activeAddons
    .filter((a) => selectedAddonIds.has(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const totalPrice = basePrice + addonsTotal;

  // All members of the selected type — show availability
  const typeMembers = members.filter((m) => m.type === serviceType && m.status === "active");
  const eligibleIds = new Set(typeMembers.filter((m) => !isOnTimeOff(m, date || today)).map((m) => m.id));

  function handleTypeSwitch(newType: MemberType) {
    setServiceType(newType);
    setMemberId("");
    setSelectedTierId("");
    setSelectedAddonIds(new Set());
    setSqFt("");
  }

  async function handleSubmit() {
    if (!customerName.trim() || !date) return;
    setSaving(true);
    try {
      await scheduleService({
        type: serviceType,
        team_member_id: memberId || undefined,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        zip: zip.trim() || undefined,
        inspection_type: serviceType === "inspector" ? inspType : undefined,
        scheduled_date: date,
        scheduled_time: time || undefined,
        special_notes: notes.trim() || undefined,
        invoice_amount: totalPrice > 0 ? totalPrice : undefined,
      });
      onScheduled();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="admin-modal-content" style={{ width: 520 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: TEXT, margin: "0 0 18px" }}>Schedule Service</h3>

        {/* Type selector cards */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <TypeSelectorCard
            icon={<ClipboardDocumentCheckIcon style={{ width: 20, height: 20 }} />}
            title="HES Assessment"
            description="Home energy score evaluation"
            selected={serviceType === "hes"}
            onClick={() => handleTypeSwitch("hes")}
            accent="#10b981"
            accentBg="rgba(16,185,129,0.08)"
          />
          <TypeSelectorCard
            icon={<MagnifyingGlassIcon style={{ width: 20, height: 20 }} />}
            title="Home Inspection"
            description="Property condition inspection"
            selected={serviceType === "inspector"}
            onClick={() => handleTypeSwitch("inspector")}
            accent="#f59e0b"
            accentBg="rgba(245,158,11,0.08)"
          />
        </div>

        <div style={{ height: 1, background: BORDER, margin: "0 0 18px" }} />

        {/* Assignee */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Assign To
          </label>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="admin-input"
            style={{ fontSize: 13, padding: "9px 12px" }}
          >
            <option value="">Unassigned</option>
            {typeMembers.map((m) => {
              const available = eligibleIds.has(m.id);
              return (
                <option key={m.id} value={m.id} disabled={!available}>
                  {m.name}{!available ? " (Time Off)" : ""}
                </option>
              );
            })}
          </select>
        </div>

        {/* Customer info */}
        <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Customer</div>
        <ModalField label="Name *" value={customerName} onChange={setCustomerName} placeholder="Customer name" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <ModalField label="Email" value={customerEmail} onChange={setCustomerEmail} />
          <ModalField label="Phone" value={customerPhone} onChange={setCustomerPhone} />
        </div>

        {/* Address */}
        <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Address</div>
        <ModalField label="Street" value={address} onChange={setAddress} placeholder="123 Main St" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <ModalField label="City" value={city} onChange={setCity} />
          <ModalField label="ZIP" value={zip} onChange={setZip} />
        </div>

        {serviceType === "inspector" && (
          <ModalSelect label="Inspection Type" value={inspType} onChange={setInspType}>
            {["standard", "203k", "commercial", "pre_listing", "new_construction"].map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </ModalSelect>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <ModalField label="Date *" value={date} onChange={setDate} type="date" />
          <ModalField label="Time" value={time} onChange={setTime} type="time" />
        </div>

        {/* ─── Pricing Section ─── */}
        <div style={{ height: 1, background: BORDER, margin: "4px 0 16px" }} />
        <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Pricing</div>

        {/* Sq Ft input */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Sq Ft (optional — auto-selects tier)
          </label>
          <input
            type="number"
            value={sqFt}
            onChange={(e) => handleSqFtChange(e.target.value)}
            placeholder="e.g. 2000"
            className="admin-input"
            style={{ fontSize: 13, padding: "9px 12px", width: 160 }}
          />
        </div>

        {/* Home Size tier selector */}
        {activeTiers.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Home Size
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {activeTiers.map((tier) => (
                <TierPill
                  key={tier.id}
                  tier={tier}
                  selected={selectedTierId === tier.id}
                  onClick={() => setSelectedTierId(tier.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add-On Services (inspection only) */}
        {activeAddons.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Add-On Services
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {activeAddons.map((addon) => {
                const isSelected = selectedAddonIds.has(addon.id);
                return (
                  <button
                    key={addon.id}
                    type="button"
                    onClick={() => toggleAddon(addon.id)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 9999,
                      fontSize: 12,
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.12s",
                      background: isSelected ? EMERALD : "#334155",
                      color: isSelected ? "#fff" : TEXT_SEC,
                    }}
                  >
                    {addon.name} ${addon.price}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Total */}
        {selectedTierId && (
          <div style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.2)",
            marginBottom: 14,
          }}>
            {addonsTotal > 0 ? (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: TEXT_MUTED }}>
                  Base: <span style={{ fontWeight: 700, color: TEXT_SEC }}>${basePrice}</span>
                  {" + "}Add-Ons: <span style={{ fontWeight: 700, color: TEXT_SEC }}>${addonsTotal}</span>
                </span>
                <span style={{ fontWeight: 700, color: EMERALD, fontSize: 15 }}>
                  Total: ${totalPrice}
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: TEXT_MUTED }}>Service total</span>
                <span style={{ fontWeight: 700, color: EMERALD, fontSize: 15 }}>
                  Total: ${totalPrice}
                </span>
              </div>
            )}
          </div>
        )}

        <ModalTextarea label="Notes" value={notes} onChange={setNotes} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onClose} style={modalBtnCancel}>Cancel</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !customerName.trim() || !date}
            style={{ ...modalBtnPrimary, opacity: saving || !customerName.trim() || !date ? 0.5 : 1, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Scheduling..." : "Schedule"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function TeamPageClient({ data, initialTab }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [scheduleView, setScheduleView] = useState<ScheduleView>("week");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [catalog, setCatalog] = useState<ServiceCatalog>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()).toISOString().slice(0, 10));
  const [weekSchedule, setWeekSchedule] = useState<UnifiedScheduleEntry[]>(data.weekSchedule);
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [monthData, setMonthData] = useState<{ date: string; hesCount: number; inspCount: number }[]>([]);
  const [monthLoaded, setMonthLoaded] = useState(false);
  const [listToast, setListToast] = useState<string | null>(null);

  const today = todayStr();

  const filteredMembers = data.members.filter((m) => filter === "all" || m.type === filter);

  // Build today job map
  const todayJobMap = new Map<string, { count: number; assignment: string | null }>();
  for (const m of data.members) {
    const jobs = data.weekSchedule.filter((s) => s.team_member_id === m.id && s.scheduled_date === today && s.status !== "cancelled");
    todayJobMap.set(m.id, {
      count: jobs.length,
      assignment: jobs.length > 0 ? `${jobs[0].customer_name}${jobs.length > 1 ? ` (+${jobs.length - 1} more)` : ""}` : null,
    });
  }

  const navigateWeek = useCallback(async (direction: -1 | 1) => {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() + direction * 7);
    const newStart = d.toISOString().slice(0, 10);
    setWeekStart(newStart);
    setWeekSchedule(await fetchScheduleWeek(newStart));
  }, [weekStart]);

  const navigateMonth = useCallback(async (direction: -1 | 1) => {
    let { year, month } = monthYear;
    month += direction;
    if (month < 1) { month = 12; year--; }
    if (month > 12) { month = 1; year++; }
    setMonthYear({ year, month });
    setMonthData(await fetchScheduleMonth(year, month));
  }, [monthYear]);

  const switchToMonth = useCallback(async () => {
    setScheduleView("month");
    if (!monthLoaded) {
      setMonthData(await fetchScheduleMonth(monthYear.year, monthYear.month));
      setMonthLoaded(true);
    }
  }, [monthYear, monthLoaded]);

  async function openScheduleModal() {
    if (!catalogLoaded) {
      const data = await fetchServiceCatalog();
      setCatalog(data);
      setCatalogLoaded(true);
    }
    setShowScheduleModal(true);
  }

  function handleRefresh() { router.refresh(); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Team</h1>
          <p style={{ fontSize: 13, color: TEXT_DIM, margin: "4px 0 0", fontWeight: 500 }}>
            Manage your in-house HES assessors and home inspectors.
          </p>
        </div>
        {(
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={openScheduleModal} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              + Schedule Service
            </button>
            <button type="button" onClick={() => setShowAddModal(true)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: EMERALD, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              + Add Team Member
            </button>
          </div>
        )}
      </div>

      {/* Stats Row */}
      {(
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <KpiCard label="Total Members" value={data.stats.total} color={EMERALD} />
          <KpiCard label="Available Today" value={data.stats.availableToday} color="#10b981" />
          <KpiCard label="Scheduled Today" value={data.stats.scheduledToday} color="#f59e0b" />
          <KpiCard label="This Week" value={data.stats.thisWeekTotal} color="#a78bfa" />
        </div>
      )}

      {/* Filter Toggle — Desktop */}
      <div className="admin-filter-desktop" style={{ display: "flex", gap: 0, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
        {([
          { key: "all" as FilterType, label: "All" },
          { key: "hes" as FilterType, label: "HES Assessors" },
          { key: "inspector" as FilterType, label: "Inspectors" },
        ]).map((opt, idx, arr) => {
          const active = filter === opt.key;
          const count =
            opt.key === "all"
              ? data.members.length
              : data.members.filter((m) => m.type === opt.key).length;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              style={{
                padding: "7px 14px",
                border: "none",
                borderRight: idx < arr.length - 1 ? `1px solid ${BORDER}` : "none",
                background: active ? "rgba(16,185,129,0.1)" : "transparent",
                color: active ? EMERALD : TEXT_MUTED,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {opt.label}
              <span style={{ marginLeft: 5, padding: "1px 6px", borderRadius: 9999, fontSize: 10, fontWeight: 700, background: active ? "rgba(16,185,129,0.15)" : "rgba(148,163,184,0.08)", color: active ? EMERALD : TEXT_DIM }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Toggle — Mobile */}
      <div className="admin-mobile-filter-toggle">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((p) => !p)}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px", borderRadius: 8,
            border: `1px solid ${filter !== "all" ? "rgba(16,185,129,0.30)" : BORDER}`,
            background: CARD, cursor: "pointer",
          }}
        >
          <AdjustmentsHorizontalIcon style={{ width: 18, height: 18, color: filter !== "all" ? EMERALD : TEXT_MUTED }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: filter !== "all" ? EMERALD : TEXT }}>Filters</span>
          {filter !== "all" && (
            <span style={{
              padding: "1px 7px", borderRadius: 9999, fontSize: 11, fontWeight: 700,
              background: "rgba(16,185,129,0.15)", color: EMERALD,
            }}>1</span>
          )}
          <ChevronDownIcon style={{
            width: 16, height: 16, marginLeft: "auto",
            color: TEXT_MUTED, transition: "transform 0.15s",
            transform: mobileFiltersOpen ? "rotate(180deg)" : "rotate(0)",
          }} />
        </button>
        {mobileFiltersOpen && (
          <div style={{
            marginTop: 8, padding: 14, borderRadius: 10,
            background: CARD, border: `1px solid ${BORDER}`,
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" }}>Type</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="admin-select" style={{ fontSize: 13 }}
              >
                <option value="all">All ({data.members.length})</option>
                <option value="hes">HES Assessors ({data.members.filter((m) => m.type === "hes").length})</option>
                <option value="inspector">Inspectors ({data.members.filter((m) => m.type === "inspector").length})</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {(
        <>
          {/* Team Members Table */}
          <TeamTable
            members={filteredMembers}
            todayJobMap={todayJobMap}
            onView={(m) => router.push(`/admin/team/${m.id}?type=${m.type}`)}
          />

          {/* Schedule Section */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: 0 }}>Schedule</h2>
              <div style={{ display: "flex", gap: 0, background: BG, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: "hidden" }}>
                {(["week", "month"] as ScheduleView[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => v === "month" ? switchToMonth() : setScheduleView("week")}
                    style={{
                      padding: "5px 12px",
                      border: "none",
                      borderLeft: v === "month" ? `1px solid ${BORDER}` : "none",
                      background: scheduleView === v ? "rgba(16,185,129,0.1)" : "transparent",
                      color: scheduleView === v ? EMERALD : TEXT_DIM,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {scheduleView === "week" ? (
              <ScheduleWeekView schedule={weekSchedule} members={data.members} weekStart={weekStart} onPrevWeek={() => navigateWeek(-1)} onNextWeek={() => navigateWeek(1)} />
            ) : (
              <ScheduleMonthView monthData={monthData} year={monthYear.year} month={monthYear.month} onPrevMonth={() => navigateMonth(-1)} onNextMonth={() => navigateMonth(1)} />
            )}
          </div>

          {/* Modals */}
          {showAddModal && <AddTeamMemberModal onClose={() => setShowAddModal(false)} onAdded={() => { setShowAddModal(false); handleRefresh(); }} />}
          {showScheduleModal && <ScheduleServiceModal members={data.members} catalog={catalog} onClose={() => setShowScheduleModal(false)} onScheduled={() => { setShowScheduleModal(false); handleRefresh(); }} />}
        </>
      )}

      {/* Toast */}
      {listToast && <ListToast message={listToast} onDone={() => setListToast(null)} />}
    </div>
  );
}
