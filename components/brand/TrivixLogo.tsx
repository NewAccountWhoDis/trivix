import { cn } from "@/lib/utils/cn";

type TrivixLogoProps = {
  ariaHidden?: boolean;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "hero";
};

const sizeClasses = {
  sm: {
    root: "gap-2",
    mark: "h-8 w-8",
    wordmark: "text-lg tracking-[3px]",
  },
  md: {
    root: "gap-2.5",
    mark: "h-10 w-10",
    wordmark: "text-2xl tracking-[4px]",
  },
  hero: {
    root: "gap-4 flex-col",
    mark: "h-24 w-24 md:h-32 md:w-32",
    wordmark: "text-7xl md:text-9xl tracking-[8px]",
  },
} as const;

export function TrivixLogo({
  ariaHidden,
  className,
  markClassName,
  wordmarkClassName,
  showWordmark = true,
  size = "md",
}: TrivixLogoProps) {
  const classes = sizeClasses[size];

  return (
    <span
      aria-hidden={ariaHidden || undefined}
      className={cn(
        "inline-flex items-center text-text-primary",
        classes.root,
        className,
      )}
    >
      <TrivixMark className={cn(classes.mark, markClassName)} />
      {showWordmark && (
        <span
          className={cn(
            "font-display leading-none uppercase",
            classes.wordmark,
            wordmarkClassName,
          )}
        >
          Trivix
        </span>
      )}
    </span>
  );
}

export function TrivixMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      role="img"
      aria-label="Trivix mark"
      className={cn("shrink-0 overflow-visible", className)}
      fill="none"
    >
      <defs>
        <filter
          id="trivix-red-glow"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M48 7 84.5 27.5v41L48 89 11.5 68.5v-41L48 7Z"
        fill="#0d0e12"
        stroke="#2a2d36"
        strokeWidth="3"
      />
      <path
        d="M48 15 77.5 31.5v33L48 81 18.5 64.5v-33L48 15Z"
        stroke="#ff1f3a"
        strokeOpacity="0.42"
        strokeWidth="2"
      />
      <path
        d="M30 30h14v14H30V30Z"
        fill="#ff2e3e"
        filter="url(#trivix-red-glow)"
      />
      <path d="M52 30h14v14H52V30Z" fill="#1ea7ff" />
      <path d="M30 52h14v14H30V52Z" fill="#ffd400" />
      <path d="M52 52h14v14H52V52Z" fill="#1fd66a" />
      <path
        d="m31 68 37-40M29 28l39 40"
        stroke="#ffffff"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <path
        d="m33.5 65.5 32-35M32 30.5l32.5 35"
        stroke="#050608"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
      <circle
        cx="48"
        cy="48"
        r="7"
        fill="#ff1f3a"
        stroke="#ffffff"
        strokeWidth="2"
        filter="url(#trivix-red-glow)"
      />
    </svg>
  );
}
