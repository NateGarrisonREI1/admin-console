// src/app/admin/settings/_components/UserRelationshipDiagram.tsx
"use client";

import * as React from "react";
import type { UserRelationshipDetail } from "../_actions/users";
import type { AppRole } from "./pills";
import { ROLE_STYLES } from "./pills";

// ─── Design tokens ──────────────────────────────────────────────────
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const EMERALD = "#10b981";
const TEXT_MUTED = "#94a3b8";

const REL_LABELS: Record<string, string> = {
  invited_by: "Invited by",
  in_broker_network: "In network",
  broker_for: "Broker for",
  manages: "Manages",
};

function initials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

function roleColor(role: AppRole | null): string {
  if (!role) return TEXT_DIM;
  return ROLE_STYLES[role]?.tx || TEXT_DIM;
}

type Props = {
  userId: string;
  userName: string | null;
  userEmail: string;
  userRole: AppRole;
  relationships: UserRelationshipDetail[];
};

export default function UserRelationshipDiagram({ userId, userName, userEmail, userRole, relationships }: Props) {
  if (relationships.length === 0) {
    return (
      <div style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24,
        textAlign: "center", color: TEXT_DIM, fontSize: 13, fontWeight: 500,
      }}>
        No relationships found for this user.
      </div>
    );
  }

  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
    }}>
      {/* Center node (this user) */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: `${ROLE_STYLES[userRole]?.bg || "rgba(148,163,184,0.12)"}`,
          border: `2px solid ${roleColor(userRole)}`,
          display: "grid", placeItems: "center",
          fontSize: 16, fontWeight: 800, color: roleColor(userRole),
        }}>
          {initials(userName, userEmail)}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>
            {userName || userEmail}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: roleColor(userRole), textTransform: "capitalize" }}>
            {userRole.replace("_", " ")}
          </div>
        </div>
      </div>

      {/* Connection lines + related nodes */}
      <div style={{
        marginTop: 16, width: "100%",
        display: "flex", flexDirection: "column", gap: 0, alignItems: "center",
      }}>
        {relationships.map((rel) => {
          const otherId = rel.user_id === userId ? rel.related_user_id : rel.user_id;
          const isOutbound = rel.user_id === userId;
          const label = REL_LABELS[rel.relationship_type] || rel.relationship_type;

          return (
            <div key={rel.id} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
              width: "100%",
            }}>
              {/* Vertical connector line */}
              <div style={{
                width: 2, height: 20,
                background: `linear-gradient(to bottom, ${roleColor(userRole)}44, ${roleColor(rel.related_role)}44)`,
              }} />

              {/* Relationship label */}
              <div style={{
                padding: "3px 10px", borderRadius: 6,
                background: "rgba(148,163,184,0.06)",
                border: `1px solid ${BORDER}`,
                fontSize: 10, fontWeight: 700, color: TEXT_MUTED,
                textTransform: "uppercase", letterSpacing: "0.04em",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <span style={{ fontSize: 10, color: TEXT_DIM }}>{isOutbound ? "\u2193" : "\u2191"}</span>
                {label}
              </div>

              {/* Vertical connector line */}
              <div style={{
                width: 2, height: 20,
                background: `linear-gradient(to bottom, ${roleColor(rel.related_role)}44, ${roleColor(rel.related_role)}88)`,
              }} />

              {/* Related node */}
              <a
                href={`/admin/settings/users/${otherId}`}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 14px",
                  borderRadius: 10, border: `1px solid ${BORDER}`,
                  background: "rgba(15,23,42,0.5)", textDecoration: "none",
                  transition: "all 0.15s ease", cursor: "pointer", width: "100%", maxWidth: 280,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = roleColor(rel.related_role) || BORDER; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: `${ROLE_STYLES[rel.related_role || "homeowner"]?.bg || "rgba(148,163,184,0.12)"}`,
                  border: `1.5px solid ${roleColor(rel.related_role)}`,
                  display: "grid", placeItems: "center",
                  fontSize: 12, fontWeight: 800, color: roleColor(rel.related_role),
                }}>
                  {initials(rel.related_name, rel.related_email)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {rel.related_name || rel.related_email || otherId.slice(0, 8)}
                  </div>
                  {rel.related_email && rel.related_name && (
                    <div style={{ fontSize: 11, color: TEXT_DIM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {rel.related_email}
                    </div>
                  )}
                  {rel.related_role && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: roleColor(rel.related_role), textTransform: "capitalize", marginTop: 1 }}>
                      {rel.related_role.replace("_", " ")}
                    </div>
                  )}
                </div>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
