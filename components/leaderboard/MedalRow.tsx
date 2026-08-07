import { Crown } from "lucide-react";

/**
 * Medal colors for the top three ranks. These are literal hex values rather
 * than brand tokens on purpose — gold/silver/bronze aren't part of the
 * palette and shouldn't be, since they carry fixed real-world meaning.
 */
export const MEDAL_STYLES: Record<number, { color: string; tint: string }> = {
  1: { color: "#D4AF37", tint: "#FBF6E3" },
  2: { color: "#A8A9AD", tint: "#F2F2F3" },
  3: { color: "#CD7F32", tint: "#F7EDE2" },
};

export function getMedalStyle(rank: number): { color: string; tint: string } | null {
  return MEDAL_STYLES[rank] ?? null;
}

/** Crown in the matching medal color — renders nothing below rank 3. */
export function MedalCrown({ rank, size = 18 }: { rank: number; size?: number }) {
  const medal = getMedalStyle(rank);
  if (!medal) return null;
  return <Crown size={size} style={{ color: medal.color }} aria-label={`المركز ${rank}`} className="shrink-0" />;
}

interface MedalRowProps {
  rank: number;
  children: React.ReactNode;
  /** Styling for ranks 4+ — each leaderboard keeps its own look (the dashboard is light, the portal is dark). */
  fallbackClassName?: string;
  className?: string;
}

/**
 * Wraps a leaderboard row, framing the top three in their medal color over a
 * light tint. Ranks 4+ fall through to whatever the calling list normally
 * uses, so this can sit in both the light dashboard card and the dark portal
 * leaderboard without either theme fighting it.
 */
export function MedalRow({ rank, children, fallbackClassName = "", className = "" }: MedalRowProps) {
  const medal = getMedalStyle(rank);

  if (!medal) {
    return <div className={`${fallbackClassName} ${className}`}>{children}</div>;
  }

  return (
    <div
      className={`rounded-xl border-2 ${className}`}
      style={{ borderColor: medal.color, backgroundColor: medal.tint }}
    >
      {children}
    </div>
  );
}
