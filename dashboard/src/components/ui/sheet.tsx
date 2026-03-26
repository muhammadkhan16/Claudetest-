"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* Root */
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

/* Overlay */
const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]",
      "data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

/* Content */
interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  width?: number;
}

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, children, width = 520, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      style={{ width: `min(${width}px, 95vw)` }}
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex flex-col",
        "bg-white border-l border-[#E2E8F0] shadow-xl shadow-black/10",
        "data-[state=open]:animate-sheet-in",
        "data-[state=closed]:animate-sheet-out",
        "focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

/* Header */
function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-start justify-between px-6 py-5 border-b border-[#E2E8F0] shrink-0",
        className
      )}
      {...props}
    />
  );
}

/* Title */
const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base font-semibold text-[#0F172A] leading-tight", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

/* Description */
const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-[#94A3B8] mt-0.5", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

/* Close button */
function SheetCloseButton({ className }: { className?: string }) {
  return (
    <SheetClose
      className={cn(
        "ml-auto p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A]",
        "hover:bg-[#F1F5F9] transition-colors focus:outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#E2E8F0]",
        className
      )}
    >
      <X size={18} />
      <span className="sr-only">Close</span>
    </SheetClose>
  );
}

/* Body */
function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto px-6 py-5 space-y-6", className)}
      {...props}
    />
  );
}

/* Footer */
function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-6 py-4 border-t border-[#E2E8F0] shrink-0 bg-[#F8FAFC]",
        className
      )}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetCloseButton,
  SheetBody,
  SheetFooter,
};
