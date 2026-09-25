import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type AlertProps = ComponentProps<"div"> & { variant?: "default" | "destructive" };

export function Alert({ className, variant = "default", ...props }: AlertProps) {
  return <div
    data-slot="alert"
    role="alert"
    className={cn("flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm", variant === "destructive" ? "border-[#ecc9c1] bg-[#fff3ef] text-[#934736]" : "border-[#cfe3d6] bg-[#f2faf4] text-[#2d6c55]", className)}
    {...props}
  />;
}

export function AlertTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 data-slot="alert-title" className={cn("m-0 text-sm font-bold leading-5", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="alert-description" className={cn("m-0 text-xs leading-5", className)} {...props} />;
}
