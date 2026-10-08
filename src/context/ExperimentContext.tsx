"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
} from "react";
import {
  createInitialExperimentState,
  experimentReducer,
  loadPersistedState,
  persistState,
  type ExperimentAction,
  type ExperimentState,
  type StorageLike,
} from "@/lib/experiment";

/**
 * Provider state eksperimen (BETE-6): memakai reducer murni di
 * src/lib/experiment.ts, rehidrasi otomatis dari sessionStorage + localStorage
 * saat mount, dan write-through persistence setiap perubahan state.
 */

type ExperimentContextValue = {
  state: ExperimentState;
  dispatch: Dispatch<ExperimentAction>;
  /** True setelah upaya rehidrasi selesai; dipakai guard anti-cheat agar tidak
   * mengambil keputusan dari state kosong sebelum storage terbaca. */
  isRehydrated: boolean;
};

const ExperimentContext = createContext<ExperimentContextValue | null>(null);

function getClientStorages(): StorageLike[] {
  if (typeof window === "undefined") return [];
  return [window.sessionStorage, window.localStorage];
}

export function ExperimentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(
    experimentReducer,
    undefined,
    createInitialExperimentState,
  );

  // Rehidrasi otomatis sekali setelah mount (bukan lazy init) supaya render
  // pertama server & client identik — bebas hydration mismatch. Dispatch
  // REHYDRATE (dengan state storage ATAU state awal) menandai storageChecked
  // yang menjadi gerbang persistence dan guard anti-cheat.
  useEffect(() => {
    const persisted = loadPersistedState(getClientStorages(), Date.now());
    dispatch({ type: "REHYDRATE", state: persisted ?? createInitialExperimentState() });
  }, []);

  // Write-through persistence: sessionStorage DAN localStorage. Baru aktif
  // setelah storage diperiksa agar state awal tidak menimpa data tersimpan.
  useEffect(() => {
    if (!state.storageChecked) return;
    persistState(state, getClientStorages());
  }, [state]);

  const value = useMemo(
    () => ({ state, dispatch, isRehydrated: state.storageChecked }),
    [state, dispatch],
  );

  return <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>;
}

export function useExperiment(): ExperimentContextValue {
  const context = useContext(ExperimentContext);
  if (!context) {
    throw new Error("useExperiment harus dipanggil di dalam <ExperimentProvider>.");
  }
  return context;
}
