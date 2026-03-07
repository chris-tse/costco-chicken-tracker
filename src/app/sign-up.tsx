import { useState } from "react";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function InviteCodeForm() {
  const [value, setValue] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    navigate({ to: "/sign-up", search: { code: trimmed } });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Invites are required (for now)</CardTitle>
          <CardDescription>
            If you received an invite code, enter it below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-code" className="sr-only">
                Invite Code
              </Label>
              <Input
                id="invite-code"
                type="text"
                placeholder="Enter your invite code"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!value.trim()}>
              {value.trim() ? "CONTINUE" : "CODE REQUIRED"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function SignUpPage() {
  const { code } = Route.useSearch();
  const result = Route.useLoaderData();

  if (!result.valid) {
    return <InviteCodeForm />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-lg font-medium text-foreground">
          Create your account
        </h2>
        <SignUpButton code={code ?? ""} />
      </div>
    </div>
  );
}
