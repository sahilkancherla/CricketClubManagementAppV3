import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from './api';

export type ClubMembership = {
  club_id: string;
  club: { id: string; name: string; logo_url: string | null };
  roles: string[];
  status: string;
};

type ClubContextValue = {
  clubs: ClubMembership[];
  activeClub: ClubMembership | null;
  setActiveClubId: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
  isAdmin: boolean;
  isCaptain: boolean;
};

const ClubContext = createContext<ClubContextValue>({
  clubs: [],
  activeClub: null,
  setActiveClubId: () => {},
  loading: true,
  refresh: async () => {},
  isAdmin: false,
  isCaptain: false,
});

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const [clubs, setClubs] = useState<ClubMembership[]>([]);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch('/clubs');
      const list: ClubMembership[] = (data || []).filter(
        (c: any) => c.club && c.status === 'active',
      );
      setClubs(list);

      // Auto-select first club if none selected or current is gone
      if (list.length > 0) {
        const current = list.find((c) => c.club_id === activeClubId);
        if (!current) setActiveClubId(list[0].club_id);
      } else {
        setActiveClubId(null);
      }
    } catch (err) {
      console.error('Failed to load clubs:', err);
    } finally {
      setLoading(false);
    }
  }, [activeClubId]);

  useEffect(() => {
    refresh();
  }, []);

  const activeClub = clubs.find((c) => c.club_id === activeClubId) || null;
  const roles = activeClub?.roles || [];

  return (
    <ClubContext.Provider
      value={{
        clubs,
        activeClub,
        setActiveClubId,
        loading,
        refresh,
        isAdmin: roles.includes('admin'),
        isCaptain: roles.includes('captain'),
      }}
    >
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  return useContext(ClubContext);
}
