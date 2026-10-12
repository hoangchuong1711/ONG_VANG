import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const variants = {
    primary:
      "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-stone-900 shadow-sm hover:shadow",
    secondary:
      "bg-stone-900 hover:bg-stone-800 active:bg-black text-white shadow-sm",
    outline:
      "bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-800 border border-stone-200 shadow-2xs",
    danger:
      "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm",
    ghost:
      "bg-transparent hover:bg-stone-100 text-stone-600 hover:text-stone-900",
  };

  const sizes = {
    sm: "h-9 px-3.5 text-xs gap-1.5",
    md: "h-11 px-4.5 text-sm gap-2",
    lg: "h-12 sm:h-13 px-6 text-base gap-2.5", // Chuẩn chạm di động 48px+
  };

  const width = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${width} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
