import { useId } from "react";
import { cn } from "@/lib/utils";
import { LOGO_COLORS, LOGO_PIECES, LOGO_VIEWBOX } from "./logo-shapes";

/**
 * Vector LuminaFlix logo — sharp at any size / pixel density.
 *
 * `animated`: each stroke is drawn (stroke-dash), then filled, then the cyan
 * pieces pulse with a neon glow. CSS-only (keyframes in globals.css), works in
 * server components and before JavaScript loads; disabled with reduced motion.
 */
export default function AnimatedLogo({
  size = 96,
  animated = true,
  background = false,
  className,
  title = "LuminaFlix",
}: {
  size?: number;
  animated?: boolean;
  /** Draw the dark rounded-square app-icon background. */
  background?: boolean;
  className?: string;
  title?: string;
}) {
  const glowId = `lf-glow-${useId().replace(/:/g, "")}`;

  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={cn(animated && "lf-logo-animated", className)}
    >
      <defs>
        <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {background && <rect width="384" height="384" rx="86" fill={LOGO_COLORS.background} />}
      {LOGO_PIECES.map((piece, index) => {
        const color = LOGO_COLORS[piece.color];
        return (
          <polygon
            key={piece.points}
            points={piece.points}
            pathLength={1}
            fill={color}
            stroke={color}
            strokeWidth={3}
            strokeLinejoin="round"
            filter={piece.color === "cyan" ? `url(#${glowId})` : undefined}
            className={cn("lf-logo-piece", piece.color === "cyan" && "lf-logo-cyan")}
            style={{ "--lf-delay": `${index * 140}ms` } as React.CSSProperties}
          />
        );
      })}
    </svg>
  );
}
