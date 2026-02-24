import { createFileRoute } from "@tanstack/react-router";

import { GoogleSignInButton } from "./-components/google-sign-in-button";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <GoogleSignInButton />
    </div>
  );
}
