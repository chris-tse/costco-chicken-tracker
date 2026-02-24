export type ValidationResult =
  | { valid: true; error: null }
  | { valid: false; error: string };

export interface InviteCodeForValidation {
  code: string;
  revoked_at: Date | null;
  used_by: string | null;
}

export function validateInviteCode(
  code: string | undefined | null,
  inviteCodes: InviteCodeForValidation[]
): ValidationResult {
  if (!code || typeof code !== "string") {
    return { valid: false, error: "Invite code is required" };
  }

  const inviteCode = inviteCodes.find((ic) => ic.code === code);

  if (!inviteCode) {
    return { valid: false, error: "Invalid or already used invite code" };
  }

  if (inviteCode.used_by !== null) {
    return { valid: false, error: "Invalid or already used invite code" };
  }

  if (inviteCode.revoked_at !== null) {
    return { valid: false, error: "Invalid or already used invite code" };
  }

  return { valid: true, error: null };
}
