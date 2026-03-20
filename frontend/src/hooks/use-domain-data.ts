"use client";

import { useEffect, useState } from "react";

import { getNasUsers, getShares } from "@/lib/api";
import { getStoredAccessToken } from "@/lib/auth";
import type { NasUser, Share } from "@/types/api";

type DomainDataState = {
  users: NasUser[];
  shares: Share[];
  error: string | null;
};

export function useDomainData() {
  const [state, setState] = useState<DomainDataState>({
    users: [],
    shares: [],
    error: null,
  });

  useEffect(() => {
    async function loadDomainData() {
      const token = getStoredAccessToken();
      if (!token) return;

      try {
        const [users, shares] = await Promise.all([getNasUsers(token), getShares(token)]);
        setState({
          users,
          shares,
          error: null,
        });
      } catch (error) {
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Errore caricamento dati dominio",
        }));
      }
    }

    void loadDomainData();
  }, []);

  return state;
}
