import type { CSSProperties } from "react";

interface BrandLogoProps {
  size?: number;
  className?: string;
  title?: string;
}

export function BrandLogo({ size = 40, className = "", title = "ConDM" }: BrandLogoProps) {
  const style: CSSProperties = { width: size, height: size };

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={style}
      title={title}
      aria-label={title}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%", color: "var(--brand-primary)" }}
      >
        <circle cx="60" cy="60" r="51.5" stroke="currentColor" strokeWidth="7" />
        <path
          fill="currentColor"
          d="M 77.3 50 L 92.5 50 A 34 34 0 1 0 92.5 70 L 77.3 70 A 20 20 0 1 1 77.3 50 Z"
        />
      </svg>
    </div>
  );
}
