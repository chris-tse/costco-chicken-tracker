import { createServerFn } from "@tanstack/react-start";

import { GoogleSignInButton } from "./google-sign-in-button";

const setInviteCodeCookie = createServerFn({ method: "POST" })
  .inputValidator((code: unknown) => {
    if (typeof code !== "string" || !code) {
      throw new Error("Invite code must be a string");
    }
    return code;
  })
  .handler(async ({ data: code }) => {
    const { getResponseHeader, setResponseHeader } = await import(
      "@tanstack/react-start/server"
    );

    const existing = getResponseHeader("Set-Cookie") ?? "";
    const cookies = Array.isArray(existing) ? existing : [existing];
    cookies.push(
      `invite_code=${encodeURIComponent(code)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300`
    );
    setResponseHeader("Set-Cookie", cookies.filter(Boolean).join(", "));
  });

function SignUpButton({ code }: Readonly<{ code: string }>) {
  return (
    <GoogleSignInButton
      label="Sign up with Google"
      onClick={() => setInviteCodeCookie({ data: code })}
    />
  );
}

export { SignUpButton };
