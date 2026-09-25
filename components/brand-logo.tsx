import Image from "next/image";
import wordmark from "@/public/brand-logo/lessonleaf-wordmark.webp";
import mark from "@/public/brand-logo/lessonleaf-mark.webp";
import { cn } from "@/lib/utils";

export function BrandLogo({ variant = "wordmark", decorative = false, className }: {
  variant?: "wordmark" | "mark";
  decorative?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={variant === "mark" ? mark : wordmark}
      alt={decorative ? "" : "Lessonleaf"}
      className={cn("brand-logo", `brand-logo-${variant}`, className)}
      sizes={variant === "mark" ? "(max-width: 760px) 80px, 180px" : "200px"}
      loading={variant === "wordmark" ? "eager" : "lazy"}
    />
  );
}
