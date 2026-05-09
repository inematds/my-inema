"use client";

import { createContext, useContext, useMemo } from "react";

type JuniorContextValue = {
  attemptId: string | null;
  // Returns request headers to include on every Junior API call. Includes
  // x-attempt-id when in classroom-attempt mode, or just Content-Type otherwise.
  apiHeaders: () => HeadersInit;
};

const JuniorContext = createContext<JuniorContextValue>({
  attemptId: null,
  apiHeaders: () => ({ "Content-Type": "application/json" }),
});

export function JuniorProvider({
  attemptId,
  children,
}: {
  attemptId?: string | null;
  children: React.ReactNode;
}) {
  const value = useMemo<JuniorContextValue>(() => {
    const id = attemptId ?? null;
    return {
      attemptId: id,
      apiHeaders: () => ({
        "Content-Type": "application/json",
        ...(id ? { "x-attempt-id": id } : {}),
      }),
    };
  }, [attemptId]);
  return <JuniorContext.Provider value={value}>{children}</JuniorContext.Provider>;
}

export function useJuniorContext() {
  return useContext(JuniorContext);
}
