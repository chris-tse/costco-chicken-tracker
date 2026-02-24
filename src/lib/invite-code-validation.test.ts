import { describe, expect, it } from "vitest";

import {
  type InviteCodeForValidation,
  validateInviteCode,
} from "./invite-code-validation";

describe("validateInviteCode", () => {
  const mockInviteCodes: InviteCodeForValidation[] = [
    {
      code: "VALID-CODE-123",
      used_by: null,
      revoked_at: null,
    },
    {
      code: "USED-CODE-456",
      used_by: "user-123",
      revoked_at: null,
    },
    {
      code: "REVOKED-CODE-789",
      used_by: null,
      revoked_at: new Date("2024-01-01"),
    },
  ];

  it("should return success for valid code", () => {
    const result = validateInviteCode("VALID-CODE-123", mockInviteCodes);

    expect(result).toEqual({ valid: true, error: null });
  });

  it("should return error for missing code", () => {
    const result = validateInviteCode(undefined, mockInviteCodes);

    expect(result).toEqual({
      valid: false,
      error: "Invite code is required",
    });
  });

  it("should return error for empty string code", () => {
    const result = validateInviteCode("", mockInviteCodes);

    expect(result).toEqual({
      valid: false,
      error: "Invite code is required",
    });
  });

  it("should return error for already-used code", () => {
    const result = validateInviteCode("USED-CODE-456", mockInviteCodes);

    expect(result).toEqual({
      valid: false,
      error: "Invalid or already used invite code",
    });
  });

  it("should return error for revoked code", () => {
    const result = validateInviteCode("REVOKED-CODE-789", mockInviteCodes);

    expect(result).toEqual({
      valid: false,
      error: "Invalid or already used invite code",
    });
  });

  it("should return error for nonexistent code", () => {
    const result = validateInviteCode("NONEXISTENT-CODE", mockInviteCodes);

    expect(result).toEqual({
      valid: false,
      error: "Invalid or already used invite code",
    });
  });

  it("should return error when inviteCodes array is empty", () => {
    const result = validateInviteCode("VALID-CODE-123", []);

    expect(result).toEqual({
      valid: false,
      error: "Invalid or already used invite code",
    });
  });
});
