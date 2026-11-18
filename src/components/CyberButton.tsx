"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

interface CyberButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const CyberButton = forwardRef<HTMLButtonElement, CyberButtonProps>(
  function CyberButton(
    {
      children,
      variant = "primary",
      size = "md",
      className = "",
      ...props
    },
    ref
  ) {
  const base =
    "relative overflow-hidden font-mono font-semibold uppercase tracking-wider transition-all duration-300 " +
    "hover:shadow-[0_0_20px_var(--glow-color)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed " +
    "group";

  const variants = {
    primary:
      "bg-[#00d4ff]/10 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/20 hover:border-[#00d4ff] " +
      "[--glow-color:rgba(0,212,255,0.3)]",
    secondary:
      "bg-[#ff00ff]/10 border border-[#ff00ff]/40 text-[#ff00ff] hover:bg-[#ff00ff]/20 hover:border-[#ff00ff] " +
      "[--glow-color:rgba(255,0,255,0.3)]",
    ghost:
      "bg-transparent border border-transparent text-[#e0e0f0] hover:bg-white/5 hover:border-white/10 " +
      "[--glow-color:rgba(255,255,255,0.1)]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base",
  };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">{children}</span>
        <span
          className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.06), transparent)",
          }}
        />
      </button>
    );
  }
);
