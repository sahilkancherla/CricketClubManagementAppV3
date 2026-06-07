"use client";

import { use } from "react";
import { ClubProvider } from "./ClubContext";
import { ClubSidebar } from "./ClubSidebar";

export default function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = use(params);

  return (
    <ClubProvider clubId={clubId}>
      <div className="flex gap-8 lg:gap-10">
        <ClubSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ClubProvider>
  );
}
