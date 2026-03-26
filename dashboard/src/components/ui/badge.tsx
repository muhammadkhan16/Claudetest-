import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:  "bg-[#F1F5F9] text-[#64748B]",
        success:  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        warning:  "bg-amber-50  text-amber-700  ring-1 ring-amber-200",
        danger:   "bg-red-50    text-red-700    ring-1 ring-red-200",
        orange:   "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
        outline:  "border border-[#E2E8F0] text-[#64748B] bg-transparent",
        info:     "bg-blue-50   text-blue-700   ring-1 ring-blue-200",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
