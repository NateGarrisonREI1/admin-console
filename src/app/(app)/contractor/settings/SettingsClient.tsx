"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword } from "./actions";

// ─── Design Tokens ──────────────────────────────────────────────────
const BG = "#0f172a";
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

// ─── Reusable Toggle Switch ─────────────────────────────────────────
function ToggleSwitch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        backgroundColor: on ? EMERALD : BORDER,
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        transition: "background-color 0.2s ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          backgroundColor: "#ffffff",
          transition: "left 0.2s ease",
        }}
      />
    </button>
  );
}

// ─── Password Requirement Check ─────────────────────────────────────
interface PwReq {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PwReq[] = [
  { label: "At least 12 characters", test: (pw) => pw.length >= 12 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number", test: (pw) => /\d/.test(pw) },
  {
    label: "One special character",
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
  },
];

function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0 0" }}>
      {PASSWORD_REQUIREMENTS.map((req) => {
        const met = password.length > 0 && req.test(password);
        return (
          <li
            key={req.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: met ? EMERALD : TEXT_DIM,
              marginBottom: 4,
              transition: "color 0.2s ease",
            }}
          >
            <span style={{ fontSize: 14 }}>{met ? "\u2713" : "\u2022"}</span>
            {req.label}
          </li>
        );
      })}
    </ul>
  );
}

// ─── Shared Styles ──────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  backgroundColor: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: 20,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: TEXT,
  margin: 0,
  marginBottom: 14,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  backgroundColor: BG,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  color: TEXT,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: TEXT_MUTED,
  marginBottom: 4,
};

