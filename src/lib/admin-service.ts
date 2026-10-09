import { getSupabaseAdminClient } from "@/lib/supabase";

export type AdminParticipantSummary = {
  id: string;
  username: string;
  phoneNumber: string;
  gender: string;
  age: number;
  education: string;
  affiliation: string;
  createdAt: string;
  session: {
    id: string;
    treatmentGroup: number;
    startTime: string;
    isCompleted: boolean;
    globalRemainingSeconds: number | null;
    timeSpentSeconds: number;
  } | null;
  surveyResults: {
    confidenceLevel: number;
    manipulationCheck: number | null;
    knowHowFee: number;
    entertainment: number;
    maintenance: number;
    marketing: number;
    totalRecommendedFee: number;
  } | null;
  caseStats: {
    totalViewed: number;
    totalSaved: number;
    totalReadSeconds: number;
  };
};

export type AdminDashboardStats = {
  totalParticipants: number;
  totalCompleted: number;
  totalExpired: number;
  completionRate: number;
  treatmentDistribution: {
    group: number;
    label: string;
    count: number;
  }[];
  avgTimeSpentSeconds: number;
  avgConfidenceLevel: number;
  avgManipulationCheck: number;
  genderCounts: Record<string, number>;
  educationCounts: Record<string, number>;
};

export type AdminParticipantDetail = {
  participant: {
    id: string;
    username: string;
    phoneNumber: string;
    gender: string;
    age: number;
    education: string;
    affiliation: string;
    createdAt: string;
  };
  session: {
    id: string;
    treatmentGroup: number;
    startTime: string;
    isCompleted: boolean;
    globalRemainingSeconds: number | null;
    timeSpentSeconds: number;
    createdAt: string;
  } | null;
  surveyResults: {
    id: string;
    knowHowFee: number;
    entertainment: number;
    maintenance: number;
    marketing: number;
    confidenceLevel: number;
    q1Answer: string;
    q2Answer: string;
    q3Answer: string;
    manipulationCheck: number | null;
    createdAt: string;
  } | null;
  caseLogs: {
    id: number;
    caseId: number;
    durationSeconds: number;
    isSaved: boolean;
    rankAssigned: number | null;
    createdAt: string;
  }[];
};

const TREATMENT_LABELS: Record<number, string> = {
  1: "Grup 1: Implisit – Lemah",
  2: "Grup 2: Eksplisit – Lemah",
  3: "Grup 3: Implisit – Kuat",
  4: "Grup 4: Eksplisit – Kuat",
};

