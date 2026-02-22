// src/app/(app)/broker/team/BrokerTeamClient.tsx
"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { TeamData, TeamMember, PlatformUser, REITeamMember } from "./actions";
import {
  searchNetworkContractors,
  addContractorToTeam,
  inviteContractor,
  updateTeamMember,
  removeTeamMember,
} from "./actions";

// ─── Tab Config ─────────────────────────────────────────────────────

type TabKey = "contractor" | "hes_assessor" | "inspector";

type TabConfig = {
  key: TabKey;
  label: string;
  singularLabel: string;
  accent: string;
  icon: "contractor" | "hes" | "inspector";
};

const TABS: TabConfig[] = [
  { key: "contractor", label: "Contractors", singularLabel: "Contractor", accent: "#8b5cf6", icon: "contractor" },
  { key: "hes_assessor", label: "HES Assessors", singularLabel: "HES Assessor", accent: "#10b981", icon: "hes" },
  { key: "inspector", label: "Home Inspectors", singularLabel: "Inspector", accent: "#f59e0b", icon: "inspector" },
];

// ─── Constants ──────────────────────────────────────────────────────

const SERVICE_TYPE_LABELS: Record<string, string> = {
  HVAC: "HVAC", Solar: "Solar", Electrical: "Electrical", Plumbing: "Plumbing",
  Insulation: "Insulation", Windows: "Windows", Handyman: "Handyman",
  hvac: "HVAC", solar: "Solar", electrical: "Electrical", plumbing: "Plumbing",
  insulation: "Insulation", windows: "Windows", general_handyman: "Handyman", water_heater: "Water Heater",
};

const SERVICE_AREAS = ["Portland Metro", "Salem", "Eugene", "Bend", "Medford", "Corvallis"];
const TRADE_OPTIONS = [
  { value: "hvac", label: "HVAC" },
  { value: "solar", label: "Solar" },
  { value: "water_heater", label: "Water Heater" },
  { value: "electrical", label: "Electrical" },
  { value: "insulation", label: "Insulation" },
  { value: "plumbing", label: "Plumbing" },
];

// ─── Styles ─────────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9",
  fontSize: 13, fontWeight: 500, outline: "none", boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
  letterSpacing: "0.05em", display: "block", marginBottom: 6,
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase",
  letterSpacing: "0.06em", marginBottom: 8,
};

// ─── Helpers ────────────────────────────────────────────────────────

function getStatusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "active":
      return { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" };
    case "paused":
      return { background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" };
    case "pending_invite":
      return { background: "rgba(234,179,8,0.12)", color: "#facc15", border: "1px solid rgba(234,179,8,0.25)" };
    default:
      return { background: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.25)" };
  }
}

function formatStatus(status: string): string {
  if (status === "pending_invite") return "Pending Invite";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function StatusPill({ status }: { status: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 10px",
      borderRadius: 9999, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
      ...getStatusStyle(status),
    }}>
      {formatStatus(status)}
    </span>
  );
}

