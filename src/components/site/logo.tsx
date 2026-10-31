import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={cn("size-9", className)}
      fill="none"
    >
      <rect width="40" height="40" rx="11" className="fill-primary" />
      <path
        d="M12.5 12.5h15M12.5 20h10M12.5 27.5h6"
        className="stroke-primary-foreground"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="27.5" cy="27.5" r="6" className="fill-accent" />
      <path
        d="m25 27.5 1.8 1.8 3.4-3.7"
        className="stroke-accent-foreground"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  href = "/",
  className,
  withWordmark = true,
}: {
  href?: string;
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label="FormSaathi home"
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-full",
        className,
      )}
    >
      <LogoMark className="size-9 transition-transform duration-300 ease-out group-hover:-rotate-3" />
      {withWordmark ? (
        <span className="font-display text-[1.3rem] font-semibold tracking-tight text-foreground">
          FormSaathi
        </span>
      ) : null}
    </Link>
  );
}
