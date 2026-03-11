import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-40 active:scale-95",
  {
    variants: {
      variant: {
        primary:  "bg-[#2563EB] text-white hover:bg-[#1D4ED8] focus-visible:ring-[#2563EB]",
        outline:  "border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F1F5F9] hover:border-[#CBD5E1]",
        ghost:    "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]",
        danger:   "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500",
        success:  "bg-emerald-500 text-white hover:bg-emerald-600 focus-visible:ring-emerald-500",
      },
      size: {
        sm:   "h-8  px-3 text-xs",
        md:   "h-9  px-4",
        lg:   "h-10 px-5",
        icon: "h-8  w-8 p-0",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
