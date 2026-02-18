// src/lib/auth/password.ts
// Password strength validation utility.

export type PasswordCheck = {
  valid: boolean;
  errors: string[];
};

const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123", "monkey", "master",
  "dragon", "111111", "baseball", "iloveyou", "trustno1", "sunshine",
  "letmein", "football", "shadow", "michael", "password1", "password123",
  "welcome", "login", "admin", "princess", "starwars", "passw0rd",
  "1234567890", "000000", "access", "flower", "hottie", "loveme",
  "zaq1zaq1", "hello", "charlie", "donald", "qwerty123", "solo",
]);

/**
 * Validate password strength.
 * Requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not a common password
 * - Cannot contain the user's email (if provided)
 */
export function validatePassword(password: string, email?: string): PasswordCheck {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push("Must be at least 12 characters");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Must include an uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Must include a lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Must include a number");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Must include a special character (!@#$%^&*)");
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push("This password is too common");
  }

  if (email) {
    const emailPrefix = email.split("@")[0]?.toLowerCase();
    if (emailPrefix && emailPrefix.length > 2 && password.toLowerCase().includes(emailPrefix)) {
      errors.push("Cannot contain your email address");
    }
  }

  return { valid: errors.length === 0, errors };
}
