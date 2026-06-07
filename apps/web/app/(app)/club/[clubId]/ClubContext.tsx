"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type ClubContextValue = {
  clubId: string;
  club: any | null;
  roles: string[];
  isAdmin: boolean;
  isCaptain: boolean;
  loading: boolean;
};

const ClubContext = createContext<ClubContextValue | null>(null);

export function useClub(): ClubContextValue {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error("useClub must be used within a ClubProvider");
  return ctx;
}

export function ClubProvider({ clubId, children }: { clubId: string; children: React.ReactNode }) {
  const [club, setClub] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [clubData, myClubs] = await Promise.all([
          apiFetch(`/clubs/${clubId}`),
          apiFetch("/clubs").catch(() => []),
        ]);
        if (cancelled) return;
        setClub(clubData);
        const entry = (myClubs || []).find((c: any) => c.club_id === clubId);
        setRoles(entry?.roles || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const value: ClubContextValue = {
    clubId,
    club,
    roles,
    isAdmin: roles.includes("admin"),
    isCaptain: roles.includes("captain"),
    loading,
  };

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}