/**
 * Mengambil ringkasan statistik KPI tingkat tinggi untuk dashboard overview.
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = getSupabaseAdminClient();

  // Ambil semua participants beserta sessions dan survey_results
  const [participantsRes, sessionsRes, surveyRes] = await Promise.all([
    supabase.from("participants").select("id, gender, education, age"),
    supabase.from("sessions").select("id, participant_id, treatment_group, is_completed, global_remaining_seconds"),
    supabase.from("survey_results").select("confidence_level, manipulation_check"),
  ]);

  if (participantsRes.error) throw participantsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;
  if (surveyRes.error) throw surveyRes.error;

  const participants = participantsRes.data || [];
  const sessions = sessionsRes.data || [];
  const surveyResults = surveyRes.data || [];

  const totalParticipants = participants.length;
  const totalCompleted = sessions.filter((s) => s.is_completed).length;
  const totalExpired = sessions.filter((s) => !s.is_completed).length;
  const completionRate =
    totalParticipants > 0 ? Math.round((totalCompleted / totalParticipants) * 100) : 0;

  // Treatment distribution
  const groupCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const s of sessions) {
    if (s.treatment_group >= 1 && s.treatment_group <= 4) {
      groupCounts[s.treatment_group] = (groupCounts[s.treatment_group] || 0) + 1;
    }
  }

  const treatmentDistribution = [1, 2, 3, 4].map((g) => ({
    group: g,
    label: TREATMENT_LABELS[g],
    count: groupCounts[g] || 0,
  }));

  // Waktu pengerjaan rata-rata (2400 detik - remaining_seconds)
  const timeSpents = sessions
    .filter((s) => s.global_remaining_seconds != null)
    .map((s) => Math.max(0, 2400 - (s.global_remaining_seconds || 0)));
  const avgTimeSpentSeconds =
    timeSpents.length > 0
      ? Math.round(timeSpents.reduce((a, b) => a + b, 0) / timeSpents.length)
      : 0;

  // Rata-rata confidence level
  const confidences = surveyResults.map((s) => s.confidence_level).filter(Boolean);
  const avgConfidenceLevel =
    confidences.length > 0
      ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
      : 0;

  // Rata-rata manipulation check (1-5)
  const manipScores = surveyResults
    .map((s) => s.manipulation_check)
    .filter((v): v is number => v !== null && v !== undefined && v > 0);
  const avgManipulationCheck =
    manipScores.length > 0
      ? Number((manipScores.reduce((a, b) => a + b, 0) / manipScores.length).toFixed(2))
      : 0;

  // Demografi Gender & Pendidikan
  const genderCounts: Record<string, number> = {};
  const educationCounts: Record<string, number> = {};
  for (const p of participants) {
    const g = p.gender || "Lainnya";
    genderCounts[g] = (genderCounts[g] || 0) + 1;
    const e = p.education || "Lainnya";
    educationCounts[e] = (educationCounts[e] || 0) + 1;
  }

  return {
    totalParticipants,
    totalCompleted,
    totalExpired,
    completionRate,
    treatmentDistribution,
    avgTimeSpentSeconds,
    avgConfidenceLevel,
    avgManipulationCheck,
    genderCounts,
    educationCounts,
  };
}

/**
 * Mengambil daftar partisipan beserta data gabungan untuk tabel monitoring.
 */
