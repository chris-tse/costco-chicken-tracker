import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { inviteCodes } from "@/lib/db/schema";
import {
  type ValidationResult,
  validateInviteCode,
} from "@/lib/invite-code-validation";

import { SignUpButton } from "./-components/sign-up-button";

const validateInviteCodeServer = createServerFn({ method: "GET" })
  .inputValidator((code: unknown) => {
    if (typeof code !== "string" || !code) {
      throw new Error("Invite code must be a string");
    }
    return code;
  })
  .handler(async ({ data: code }): Promise<ValidationResult> => {
    const inviteCodeRecords = await db
      .select({
        code: inviteCodes.code,
        used_by: inviteCodes.used_by,
        revoked_at: inviteCodes.revoked_at,
      })
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code));

    return validateInviteCode(code, inviteCodeRecords);
  });

export const Route = createFileRoute("/sign-up")({
  validateSearch: (search): { code?: string } => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  loaderDeps: ({ search }) => ({ code: search.code }),
  loader: async ({ deps }): Promise<ValidationResult> => {
    if (!deps.code) {
      return { valid: false, error: "Invite code is required" };
    }
    return await validateInviteCodeServer({ data: deps.code });
  },
  component: SignUpPage,
});

function SignUpPage() {
  const { code } = Route.useSearch();
  const result = Route.useLoaderData();

  if (!result.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600 dark:text-red-400">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUpButton code={code ?? ""} />
    </div>
  );
}