function ServiceTypePill({ label, color }: { label: string; color?: string }) {
  const c = color ?? "#a78bfa";
  const bg = color ? `${color}1e` : "rgba(139,92,246,0.12)";
  const border = color ? `${color}40` : "rgba(139,92,246,0.25)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: 9999, fontSize: 11, fontWeight: 600,
      background: bg, color: c, border: `1px solid ${border}`, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function getUserDisplayName(u: PlatformUser): string {
  return u.full_name || [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "Unknown";
}

// ─── Tab Icon SVGs ──────────────────────────────────────────────────

function TabIcon({ type, color }: { type: TabConfig["icon"]; color: string }) {
  if (type === "contractor") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M13 7a3 3 0 11-6 0 3 3 0 016 0zM4 17a6 6 0 0112 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 8v4M14 10h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "hes") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="4" width="14" height="12" rx="2" stroke={color} strokeWidth="1.8" />
        <path d="M7 8h6M7 11h4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14" cy="11" r="1" fill={color} />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 10l3 3 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="3" width="16" height="14" rx="3" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

// ─── Drawer Shell ───────────────────────────────────────────────────

function DrawerShell({
  open, onClose, title, subtitle, children, footer,
}: {
  open: boolean; onClose: () => void; title: string; subtitle: string;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99990 }}>
      <button type="button" aria-label="Close" onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", border: "none", cursor: "default" }} />
      <div style={{
        position: "absolute", right: 0, top: 0, height: "100%", width: "100%", maxWidth: 420,
        display: "flex", flexDirection: "column", background: "#0f172a", borderLeft: "1px solid #334155",
        boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "1px solid #334155", padding: "16px 20px", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{title}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", marginTop: 2 }}>{subtitle}</div>
          </div>
          <button type="button" onClick={onClose} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f1f5f9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; }}
          >Close</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {children}
        </div>
        {footer && (
          <div style={{ borderTop: "1px solid #334155", padding: "16px 20px", flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Filter Pill ────────────────────────────────────────────────────

function FilterPill({ label, selected, color, onClick }: {
  label: string; selected: boolean; color?: string; onClick: () => void;
}) {
  const c = color ?? "#10b981";
  return (
    <button type="button" onClick={onClick}
      style={{
        padding: "4px 11px", borderRadius: 9999, fontSize: 11, fontWeight: 600, cursor: "pointer",
        background: selected ? `${c}22` : "transparent",
        color: selected ? c : "#64748b",
        border: selected ? `1px solid ${c}44` : "1px solid #334155",
        transition: "all 0.15s", whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ─── Browse Panel ───────────────────────────────────────────────────

function BrowsePanel({
  open, tabConfig, onClose, onAdded,
}: {
  open: boolean; tabConfig: TabConfig; onClose: () => void; onAdded: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);

  useEffect(() => {
    if (open) { setQuery(""); setResults([]); setAddingId(null); setSelectedAreas([]); setSelectedTrades([]); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const timer = setTimeout(() => {
      searchNetworkContractors(query, {
        areas: selectedAreas.length > 0 ? selectedAreas : undefined,
        trades: selectedTrades.length > 0 ? selectedTrades : undefined,
      }).then((users) => { setResults(users); setLoading(false); });
    }, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, open, selectedAreas, selectedTrades]);

  function toggleArea(area: string) {
    setSelectedAreas((prev) => prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]);
  }
  function toggleTrade(trade: string) {
    setSelectedTrades((prev) => prev.includes(trade) ? prev.filter((t) => t !== trade) : [...prev, trade]);
  }

  async function handleAdd(user: PlatformUser) {
    setAddingId(user.id);
    const res = await addContractorToTeam(user.id);
    if (res.success) {
      setResults((prev) => prev.filter((u) => u.id !== user.id));
      onAdded(res.name || getUserDisplayName(user));
    }
    setAddingId(null);
  }

  return (
    <DrawerShell open={open} onClose={onClose} title="Browse Network"
      subtitle={`Browse ${tabConfig.label.toLowerCase()} on the platform and add to your team`}>
      <div style={{ padding: "16px 20px 0", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Service Area</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            <FilterPill label="All Areas" selected={selectedAreas.length === 0} color="#06b6d4" onClick={() => setSelectedAreas([])} />
            {SERVICE_AREAS.map((area) => (
              <FilterPill key={area} label={area} selected={selectedAreas.includes(area)} color="#06b6d4" onClick={() => toggleArea(area)} />
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Trade / Service Type</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            <FilterPill label="All Trades" selected={selectedTrades.length === 0} color={tabConfig.accent} onClick={() => setSelectedTrades([])} />
            {TRADE_OPTIONS.map(({ value, label }) => (
              <FilterPill key={value} label={label} selected={selectedTrades.includes(value)} color={tabConfig.accent} onClick={() => toggleTrade(value)} />
            ))}
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, company, email..."
            style={{ ...INPUT_STYLE, padding: "12px 12px 12px 36px" }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 20px" }}>
        {loading ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "#475569", fontSize: 13 }}>Searching...</div>
        ) : results.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "#475569", fontSize: 13, lineHeight: 1.6 }}>
            No matching contractors found on the platform.<br />
            Use <span style={{ color: "#94a3b8", fontWeight: 600 }}>Invite</span> to bring them onboard.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {results.map((user) => {
              const name = getUserDisplayName(user);
              const isAdding = addingId === user.id;
              return (
                <div key={user.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
                  background: "#1e293b", border: "1px solid #334155", borderRadius: 10, transition: "border-color 0.15s",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9999, background: "#334155",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    fontSize: 14, fontWeight: 700, color: "#94a3b8", marginTop: 2,
                  }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.company_name || name}
                    </div>
                    {user.company_name && user.company_name !== name && (
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{name}</div>
                    )}
                    {user.email && (
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                    )}
                    {(user.service_types.length > 0 || user.service_areas.length > 0) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {user.service_types.map((st) => <ServiceTypePill key={st} label={SERVICE_TYPE_LABELS[st] ?? st} color={tabConfig.accent} />)}
                        {user.service_areas.map((area) => <ServiceTypePill key={area} label={area} color="#06b6d4" />)}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => handleAdd(user)} disabled={isAdding}
                    style={{
                      padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, flexShrink: 0,
                      background: isAdding ? "rgba(16,185,129,0.15)" : "transparent",
                      color: "#10b981", border: "1px solid rgba(16,185,129,0.4)",
                      cursor: isAdding ? "not-allowed" : "pointer", opacity: isAdding ? 0.6 : 1,
                      transition: "background 0.15s", marginTop: 2,
                    }}
                    onMouseEnter={(e) => { if (!isAdding) e.currentTarget.style.background = "rgba(16,185,129,0.12)"; }}
                    onMouseLeave={(e) => { if (!isAdding) e.currentTarget.style.background = "transparent"; }}
                  >
                    {isAdding ? "Adding..." : "+ Add"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

// ─── Invite Panel ───────────────────────────────────────────────────

function InvitePanel({
  open, onClose, onInvited,
}: {
  open: boolean; onClose: () => void; onInvited: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) { setEmail(""); setName(""); setMessage(""); setError(""); }
  }, [open]);

  function handleSend() {
    if (!email.trim()) { setError("Email is required."); return; }
    setError("");
    startTransition(async () => {
      try {
        const res = await inviteContractor({ email: email.trim(), name: name.trim() || undefined });
        if (!res.success) throw new Error(res.error);
        const greeting = name.trim() ? `Hi ${name.trim()},` : "Hi,";
        const signupUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "";
        const bodyParts = [greeting, "", "You've been invited to join the Renewable Energy Incentives platform as a contractor.", "", `Create your account here: ${signupUrl}`];
        if (message.trim()) bodyParts.push("", message.trim());
        bodyParts.push("", "Best,", "REI Team");
        const mailtoUrl = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent("You've been invited to join REI's contractor network")}&body=${encodeURIComponent(bodyParts.join("\n"))}`;
        window.open(mailtoUrl, "_blank");
        onInvited(email.trim());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "An error occurred.");
      }
    });
  }

  return (
    <DrawerShell open={open} onClose={onClose} title="Invite Contractor" subtitle="Send an email invite to join the REI platform"
      footer={
        <button type="button" onClick={handleSend} disabled={pending}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 8, fontSize: 14, fontWeight: 700,
            background: pending ? "rgba(16,185,129,0.4)" : "#10b981",
            color: "#fff", border: "none", cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.7 : 1, transition: "background 0.15s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
          onMouseEnter={(e) => { if (!pending) e.currentTarget.style.background = "#059669"; }}
          onMouseLeave={(e) => { if (!pending) e.currentTarget.style.background = "#10b981"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          {pending ? "Sending..." : "Send Invite"}
        </button>
      }
    >
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={LABEL_STYLE}>Email <span style={{ color: "#f87171" }}>*</span></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contractor@email.com" style={INPUT_STYLE} />
        </div>
        <div>
          <label style={LABEL_STYLE}>Name <span style={{ color: "#475569", fontWeight: 500, textTransform: "none" }}>(optional)</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="For the email greeting" style={INPUT_STYLE} />
        </div>
        <div>
          <label style={LABEL_STYLE}>Personal Message <span style={{ color: "#475569", fontWeight: 500, textTransform: "none" }}>(optional)</span></label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
            placeholder="Add a note to include in the invite email"
            style={{ ...INPUT_STYLE, resize: "vertical", minHeight: 72, lineHeight: 1.5 }} />
        </div>
        <div style={{ display: "flex", gap: 10, padding: "14px 14px", borderRadius: 8, background: "rgba(30,41,59,0.5)", border: "1px solid rgba(51,65,85,0.5)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
          </svg>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            The contractor will receive an email with a link to create their account on REI.
            Once they complete onboarding, they&apos;ll automatically appear on your team with their full profile details.
          </div>
        </div>
        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171", fontSize: 12, fontWeight: 600 }}>
            {error}
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

// ─── Confirm Remove Dialog ──────────────────────────────────────────

function ConfirmRemoveDialog({
  open, memberName, actionLabel, onClose, onConfirm, pending,
}: {
  open: boolean; memberName: string; actionLabel: string;
  onClose: () => void; onConfirm: () => void; pending: boolean;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99995, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button type="button" aria-label="Close" onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.60)", border: "none", cursor: "default" }} />
      <div style={{ position: "relative", background: "#0f172a", border: "1px solid #334155", borderRadius: 16, padding: "28px 28px 24px", maxWidth: 380, width: "90%", boxShadow: "0 25px 60px rgba(0,0,0,0.55)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>{actionLabel}</div>
        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, marginBottom: 24 }}>
          Are you sure you want to remove <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{memberName}</span> from your team? This action cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#334155", color: "#f1f5f9", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#475569"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#334155"; }}
          >Cancel</button>
          <button type="button" onClick={onConfirm} disabled={pending}
            style={{ padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: pending ? "rgba(248,113,113,0.3)" : "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.35)", cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.7 : 1 }}>
            {pending ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── REI Team Card ──────────────────────────────────────────────────

function REITeamCard({ member, accent }: { member: REITeamMember; accent: string }) {
  const roleLabel = member.role === "hes_assessor" ? "HES Assessor" : "Home Inspector";
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{member.fullName}</span>
        <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 700, color: accent, background: `${accent}1a`, border: `1px solid ${accent}40` }}>
          {roleLabel}
        </span>
      </div>
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 10 }}>{member.serviceArea}</div>
      <div style={{ height: 1, background: "#334155", marginBottom: 10 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px rgba(16,185,129,0.4)" }} />
        <span style={{ fontSize: 13, color: "#10b981", fontWeight: 500 }}>Available for scheduling</span>
      </div>
    </div>
  );
}

// ─── Add Contractor Menu ────────────────────────────────────────────

function AddContractorMenu({ onBrowse, onInvite }: { onBrowse: () => void; onInvite: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const menuItemStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", textAlign: "left", background: "transparent",
    border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#f1f5f9",
    borderRadius: 6, transition: "background 0.1s",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
          background: "#10b981", color: "#fff", border: "1px solid rgba(16,185,129,0.5)",
          cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#059669"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#10b981"; }}
      >
        + Add Contractor
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "100%", marginTop: 6, width: 200,
          background: "#1e293b", border: "1px solid #334155", borderRadius: 10,
          boxShadow: "0 12px 32px rgba(0,0,0,0.4)", padding: 4, zIndex: 50,
        }}>
          <button type="button" style={menuItemStyle}
            onClick={() => { setOpen(false); onBrowse(); }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(139,92,246,0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              Browse Network
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, fontWeight: 500, marginLeft: 24 }}>Find contractors on REI</div>
          </button>
          <button type="button" style={menuItemStyle}
            onClick={() => { setOpen(false); onInvite(); }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Invite New
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, fontWeight: 500, marginLeft: 24 }}>Send an email invite</div>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Contractor Detail Panel ────────────────────────────────────────

function ContractorDetailPanel({
  open, member, onClose, onUpdated, onRemove, onResendInvite,
}: {
  open: boolean; member: TeamMember | null; onClose: () => void;
  onUpdated: () => void; onRemove: () => void; onResendInvite: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState("active");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open && member) {
      setEditing(false);
      setEditStatus(member.status);
      setEditNotes(member.notes ?? "");
      setEditError("");
    }
  }, [open, member]);

  function handleSave() {
    if (!member) return;
    startTransition(async () => {
      try {
        const res = await updateTeamMember({ id: member.id, status: editStatus, notes: editNotes });
        if (!res.success) throw new Error(res.error);
        onUpdated();
      } catch (e: unknown) {
        setEditError(e instanceof Error ? e.message : "An error occurred.");
      }
    });
  }

  if (!member) return null;
  const isPending = member.status === "pending_invite";
  const displayName = isPending && !member.companyName && member.name === member.email
    ? member.email : member.companyName || member.name;
  const subtitle = member.companyName && member.name && member.name !== member.companyName
    ? member.name : "Contractor";

  const viewFooter = isPending ? (
    <div style={{ display: "flex", gap: 10 }}>
      <button type="button" onClick={onResendInvite}
        style={{ flex: 1, padding: "12px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", cursor: "pointer" }}>
        Resend Invite
      </button>
      <button type="button" onClick={onRemove}
        style={{ flex: 1, padding: "12px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)", cursor: "pointer" }}>
        Cancel Invite
      </button>
    </div>
  ) : (
    <div style={{ display: "flex", gap: 10 }}>
      <button type="button" onClick={() => setEditing(true)}
        style={{ flex: 1, padding: "12px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "#334155", color: "#f1f5f9", border: "none", cursor: "pointer" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#475569"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#334155"; }}
      >Edit</button>
      <button type="button" onClick={onRemove}
        style={{ flex: 1, padding: "12px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)", cursor: "pointer" }}>
        Remove from Team
      </button>
    </div>
  );

  const editFooter = (
    <div style={{ display: "flex", gap: 10 }}>
      <button type="button" onClick={() => { setEditing(false); setEditError(""); }}
        style={{ flex: 1, padding: "12px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#334155", color: "#f1f5f9", border: "none", cursor: "pointer" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#475569"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#334155"; }}
      >Cancel</button>
      <button type="button" onClick={handleSave} disabled={pending}
        style={{
          flex: 1, padding: "12px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
          background: pending ? "rgba(16,185,129,0.4)" : "#10b981",
          color: "#fff", border: "none", cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.7 : 1,
        }}
        onMouseEnter={(e) => { if (!pending) e.currentTarget.style.background = "#059669"; }}
        onMouseLeave={(e) => { if (!pending) e.currentTarget.style.background = "#10b981"; }}
      >{pending ? "Saving..." : "Save Changes"}</button>
    </div>
  );

  return (
    <DrawerShell open={open} onClose={onClose} title={displayName || "Contractor"}
      subtitle={subtitle} footer={editing ? editFooter : viewFooter}>
      {editing ? (
        /* ── Edit Mode ── */
        <div style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={LABEL_STYLE}>Status</label>
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={INPUT_STYLE}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          <div>
            <label style={LABEL_STYLE}>Notes</label>
            <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={4}
              placeholder="Optional notes about this contractor..."
              style={{ ...INPUT_STYLE, resize: "vertical", minHeight: 80, lineHeight: 1.5 }} />
          </div>
          {editError && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171", fontSize: 12, fontWeight: 600 }}>
              {editError}
            </div>
          )}
        </div>
      ) : (
        /* ── View Mode ── */
        <div style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Contact */}
          <div>
            <div style={SECTION_TITLE}>Contact</div>
            {member.email && (
              <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 4 }}>
                <a href={`mailto:${member.email}`} style={{ color: "#cbd5e1", textDecoration: "none" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#10b981"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#cbd5e1"; }}
                >{member.email}</a>
              </div>
            )}
            {member.phone && (
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                <a href={`tel:${member.phone}`} style={{ color: "#94a3b8", textDecoration: "none" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#10b981"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; }}
                >{member.phone}</a>
              </div>
            )}
            {!member.email && !member.phone && (
              <div style={{ fontSize: 13, color: "#475569" }}>{"\u2014"}</div>
            )}
          </div>

          {/* Services */}
          {!isPending && member.serviceTypes.length > 0 && (
            <div>
              <div style={SECTION_TITLE}>Services</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {member.serviceTypes.map((s) => (
                  <ServiceTypePill key={s} label={SERVICE_TYPE_LABELS[s] ?? s} color="#8b5cf6" />
                ))}
              </div>
            </div>
          )}

          {/* Service Areas */}
          {!isPending && member.serviceAreas.length > 0 && (
            <div>
              <div style={SECTION_TITLE}>Service Areas</div>
              <div style={{ fontSize: 13, color: "#cbd5e1" }}>
                {member.serviceAreas.join(", ")}
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <div style={SECTION_TITLE}>Status</div>
            <StatusPill status={member.status} />
          </div>

          {/* Stats */}
          {!isPending && (
            <div>
              <div style={SECTION_TITLE}>Stats</div>
              <div style={{ display: "flex", gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Jobs Routed</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginTop: 2 }}>{member.leadsRouted}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Completed</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#10b981", marginTop: 2 }}>{member.leadsCompleted}</div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {member.notes && (
            <div>
              <div style={SECTION_TITLE}>Notes</div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{member.notes}</div>
            </div>
          )}

          {/* Member since */}
          <div style={{ paddingTop: 8, borderTop: "1px solid #1e293b" }}>
            <div style={{ fontSize: 11, color: "#475569" }}>
              Added {new Date(member.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>
      )}
    </DrawerShell>
  );
}

// ─── Props ──────────────────────────────────────────────────────────

type Props = {
  data: TeamData;
  assessors: REITeamMember[];
  inspectors: REITeamMember[];
};

// ─── Main Component ─────────────────────────────────────────────────

export default function BrokerTeamClient({ data, assessors, inspectors }: Props) {
  const router = useRouter();
  const members = data.members;

  const [activeTab, setActiveTab] = useState<TabKey>("contractor");
  const currentTabConfig = TABS.find((t) => t.key === activeTab)!;

  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  const [browseOpen, setBrowseOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [detailTarget, setDetailTarget] = useState<TeamMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [removePending, startRemoveTransition] = useTransition();

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { setServiceFilter("all"); setStatusFilter("active"); }, [activeTab]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  function handleConfirmRemove() {
    if (!removeTarget) return;
    startRemoveTransition(async () => {
      try {
        await removeTeamMember(removeTarget.id);
        setRemoveTarget(null);
        setDetailTarget(null);
        setToast(removeTarget.status === "pending_invite" ? "Invite cancelled." : "Team member removed.");
        router.refresh();
      } catch { /* silently fail */ }
    });
  }

  function handleResendInvite(m: TeamMember) {
    const greeting = m.name && m.name !== m.email ? `Hi ${m.name},` : "Hi,";
    const signupUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "";
    const body = [greeting, "", "You've been invited to join the Renewable Energy Incentives platform as a contractor.", "", `Create your account here: ${signupUrl}`, "", "Best,", "REI Team"].join("\n");
    const mailtoUrl = `mailto:${encodeURIComponent(m.email || "")}?subject=${encodeURIComponent("You've been invited to join REI's contractor network")}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
    setToast(`Invite resent to ${m.email}`);
  }

  const filtered = members.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (serviceFilter !== "all" && !m.serviceTypes.includes(serviceFilter)) return false;
    return true;
  });

  const totalActive = members.filter((m) => m.status === "active").length;
  const totalPaused = members.filter((m) => m.status === "paused").length;

  return (
    <>
      <div>
        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: 20, right: 20, zIndex: 100000,
            borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600,
            border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.08)", color: "#10b981",
          }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0, letterSpacing: "-0.01em" }}>My Team</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0", fontWeight: 500 }}>Manage your contractors and browse the REI network.</p>
          </div>
          {activeTab === "contractor" && (
            <AddContractorMenu onBrowse={() => setBrowseOpen(true)} onInvite={() => setInviteOpen(true)} />
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #334155", marginBottom: 20 }}>
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            const count = tab.key === "contractor" ? members.length
              : tab.key === "hes_assessor" ? assessors.length : inspectors.length;
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer", background: "transparent", border: "none",
                  borderBottom: isActive ? `2px solid ${tab.accent}` : "2px solid transparent",
                  color: isActive ? tab.accent : "#64748b", transition: "all 0.15s", marginBottom: -1,
                }}
              >
                <TabIcon type={tab.icon} color={isActive ? tab.accent : "#64748b"} />
                {tab.label}
                {count > 0 && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 20, height: 20,
                    borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "0 6px",
                    background: isActive ? `${tab.accent}22` : "rgba(100,116,139,0.15)",
                    color: isActive ? tab.accent : "#64748b",
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Contractors Tab ──────────────────────────────────────── */}
        {activeTab === "contractor" && (
          <>
            {/* KPI Cards */}
            <div className="admin-kpi-grid-3" style={{ marginBottom: 20 }}>
              {[
                { label: "Total", value: members.length, color: "#f1f5f9" },
                { label: "Active", value: totalActive, color: "#10b981" },
                { label: "Paused", value: totalPaused, color: "#fbbf24" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Filter Row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}
                style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer" }}>
                <option value="all">All Services</option>
                {Object.entries(SERVICE_TYPE_LABELS).filter(([k]) => k === k.charAt(0).toUpperCase() + k.slice(1)).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer" }}>
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="pending_invite">Pending Invite</option>
              </select>
              <div style={{ marginLeft: "auto", fontSize: 12, color: "#475569", fontWeight: 600 }}>
                {filtered.length} contractor{filtered.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Table */}
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #334155", background: "rgba(15,23,42,0.5)" }}>
                      {["Name", "Contact", "Services", "Status", ""].map((col, i) => (
                        <th key={col || "chevron"} style={{
                          padding: "11px 16px", textAlign: "left",
                          fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase",
                          letterSpacing: "0.05em", whiteSpace: "nowrap",
                          width: i === 4 ? 40 : undefined,
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "48px 24px", textAlign: "center", color: "#475569", fontSize: 13, fontWeight: 500 }}>
                          {members.length === 0
                            ? "No contractors on your team yet. Click \"+ Add Contractor\" to get started."
                            : "No contractors match the current filters."}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((m, idx) => {
                        const isPending = m.status === "pending_invite";
                        return (
                          <tr key={m.id}
                            onClick={() => setDetailTarget(m)}
                            style={{
                              background: idx % 2 === 0 ? "#0f172a" : "#111827",
                              borderBottom: "1px solid #1e293b",
                              cursor: "pointer", transition: "background 0.1s",
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#1a2744"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? "#0f172a" : "#111827"; }}
                          >
                            {/* Name */}
                            <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                              <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 13 }}>
                                {isPending && !m.companyName && m.name === m.email ? m.email : m.companyName || m.name}
                              </div>
                              {!isPending && m.companyName && m.name && m.name !== m.companyName && (
                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{m.name}</div>
                              )}
                            </td>
                            {/* Contact */}
                            <td style={{ padding: "12px 16px" }}>
                              {m.email && <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>{m.email}</div>}
                              {m.phone && <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{m.phone}</div>}
                              {!m.email && !m.phone && <span style={{ color: "#334155", fontSize: 12 }}>&mdash;</span>}
                            </td>
                            {/* Services */}
                            <td style={{ padding: "12px 16px" }}>
                              {isPending ? (
                                <span style={{ color: "#334155", fontSize: 12 }}>&mdash;</span>
                              ) : (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                  {m.serviceTypes.length === 0 ? (
                                    <span style={{ color: "#334155", fontSize: 12 }}>&mdash;</span>
                                  ) : m.serviceTypes.map((s) => (
                                    <ServiceTypePill key={s} label={SERVICE_TYPE_LABELS[s] ?? s} color={currentTabConfig.accent} />
                                  ))}
                                </div>
                              )}
                            </td>
                            {/* Status */}
                            <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                              <StatusPill status={m.status} />
                            </td>
                            {/* Chevron */}
                            <td style={{ padding: "12px 8px", textAlign: "center" }}>
                              <span style={{ color: "#475569", fontSize: 16 }}>{"\u203A"}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ─── HES Assessors Tab ──────────────────────────────────── */}
        {activeTab === "hes_assessor" && (
          <div>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px", fontWeight: 500 }}>
              REI&apos;s in-house HES assessors available for your projects.
            </p>
            {assessors.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, background: "#1e293b", border: "1px solid #334155", borderRadius: 12 }}>
                <p style={{ color: "#94a3b8", fontSize: 14 }}>No HES assessors available at this time.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {assessors.map((m) => <REITeamCard key={m.id} member={m} accent="#10b981" />)}
              </div>
            )}
          </div>
        )}

        {/* ─── Home Inspectors Tab ────────────────────────────────── */}
        {activeTab === "inspector" && (
          <div>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px", fontWeight: 500 }}>
              REI&apos;s in-house home inspectors available for your projects.
            </p>
            {inspectors.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, background: "#1e293b", border: "1px solid #334155", borderRadius: 12 }}>
                <p style={{ color: "#94a3b8", fontSize: 14 }}>No home inspectors available at this time.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {inspectors.map((m) => <REITeamCard key={m.id} member={m} accent="#f59e0b" />)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Panels & Dialogs */}
      <BrowsePanel
        open={browseOpen} tabConfig={currentTabConfig}
        onClose={() => setBrowseOpen(false)}
        onAdded={(name) => { setToast(`${name} added to your team`); router.refresh(); }}
      />

      <InvitePanel
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(email) => { setInviteOpen(false); setToast(`Invite sent to ${email}`); router.refresh(); }}
      />

      <ContractorDetailPanel
        open={detailTarget !== null}
        member={detailTarget}
        onClose={() => setDetailTarget(null)}
        onUpdated={() => { setDetailTarget(null); setToast("Team member updated."); router.refresh(); }}
        onRemove={() => { setRemoveTarget(detailTarget); }}
        onResendInvite={() => { if (detailTarget) handleResendInvite(detailTarget); }}
      />

      <ConfirmRemoveDialog
        open={removeTarget !== null}
        memberName={removeTarget?.companyName || removeTarget?.name || ""}
        actionLabel={removeTarget?.status === "pending_invite" ? "Cancel Invite" : "Remove Contractor"}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleConfirmRemove}
        pending={removePending}
      />
    </>
  );
}
