import type { ReactNode } from "react";

export function GlitchText({
  children,
  className = "",
  as: Tag = "span",
}: {
  children: ReactNode;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "p" | "div";
}) {
  return (
    <Tag
      className={`relative inline-block group ${className}`}
      data-text={typeof children === "string" ? children : undefined}
    >
      {children}
      <span
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-80 transition-opacity duration-75"
        style={{
          color: "#ff00ff",
          clipPath: "inset(0 0 40% 0)",
          transform: "translate(-2px, 0)",
          textShadow: "none",
        }}
        aria-hidden
      >
        {children}
      </span>
      <span
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-80 transition-opacity duration-75"
        style={{
          color: "#00d4ff",
          clipPath: "inset(60% 0 0 0)",
          transform: "translate(2px, 0)",
          textShadow: "none",
        }}
        aria-hidden
      >
        {children}
      </span>
    </Tag>
  );
}
