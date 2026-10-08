"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useExperiment } from "@/context/ExperimentContext";
import { pathForStep, stepFromPath } from "@/lib/experiment";

/**
 * Anti-cheat navigasi (alur satu arah), dipasang di layout (survey):
 *
 * 1. Blokir tombol back browser / router.back(). API resmi Next.js untuk ini
 *    (router.beforePopState) hanya ada di Pages Router; di App Router yang
 *    setara adalah Navigation API: traversal (back/forward) dicegah dengan
 *    preventDefault() pada event "beforenavigate" — lokasi tidak berubah sama
 *    sekali. Browser tanpa Navigation API memakai fallback: popstate dicegat
 *    dan partisipan dipaksa maju lagi (router.replace) ke langkah terakhirnya.
 * 2. beforeunload: peringatan native saat menutup/refresh tab — aktif selama
 *    eksperimen berjalan dan NONAKTIF setelah submit final berhasil.
 * 3. Sinkronisasi currentStep dari URL (hanya maju) + redirect ke "/" bila
 *    halaman step dibuka langsung sebelum consent.
 *
 * Komponen ini merender null — murni logika sisi klien.
 */

type BeforeNavigateEventLike = {
  navigationType: string;
  preventDefault(): void;
};

type NavigationLike = {
  addEventListener(
    type: "beforenavigate",
    listener: (event: BeforeNavigateEventLike) => void,
  ): void;
  removeEventListener(
    type: "beforenavigate",
    listener: (event: BeforeNavigateEventLike) => void,
  ): void;
};

function getNavigation(): NavigationLike | undefined {
  if (typeof window === "undefined") return undefined;
  // Navigation API belum ada di semua lib.dom — baca defensif tanpa `any`.
  const nav = (window as { navigation?: NavigationLike }).navigation;
  return typeof nav?.addEventListener === "function" ? nav : undefined;
}

export function AntiCheatGuard() {
  const { state, dispatch, isRehydrated } = useExperiment();
  const router = useRouter();
  const pathname = usePathname();
  const { status } = state;
  const { currentStep } = state.sessionData;

  // Ref untuk dibaca popstate handler tanpa membuat effect bergantung state.
  const currentStepRef = useRef(currentStep);
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // 1) Blokir traversal mundur: Navigation API bila tersedia, popstate fallback.
  useEffect(() => {
    const navigation = getNavigation();
    if (navigation) {
      const onBeforeNavigate = (event: BeforeNavigateEventLike) => {
        // Semua traversal (back/forward) dicegah selama di dalam eksperimen —
        // maju antar-langkah memakai push (Link/router.push), bukan traversal.
        if (event.navigationType === "traverse") {
          event.preventDefault();
        }
      };
      navigation.addEventListener("beforenavigate", onBeforeNavigate);
      return () => navigation.removeEventListener("beforenavigate", onBeforeNavigate);
    }

    // Fallback tanpa Navigation API: daftarkan listener SETELAH handler
    // popstate milik Next (app-router memasangnya di effect root, kita di
    // effect anak — tunda 1 macrotask agar urutannya di belakang Next), lalu
    // paksa maju kembali ke langkah terakhir bila lokasi berpindah mundur.
    let popstateListener: (() => void) | null = null;
    const timeoutId = window.setTimeout(() => {
      popstateListener = () => {
        const poppedStep = stepFromPath(window.location.pathname);
        const target = currentStepRef.current;
        if (target > 0 && poppedStep < target) {
          router.replace(pathForStep(target));
        }
      };
      window.addEventListener("popstate", popstateListener);
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      if (popstateListener) window.removeEventListener("popstate", popstateListener);
    };
  }, [router]);

  // 2) beforeunload aktif sampai submit final berhasil (status "submitted").
  useEffect(() => {
    if (!isRehydrated) return;
    if (status !== "running" && status !== "expired") return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      // Standar lintas browser: preventDefault + returnValue.
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isRehydrated, status]);

  // 3) Sinkronisasi currentStep satu arah + gerbang halaman step.
  useEffect(() => {
    if (!isRehydrated) return;
    const step = stepFromPath(pathname ?? "/");
    if (step === 0) return;
    if (status === "idle") {
      // Halaman step dibuka sebelum consent → kembali ke login/consent.
      router.replace("/");
      return;
    }
    if (step > currentStep) {
      dispatch({ type: "SET_STEP", step });
    } else if (step < currentStep && status === "running") {
      // Kedua: pengaman tambahan — langkah mundur dipaksa maju lagi.
      router.replace(pathForStep(currentStep));
    }
  }, [isRehydrated, pathname, status, currentStep, dispatch, router]);

  return null;
}
