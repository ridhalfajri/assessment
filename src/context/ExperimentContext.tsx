"use client";

import { createContext, useContext, useMemo, useState } from "react";

// TODO(BETE-6): engine lengkap — persistensi ke sessionStorage/localStorage,
// random assignment treatment group 1-4 saat login, dan global countdown.

export type SessionData = {
  /** Diisi setelah login (BETE-8). */
  participantId: string | null;
  /** 1-4, diacak saat partisipan mulai eksperimen (BETE-8). */
  treatmentGroupId: number | null;
  /** Sisa waktu global dalam detik; mulai dari 2400 (40 menit). */
  globalTimeRemaining: number;
  currentStep: number;
};

export type CaseLog = {
  caseId: number;
  durationSeconds: number;
  isSaved: boolean;
  rank: number | null;
};

export type Recommendations = {
  knowHowFee: number | null;
  entertainment: number | null;
  maintenance: number | null;
  marketing: number | null;
  confidenceLevel: number | null;
};

export type Questionnaire = {
  q1: string | null;
  q2: string | null;
  q3: string | null;
};

export type Demographics = {
  age: number | null;
  gender: string | null;
  education: string | null;
  phoneNumber: string | null;
};

export type ExperimentState = {
  sessionData: SessionData;
  caseLogs: CaseLog[];
  recommendations: Recommendations;
  questionnaire: Questionnaire;
  demographics: Demographics;
};

const initialState: ExperimentState = {
  sessionData: {
    participantId: null,
    treatmentGroupId: null,
    globalTimeRemaining: 40 * 60,
    currentStep: 0,
  },
  caseLogs: [],
  recommendations: {
    knowHowFee: null,
    entertainment: null,
    maintenance: null,
    marketing: null,
    confidenceLevel: null,
  },
  questionnaire: { q1: null, q2: null, q3: null },
  demographics: {
    age: null,
    gender: null,
    education: null,
    phoneNumber: null,
  },
};

type ExperimentContextValue = {
  state: ExperimentState;
  setState: React.Dispatch<React.SetStateAction<ExperimentState>>;
};

const ExperimentContext = createContext<ExperimentContextValue | null>(null);

export function ExperimentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ExperimentState>(initialState);
  const value = useMemo(() => ({ state, setState }), [state]);
  return <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>;
}

export function useExperiment(): ExperimentContextValue {
  const context = useContext(ExperimentContext);
  if (!context) {
    throw new Error("useExperiment harus dipanggil di dalam <ExperimentProvider>.");
  }
  return context;
}
