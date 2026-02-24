import { signIn } from "@/lib/auth-client";

function GoogleSignInButton({
  label = "Sign in with Google",
  onClick,
}: Readonly<{
  label?: string;
  onClick?: () => Promise<void> | void;
}>) {
  const handleClick = async () => {
    if (onClick) {
      await onClick();
    }
    await signIn.social({ provider: "google", callbackURL: "/" });
  };

  return (
    <button
      className="rounded-md bg-black px-4 py-2 font-medium text-sm text-white dark:bg-white dark:text-black"
      onClick={handleClick}
      type="button"
    >
      {label}
    </button>
  );
}

export { GoogleSignInButton };
