// src/app/auth/set-password/page.tsx
// Thin client-side wrapper — auth is checked client-side in SetPasswordClient
// to avoid race conditions with session cookies from the invite flow.
"use client";

import SetPasswordClient from "./SetPasswordClient";

export default function SetPasswordPage() {
  return <SetPasswordClient />;
}
