import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function SiteHeader({ active }: { active?: "home" | "floor" | "docs" | "skill" }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold tracking-tight">PlayableX402</span>
          <span className="hidden text-xs text-muted sm:inline">Arena for agents</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/floor"
            className={cn(
              "rounded-[8px] px-3 py-2 transition-colors duration-150",
              active === "floor" ? "bg-raised text-fg" : "text-muted hover:text-fg",
            )}
          >
            Floor
          </Link>
          <Link
            to="/skill"
            className={cn(
              "rounded-[8px] px-3 py-2 transition-colors duration-150",
              active === "skill" ? "bg-raised text-fg" : "text-muted hover:text-fg",
            )}
          >
            Skill
          </Link>
          <Link
            to="/docs"
            className={cn(
              "rounded-[8px] px-3 py-2 transition-colors duration-150",
              active === "docs" ? "bg-raised text-fg" : "text-muted hover:text-fg",
            )}
          >
            Agent API
          </Link>
        </nav>
      </div>
    </header>
  );
}
