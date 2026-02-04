import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatusBadgeProps {
  label: string;
  variant?: "red" | "white" | "gray";
  className?: string;
  pulse?: boolean;
}

export function StatusBadge({ 
  label, 
  variant = "red", 
  className,
  pulse = false 
}: StatusBadgeProps) {
  const variants = {
    red: "bg-v-red text-white shadow-v-red/50",
    white: "bg-v-white/10 text-v-white border border-white/10",
    gray: "bg-v-gray text-v-white/50 border border-white/5",
  };

  return (
    <div className={cn("animate-bounce-subtle", className)}>
      <div className={cn(
        "text-[10px] font-black uppercase px-3 py-1 tracking-[0.3em] -skew-x-12 shadow-lg transition-all",
        variants[variant],
        pulse && "animate-pulse"
      )}>
        {label}
      </div>
    </div>
  );
}
