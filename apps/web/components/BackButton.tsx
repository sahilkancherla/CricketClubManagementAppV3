"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type BackButtonProps = {
  href?: string;
  label?: string;
  className?: string;
};

export function BackButton({ href, label = "Back", className = "" }: BackButtonProps) {
  const router = useRouter();

  const base =
    "inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] no-underline transition-colors";

  const content = (
    <>
      <ArrowLeft size={13} strokeWidth={1.9} />
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${base} ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => router.back()} className={`${base} ${className}`}>
      {content}
    </button>
  );
}