export async function getAdminParticipantsList(filter?: {
  search?: string;
  treatmentGroup?: number;
  status?: "all" | "completed" | "expired";
}): Promise<AdminParticipantSummary[]> {
  const supabase = getSupabaseAdminClient();

  const [participantsRes, sessionsRes, surveyRes, caseLogsRes] = await Promise.all([
    supabase
      .from("participants")
      .select("id, username, phone_number, gender, age, education, affiliation, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("sessions").select("id, participant_id, treatment_group, start_time, is_completed, global_remaining_seconds, created_at"),
    supabase.from("survey_results").select("session_id, know_how_fee, entertainment, maintenance, marketing, confidence_level, manipulation_check"),
    supabase.from("case_logs").select("session_id, case_id, duration_seconds, is_saved"),
  ]);

  if (participantsRes.error) throw participantsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;
  if (surveyRes.error) throw surveyRes.error;
  if (caseLogsRes.error) throw caseLogsRes.error;

  const sessionsByParticipant = new Map<string, (typeof sessionsRes.data)[number]>();
  for (const s of sessionsRes.data || []) {
    sessionsByParticipant.set(s.participant_id, s);
  }

  const surveyBySession = new Map<string, (typeof surveyRes.data)[number]>();
  for (const sr of surveyRes.data || []) {
    surveyBySession.set(sr.session_id, sr);
  }

  const caseStatsBySession = new Map<
    string,
    { totalViewed: number; totalSaved: number; totalReadSeconds: number }
  >();
  for (const cl of caseLogsRes.data || []) {
    const current = caseStatsBySession.get(cl.session_id) || {
      totalViewed: 0,
      totalSaved: 0,
      totalReadSeconds: 0,
    };
    if (cl.duration_seconds > 0) current.totalViewed += 1;
    if (cl.is_saved) current.totalSaved += 1;
    current.totalReadSeconds += cl.duration_seconds;
    caseStatsBySession.set(cl.session_id, current);
  }

  let list: AdminParticipantSummary[] = (participantsRes.data || []).map((p) => {
    const session = sessionsByParticipant.get(p.id) || null;
    const survey = session ? surveyBySession.get(session.id) || null : null;
    const caseStats = session
      ? caseStatsBySession.get(session.id) || { totalViewed: 0, totalSaved: 0, totalReadSeconds: 0 }
      : { totalViewed: 0, totalSaved: 0, totalReadSeconds: 0 };

    const remaining = session?.global_remaining_seconds ?? null;
    const timeSpent = remaining != null ? Math.max(0, 2400 - remaining) : 0;

    const kh = Number(survey?.know_how_fee || 0);
    const ent = Number(survey?.entertainment || 0);
    const mnt = Number(survey?.maintenance || 0);
    const mkt = Number(survey?.marketing || 0);

    return {
      id: p.id,
      username: p.username,
      phoneNumber: p.phone_number,
      gender: p.gender,
      age: p.age,
      education: p.education,
      affiliation: p.affiliation,
      createdAt: p.created_at,
      session: session
        ? {
            id: session.id,
            treatmentGroup: session.treatment_group,
            startTime: session.start_time,
            isCompleted: session.is_completed,
            globalRemainingSeconds: remaining,
            timeSpentSeconds: timeSpent,
          }
        : null,
      surveyResults: survey
        ? {
            confidenceLevel: survey.confidence_level,
            manipulationCheck: survey.manipulation_check,
            knowHowFee: kh,
            entertainment: ent,
            maintenance: mnt,
            marketing: mkt,
            totalRecommendedFee: kh + ent + mnt + mkt,
          }
        : null,
      caseStats,
    };
  });

  // Terapkan Filter
  if (filter?.search) {
    const q = filter.search.toLowerCase().trim();
    list = list.filter(
      (item) =>
        item.username.toLowerCase().includes(q) ||
        item.phoneNumber.toLowerCase().includes(q) ||
        item.affiliation.toLowerCase().includes(q),
    );
  }

  if (filter?.treatmentGroup && filter.treatmentGroup >= 1 && filter.treatmentGroup <= 4) {
    list = list.filter((item) => item.session?.treatmentGroup === filter.treatmentGroup);
  }

  if (filter?.status === "completed") {
    list = list.filter((item) => item.session?.isCompleted === true);
  } else if (filter?.status === "expired") {
    list = list.filter((item) => item.session?.isCompleted === false);
  }

  return list;
}

/**
 * Mengambil detail mikro lengkap 1 partisipan (14 kasus acuan, rekomendasi, kuesioner, dsb).
 */
export async function getAdminParticipantDetail(
  participantId: string,
): Promise<AdminParticipantDetail | null> {
  const supabase = getSupabaseAdminClient();

  const { data: participant, error: pErr } = await supabase
    .from("participants")
    .select("id, username, phone_number, gender, age, education, affiliation, created_at")
    .eq("id", participantId)
    .single();

  if (pErr || !participant) return null;

  const { data: session } = await supabase
    .from("sessions")
    .select("id, treatment_group, start_time, is_completed, global_remaining_seconds, created_at")
    .eq("participant_id", participantId)
    .single();

  let surveyResults: AdminParticipantDetail["surveyResults"] = null;
  let caseLogs: AdminParticipantDetail["caseLogs"] = [];

  if (session) {
    const [srRes, clRes] = await Promise.all([
      supabase
        .from("survey_results")
        .select("id, know_how_fee, entertainment, maintenance, marketing, confidence_level, q1_answer, q2_answer, q3_answer, manipulation_check, created_at")
        .eq("session_id", session.id)
        .maybeSingle(),
      supabase
        .from("case_logs")
        .select("id, case_id, duration_seconds, is_saved, rank_assigned, created_at")
        .eq("session_id", session.id)
        .order("case_id", { ascending: true }),
    ]);

    if (srRes.data) {
      surveyResults = {
        id: srRes.data.id,
        knowHowFee: Number(srRes.data.know_how_fee),
        entertainment: Number(srRes.data.entertainment),
        maintenance: Number(srRes.data.maintenance),
        marketing: Number(srRes.data.marketing),
        confidenceLevel: srRes.data.confidence_level,
        q1Answer: srRes.data.q1_answer,
        q2Answer: srRes.data.q2_answer,
        q3Answer: srRes.data.q3_answer,
        manipulationCheck: srRes.data.manipulation_check,
        createdAt: srRes.data.created_at,
      };
    }

    if (clRes.data) {
      caseLogs = clRes.data.map((row) => ({
        id: Number(row.id),
        caseId: row.case_id,
        durationSeconds: row.duration_seconds,
        isSaved: row.is_saved,
        rankAssigned: row.rank_assigned,
        createdAt: row.created_at,
      }));
    }
  }

  const remaining = session?.global_remaining_seconds ?? null;
  const timeSpent = remaining != null ? Math.max(0, 2400 - remaining) : 0;

  return {
    participant: {
      id: participant.id,
      username: participant.username,
      phoneNumber: participant.phone_number,
      gender: participant.gender,
      age: participant.age,
      education: participant.education,
      affiliation: participant.affiliation,
      createdAt: participant.created_at,
    },
    session: session
      ? {
          id: session.id,
          treatmentGroup: session.treatment_group,
          startTime: session.start_time,
          isCompleted: session.is_completed,
          globalRemainingSeconds: remaining,
          timeSpentSeconds: timeSpent,
          createdAt: session.created_at,
        }
      : null,
    surveyResults,
    caseLogs,
  };
}

export type ResearchAnalyticsData = {
  treatmentGroups: {
    group: number;
    label: string;
    participantCount: number;
    avgKnowHowFee: number;
    avgEntertainment: number;
    avgMaintenance: number;
    avgMarketing: number;
    avgTotalFee: number;
    avgConfidence: number;
    avgManipulationCheck: number;
    avgTotalCaseDuration: number;
  }[];
  caseSearchPatterns: {
    caseId: number;
    totalReadSeconds: number;
    avgDurationSeconds: number;
    viewCount: number;
    savedCount: number;
    savePercentage: number;
    avgRank: number | null;
  }[];
  manipulationCheckDistribution: {
    score: number;
    group1: number;
    group2: number;
    group3: number;
    group4: number;
    total: number;
  }[];
};

/**
 * Menghitung analitik ilmiah perlakuan eksperimen & pencarian informasi 14 kasus.
 */
export async function getResearchAnalytics(): Promise<ResearchAnalyticsData> {
  const supabase = getSupabaseAdminClient();

  const [sessionsRes, surveyRes, caseLogsRes] = await Promise.all([
    supabase.from("sessions").select("id, treatment_group, is_completed"),
    supabase.from("survey_results").select("session_id, know_how_fee, entertainment, maintenance, marketing, confidence_level, manipulation_check"),
    supabase.from("case_logs").select("session_id, case_id, duration_seconds, is_saved, rank_assigned"),
  ]);

  if (sessionsRes.error) throw sessionsRes.error;
  if (surveyRes.error) throw surveyRes.error;
  if (caseLogsRes.error) throw caseLogsRes.error;

  const sessions = sessionsRes.data || [];
  const surveys = surveyRes.data || [];
  const caseLogs = caseLogsRes.data || [];

  const surveyBySession = new Map<string, (typeof surveys)[number]>();
  for (const s of surveys) {
    surveyBySession.set(s.session_id, s);
  }

  // Agregasi per Treatment Group 1..4
  const groupData: Record<
    number,
    {
      count: number;
      khSum: number;
      entSum: number;
      mntSum: number;
      mktSum: number;
      confSum: number;
      manipSum: number;
      manipCount: number;
      totalCaseDurationSum: number;
    }
  > = {
    1: { count: 0, khSum: 0, entSum: 0, mntSum: 0, mktSum: 0, confSum: 0, manipSum: 0, manipCount: 0, totalCaseDurationSum: 0 },
    2: { count: 0, khSum: 0, entSum: 0, mntSum: 0, mktSum: 0, confSum: 0, manipSum: 0, manipCount: 0, totalCaseDurationSum: 0 },
    3: { count: 0, khSum: 0, entSum: 0, mntSum: 0, mktSum: 0, confSum: 0, manipSum: 0, manipCount: 0, totalCaseDurationSum: 0 },
    4: { count: 0, khSum: 0, entSum: 0, mntSum: 0, mktSum: 0, confSum: 0, manipSum: 0, manipCount: 0, totalCaseDurationSum: 0 },
  };

  const sessionTreatmentMap = new Map<string, number>();
  for (const s of sessions) {
    sessionTreatmentMap.set(s.id, s.treatment_group);
    const grp = s.treatment_group;
    if (grp >= 1 && grp <= 4) {
      groupData[grp].count += 1;
      const sr = surveyBySession.get(s.id);
      if (sr) {
        groupData[grp].khSum += Number(sr.know_how_fee);
        groupData[grp].entSum += Number(sr.entertainment);
        groupData[grp].mntSum += Number(sr.maintenance);
        groupData[grp].mktSum += Number(sr.marketing);
        groupData[grp].confSum += sr.confidence_level;
        if (sr.manipulation_check != null) {
          groupData[grp].manipSum += sr.manipulation_check;
          groupData[grp].manipCount += 1;
        }
      }
    }
  }

  for (const cl of caseLogs) {
    const grp = sessionTreatmentMap.get(cl.session_id);
    if (grp && groupData[grp]) {
      groupData[grp].totalCaseDurationSum += cl.duration_seconds;
    }
  }

  const treatmentGroups = [1, 2, 3, 4].map((g) => {
    const d = groupData[g];
    const n = d.count || 1;
    const avgKh = Math.round(d.khSum / n);
    const avgEnt = Math.round(d.entSum / n);
    const avgMnt = Math.round(d.mntSum / n);
    const avgMkt = Math.round(d.mktSum / n);
    const avgTotal = avgKh + avgEnt + avgMnt + avgMkt;
    const avgConf = Math.round(d.confSum / n);
    const avgManip = d.manipCount > 0 ? Number((d.manipSum / d.manipCount).toFixed(2)) : 0;
    const avgCaseDur = Math.round(d.totalCaseDurationSum / n);

    return {
      group: g,
      label: TREATMENT_LABELS[g],
      participantCount: d.count,
      avgKnowHowFee: avgKh,
      avgEntertainment: avgEnt,
      avgMaintenance: avgMnt,
      avgMarketing: avgMkt,
      avgTotalFee: avgTotal,
      avgConfidence: avgConf,
      avgManipulationCheck: avgManip,
      avgTotalCaseDuration: avgCaseDur,
    };
  });

  // Agregasi Pola 14 Kasus Acuan
  const caseMap = new Map<
    number,
    { totalDur: number; viewCount: number; savedCount: number; rankSum: number; rankCount: number }
  >();
  for (let i = 1; i <= 14; i++) {
    caseMap.set(i, { totalDur: 0, viewCount: 0, savedCount: 0, rankSum: 0, rankCount: 0 });
  }

  for (const cl of caseLogs) {
    const entry = caseMap.get(cl.case_id);
    if (entry) {
      entry.totalDur += cl.duration_seconds;
      if (cl.duration_seconds > 0) entry.viewCount += 1;
      if (cl.is_saved) entry.savedCount += 1;
      if (cl.rank_assigned != null) {
        entry.rankSum += cl.rank_assigned;
        entry.rankCount += 1;
      }
    }
  }

  const totalSessionCount = sessions.length || 1;
  const caseSearchPatterns = Array.from(caseMap.entries()).map(([caseId, d]) => {
    const avgDur = d.viewCount > 0 ? Math.round(d.totalDur / d.viewCount) : 0;
    const savePct = Math.round((d.savedCount / totalSessionCount) * 100);
    const avgRank = d.rankCount > 0 ? Number((d.rankSum / d.rankCount).toFixed(1)) : null;

    return {
      caseId,
      totalReadSeconds: d.totalDur,
      avgDurationSeconds: avgDur,
      viewCount: d.viewCount,
      savedCount: d.savedCount,
      savePercentage: savePct,
      avgRank,
    };
  });

  // Distribusi Manipulation Check (Likert 1..5)
  const scoreDist: Record<number, Record<number, number>> = {
    1: { 1: 0, 2: 0, 3: 0, 4: 0 },
    2: { 1: 0, 2: 0, 3: 0, 4: 0 },
    3: { 1: 0, 2: 0, 3: 0, 4: 0 },
    4: { 1: 0, 2: 0, 3: 0, 4: 0 },
    5: { 1: 0, 2: 0, 3: 0, 4: 0 },
  };

  for (const s of sessions) {
    const grp = s.treatment_group;
    const sr = surveyBySession.get(s.id);
    if (grp >= 1 && grp <= 4 && sr?.manipulation_check != null) {
      const score = sr.manipulation_check;
      if (score >= 1 && score <= 5) {
        scoreDist[score][grp] = (scoreDist[score][grp] || 0) + 1;
      }
    }
  }

  const manipulationCheckDistribution = [1, 2, 3, 4, 5].map((score) => {
    const g = scoreDist[score];
    const total = g[1] + g[2] + g[3] + g[4];
    return {
      score,
      group1: g[1],
      group2: g[2],
      group3: g[3],
      group4: g[4],
      total,
    };
  });

  return {
    treatmentGroups,
    caseSearchPatterns,
    manipulationCheckDistribution,
  };
}

/**
 * Generator CSV untuk berbagai kebutuhan riset & operasional.
 */
export async function generateExportCsv(type: "wide" | "long" | "incentive"): Promise<string> {
  const supabase = getSupabaseAdminClient();

  if (type === "incentive") {
    const { data: participants, error } = await supabase
      .from("participants")
      .select("username, phone_number, affiliation, created_at, sessions(is_completed)")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const rows = [
      ["No", "Username", "No_Handphone", "Afiliasi", "Status_Pengerjaan", "Waktu_Mulai"].join(","),
    ];

    (participants || []).forEach((p, idx) => {
      const session = Array.isArray(p.sessions) ? p.sessions[0] : p.sessions;
      const status = session?.is_completed ? "Selesai" : "Habis Waktu";
      const cleanPhone = `="${p.phone_number.replace(/"/g, '""')}"`;
      rows.push(
        [
          idx + 1,
          `"${p.username.replace(/"/g, '""')}"`,
          cleanPhone,
          `"${p.affiliation.replace(/"/g, '""')}"`,
          status,
          `"${new Date(p.created_at).toLocaleString("id-ID")}"`,
        ].join(","),
      );
    });

    return rows.join("\r\n");
  }

  if (type === "long") {
    // 1 baris per interaksi kasus (14 baris per partisipan)
    const { data, error } = await supabase
      .from("case_logs")
      .select("session_id, case_id, duration_seconds, is_saved, rank_assigned, sessions(participant_id, treatment_group, is_completed, participants(username))")
      .order("session_id", { ascending: true })
      .order("case_id", { ascending: true });

    if (error) throw error;

    const header = [
      "session_id",
      "participant_id",
      "username",
      "treatment_group",
      "is_completed",
      "case_id",
      "duration_seconds",
      "is_saved",
      "rank_assigned",
    ].join(",");

    const rows = [header];
    (data || []).forEach((row) => {
      const sess = Array.isArray(row.sessions) ? row.sessions[0] : row.sessions;
      const p = Array.isArray(sess?.participants) ? sess?.participants[0] : sess?.participants;
      rows.push(
        [
          row.session_id,
          sess?.participant_id || "",
          `"${(p?.username || "").replace(/"/g, '""')}"`,
          sess?.treatment_group || "",
          sess?.is_completed ? 1 : 0,
          row.case_id,
          row.duration_seconds,
          row.is_saved ? 1 : 0,
          row.rank_assigned ?? "",
        ].join(","),
      );
    });

    return rows.join("\r\n");
  }

  // DEFAULT: WIDE FORMAT (1 baris per partisipan, siap SPSS / Stata / Excel)
  const [participantsRes, sessionsRes, surveyRes, caseLogsRes] = await Promise.all([
    supabase.from("participants").select("*").order("created_at", { ascending: true }),
    supabase.from("sessions").select("*"),
    supabase.from("survey_results").select("*"),
    supabase.from("case_logs").select("*"),
  ]);

  if (participantsRes.error) throw participantsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;
  if (surveyRes.error) throw surveyRes.error;
  if (caseLogsRes.error) throw caseLogsRes.error;

  const sessionsMap = new Map<string, (typeof sessionsRes.data)[number]>();
  for (const s of sessionsRes.data || []) {
    sessionsMap.set(s.participant_id, s);
  }

  const surveyMap = new Map<string, (typeof surveyRes.data)[number]>();
  for (const sr of surveyRes.data || []) {
    surveyMap.set(sr.session_id, sr);
  }

  const casesBySession = new Map<string, Map<number, (typeof caseLogsRes.data)[number]>>();
  for (const cl of caseLogsRes.data || []) {
    let map = casesBySession.get(cl.session_id);
    if (!map) {
      map = new Map();
      casesBySession.set(cl.session_id, map);
    }
    map.set(cl.case_id, cl);
  }

  // Bangun Header Kolom Wide
  const headers = [
    "participant_id",
    "username",
    "gender",
    "age",
    "education",
    "affiliation",
    "created_at",
    "treatment_group",
    "is_completed",
    "global_remaining_seconds",
    "total_time_spent_seconds",
    "know_how_fee",
    "entertainment_fee",
    "maintenance_fee",
    "marketing_fee",
    "total_recommended_fee",
    "confidence_level",
    "manipulation_check",
    "q1_answer",
    "q2_answer",
    "q3_answer",
  ];

  for (let i = 1; i <= 14; i++) {
    headers.push(`case_${i}_dur_sec`);
    headers.push(`case_${i}_saved`);
    headers.push(`case_${i}_rank`);
  }

  const rows = [headers.join(",")];

  (participantsRes.data || []).forEach((p) => {
    const sess = sessionsMap.get(p.id);
    const sr = sess ? surveyMap.get(sess.id) : null;
    const cases = sess ? casesBySession.get(sess.id) : null;

    const remaining = sess?.global_remaining_seconds ?? null;
    const timeSpent = remaining != null ? Math.max(0, 2400 - remaining) : "";

    const kh = sr ? Number(sr.know_how_fee) : "";
    const ent = sr ? Number(sr.entertainment) : "";
    const mnt = sr ? Number(sr.maintenance) : "";
    const mkt = sr ? Number(sr.marketing) : "";
    const total = sr ? Number(kh) + Number(ent) + Number(mnt) + Number(mkt) : "";

    const cols: (string | number)[] = [
      p.id,
      `"${p.username.replace(/"/g, '""')}"`,
      `"${p.gender.replace(/"/g, '""')}"`,
      p.age,
      `"${p.education.replace(/"/g, '""')}"`,
      `"${p.affiliation.replace(/"/g, '""')}"`,
      `"${p.created_at}"`,
      sess?.treatment_group ?? "",
      sess ? (sess.is_completed ? 1 : 0) : "",
      remaining ?? "",
      timeSpent,
      kh,
      ent,
      mnt,
      mkt,
      total,
      sr?.confidence_level ?? "",
      sr?.manipulation_check ?? "",
      sr ? `"${sr.q1_answer.replace(/"/g, '""')}"` : "",
      sr ? `"${sr.q2_answer.replace(/"/g, '""')}"` : "",
      sr ? `"${sr.q3_answer.replace(/"/g, '""')}"` : "",
    ];

    for (let c = 1; c <= 14; c++) {
      const caseItem = cases?.get(c);
      cols.push(caseItem?.duration_seconds ?? 0);
      cols.push(caseItem ? (caseItem.is_saved ? 1 : 0) : 0);
      cols.push(caseItem?.rank_assigned ?? "");
    }

    rows.push(cols.join(","));
  });

  return rows.join("\r\n");
}
