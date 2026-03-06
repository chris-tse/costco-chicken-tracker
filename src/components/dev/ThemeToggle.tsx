import { Button } from "@/components/ui/button";

const THEMES = ["a", "b"] as const;

export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const current = root.dataset.theme ?? "a";
    const next = current === "a" ? "b" : "a";
    root.dataset.theme = next;
  };

  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed right-3 bottom-3 z-50">
      <Button variant="outline" size="sm" onClick={toggle}>
        Swap Theme
      </Button>
    </div>
  );
}