// ─── Main Component ─────────────────────────────────────────────────
export default function SettingsClient() {
  const router = useRouter();

  // Notification preferences (local state only for MVP)
  const [notifications, setNotifications] = useState({
    newLeads: true,
    networkInvitations: true,
    leadReminders: true,
    weeklySummary: false,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Password form state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteText, setDeleteText] = useState("");

  // Support form state
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");

  // ── Password submit handler ───────────────────────────────────────
  const handlePasswordSubmit = async () => {
    setPwError("");
    setPwSuccess("");

    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.");
      return;
    }

    const allMet = PASSWORD_REQUIREMENTS.every((r) => r.test(newPw));
    if (!allMet) {
      setPwError("Please meet all password requirements.");
      return;
    }

    setPwSaving(true);
    try {
      await changePassword(currentPw, newPw);
      setPwSuccess("Password updated successfully");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setShowPasswordForm(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update password.";
      setPwError(message);
    } finally {
      setPwSaving(false);
    }
  };

  // ── Support mailto handler ────────────────────────────────────────
  const handleSendSupport = () => {
    const email = "support@renewableenergyincentives.com";
    const subject = encodeURIComponent(supportSubject);
    const body = encodeURIComponent(supportMessage);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_self");
  };

  // ── Delete account handlers ───────────────────────────────────────
  const openDeleteConfirm = () => {
    setShowDeleteConfirm(true);
    setDeleteStep(1);
    setDeleteText("");
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeleteStep(1);
    setDeleteText("");
  };

  const handleDeleteStep1Confirm = () => {
    setDeleteStep(2);
  };

  const handleDeleteStep2Confirm = () => {
    if (deleteText === "DELETE") {
      // MVP: no actual deletion backend
      closeDeleteConfirm();
    }
  };

  // ── Notification preference rows ──────────────────────────────────
  const notificationRows: { key: keyof typeof notifications; label: string }[] =
    [
      { key: "newLeads", label: "New leads in my area" },
      { key: "networkInvitations", label: "Network invitations" },
      { key: "leadReminders", label: "Lead status reminders" },
      { key: "weeklySummary", label: "Weekly summary email" },
    ];

  return (
    <div
      style={{
        padding: 28,
        maxWidth: 800,
        margin: "0 auto",
        backgroundColor: BG,
        minHeight: "100vh",
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: TEXT,
          margin: "0 0 24px 0",
        }}
      >
        Settings
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* ── 1. Notification Preferences ─────────────────────────────── */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Notifications</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notificationRows.map((row) => (
              <div
                key={row.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 13, color: TEXT_SEC }}>
                  {row.label}
                </span>
                <ToggleSwitch
                  on={notifications[row.key]}
                  onChange={() => toggleNotification(row.key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. Password ─────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Password</h2>

          {pwSuccess && !showPasswordForm && (
            <p
              style={{
                color: EMERALD,
                fontSize: 13,
                margin: "0 0 12px 0",
              }}
            >
              {pwSuccess}
            </p>
          )}

          {!showPasswordForm ? (
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm(true);
                setPwSuccess("");
                setPwError("");
              }}
              style={{
                padding: "8px 16px",
                backgroundColor: "transparent",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                color: TEXT_SEC,
                fontSize: 13,
                cursor: "pointer",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "rgba(51,65,85,0.5)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              Change Password
            </button>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxWidth: 400,
              }}
            >
              <div>
                <label style={labelStyle}>Current password</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  style={inputStyle}
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label style={labelStyle}>New password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  style={inputStyle}
                  autoComplete="new-password"
                />
                <PasswordRequirements password={newPw} />
              </div>

              <div>
                <label style={labelStyle}>Confirm new password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  style={inputStyle}
                  autoComplete="new-password"
                />
                {confirmPw.length > 0 && confirmPw !== newPw && (
                  <p
                    style={{
                      color: "#ef4444",
                      fontSize: 12,
                      margin: "4px 0 0 0",
                    }}
                  >
                    Passwords do not match
                  </p>
                )}
              </div>

              {pwError && (
                <p
                  style={{
                    color: "#ef4444",
                    fontSize: 13,
                    margin: 0,
                  }}
                >
                  {pwError}
                </p>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  disabled={pwSaving}
                  onClick={handlePasswordSubmit}
                  style={{
                    padding: "8px 18px",
                    backgroundColor: EMERALD,
                    border: "none",
                    borderRadius: 8,
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: pwSaving ? "not-allowed" : "pointer",
                    opacity: pwSaving ? 0.6 : 1,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  {pwSaving ? "Updating..." : "Update Password"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPw("");
                    setNewPw("");
                    setConfirmPw("");
                    setPwError("");
                  }}
                  style={{
                    padding: "8px 18px",
                    backgroundColor: "transparent",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    color: TEXT_SEC,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "rgba(51,65,85,0.5)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. Support ──────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Support</h2>
          <p style={{ fontSize: 13, color: TEXT_SEC, margin: "0 0 14px 0" }}>
            Contact REI Support:{" "}
            <a
              href="mailto:support@renewableenergyincentives.com"
              style={{ color: EMERALD, textDecoration: "none" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.textDecoration = "underline")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.textDecoration = "none")
              }
            >
              support@renewableenergyincentives.com
            </a>
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxWidth: 400,
            }}
          >
            <div>
              <label style={labelStyle}>Subject</label>
              <input
                type="text"
                value={supportSubject}
                onChange={(e) => setSupportSubject(e.target.value)}
                style={inputStyle}
                placeholder="How can we help?"
              />
            </div>
            <div>
              <label style={labelStyle}>Message</label>
              <textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                rows={4}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
                placeholder="Describe your issue or question..."
              />
            </div>
            <div>
              <button
                type="button"
                onClick={handleSendSupport}
                style={{
                  padding: "8px 18px",
                  backgroundColor: "transparent",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  color: TEXT_SEC,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(51,65,85,0.5)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* ── 4. Legal ────────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Legal</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a
              href="#"
              style={{
                fontSize: 13,
                color: TEXT_SEC,
                textDecoration: "none",
                transition: "text-decoration 0.15s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.textDecoration = "underline")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.textDecoration = "none")
              }
            >
              Terms of Service
            </a>
            <a
              href="#"
              style={{
                fontSize: 13,
                color: TEXT_SEC,
                textDecoration: "none",
                transition: "text-decoration 0.15s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.textDecoration = "underline")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.textDecoration = "none")
              }
            >
              Privacy Policy
            </a>
          </div>
        </div>

        {/* ── 5. Danger Zone ──────────────────────────────────────────── */}
        <div
          style={{
            ...cardStyle,
            borderColor: "rgba(239,68,68,0.3)",
          }}
        >
          <h2
            style={{
              ...cardTitleStyle,
              color: "#ef4444",
            }}
          >
            Danger Zone
          </h2>
          <button
            type="button"
            onClick={openDeleteConfirm}
            style={{
              padding: "8px 18px",
              backgroundColor: "transparent",
              border: "1px solid #ef4444",
              borderRadius: 8,
              color: "#ef4444",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                "rgba(239,68,68,0.1)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeDeleteConfirm}
        >
          <div
            style={{
              backgroundColor: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: 24,
              maxWidth: 420,
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {deleteStep === 1 ? (
              <>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: TEXT,
                    margin: "0 0 10px 0",
                  }}
                >
                  Are you sure?
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: TEXT_SEC,
                    margin: "0 0 20px 0",
                    lineHeight: 1.5,
                  }}
                >
                  This action is permanent and cannot be undone. Your account
                  and all associated data will be permanently deleted.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={closeDeleteConfirm}
                    style={{
                      padding: "8px 18px",
                      backgroundColor: "transparent",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 8,
                      color: TEXT_SEC,
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "rgba(51,65,85,0.5)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteStep1Confirm}
                    style={{
                      padding: "8px 18px",
                      backgroundColor: "transparent",
                      border: "1px solid #ef4444",
                      borderRadius: 8,
                      color: "#ef4444",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "rgba(239,68,68,0.1)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    Yes, delete my account
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: TEXT,
                    margin: "0 0 10px 0",
                  }}
                >
                  Final confirmation
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: TEXT_SEC,
                    margin: "0 0 14px 0",
                    lineHeight: 1.5,
                  }}
                >
                  Type <strong style={{ color: TEXT }}>DELETE</strong> below to
                  confirm account deletion.
                </p>
                <input
                  type="text"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  style={{
                    ...inputStyle,
                    marginBottom: 16,
                  }}
                />
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={closeDeleteConfirm}
                    style={{
                      padding: "8px 18px",
                      backgroundColor: "transparent",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 8,
                      color: TEXT_SEC,
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "rgba(51,65,85,0.5)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteText !== "DELETE"}
                    onClick={handleDeleteStep2Confirm}
                    style={{
                      padding: "8px 18px",
                      backgroundColor:
                        deleteText === "DELETE"
                          ? "#ef4444"
                          : "transparent",
                      border: "1px solid #ef4444",
                      borderRadius: 8,
                      color:
                        deleteText === "DELETE" ? "#ffffff" : "#ef4444",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor:
                        deleteText === "DELETE"
                          ? "pointer"
                          : "not-allowed",
                      opacity: deleteText === "DELETE" ? 1 : 0.5,
                      transition:
                        "background-color 0.15s ease, opacity 0.15s ease",
                    }}
                  >
                    Permanently Delete Account
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
