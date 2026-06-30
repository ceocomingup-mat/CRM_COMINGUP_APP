/* ============================================================================
 *  repo.ts — warstwa danych aplikacji (B4.2)
 * ----------------------------------------------------------------------------
 *  Przenosi `SupabaseRepository` (B1.2) do frontu i KLUCZOWE: każe mu używać
 *  TEGO SAMEGO klienta co logowanie (`supabase` z supabase.ts), żeby JWT
 *  zalogowanego użytkownika jechał do każdego zapytania → RLS działa, a nie
 *  powstaje druga instancja GoTrue.
 * ========================================================================== */
import { supabase } from './supabase'
import { repo as rawRepo } from './supabaseRepository.js'

// Współdziel jeden, uwierzytelniony klient (zamiast osobnego z repo.init()).
;(rawRepo as { client: unknown }).client = supabase

export const repo = rawRepo

/* ── Typy encji (na razie tylko te, których używają widoki) ──────────────── */
export interface Client {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  province: string | null
  source: string | null
  product: string | null
  currentStage: number
  mmNetto: number | null
  mmStatus: string | null
  contractDate: string | null
  status: string
  advisorId: string | null
  lat: number | null
  lng: number | null
}

export interface UserLite {
  id: string
  firstName: string
  lastName: string
  role: string
}

export interface Lead {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  city: string | null
  province: string | null
  source: string | null
  status: string
  advisorId: string | null
}

export interface Task {
  id: string
  assignedTo: string | null
  assignedBy: string | null
  clientId: string | null
  title: string
  notes: string | null
  dueDate: string | null
  priority: string
  status: string
}

export interface Stage {
  id: string
  stageOrder: number
  name: string
  description: string | null
  canLose: boolean
  canRevert: boolean
  mmRequired: boolean
}

export interface StageHistory {
  id: string
  clientId: string
  stage: number
  enteredAt: string | null
  completedAt: string | null
}

export async function listClients(): Promise<Client[]> {
  return repo.list<Client>('clients')
}

export async function listUsers(): Promise<UserLite[]> {
  return repo.list<UserLite>('users')
}

export async function getClient(id: string): Promise<Client | null> {
  return repo.get<Client>('clients', id)
}

/* ── Profil użytkownika (własny wiersz users; RLS: czyta/edytuje siebie) ── */
export interface UserFull {
  id: string
  role: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  rank: string
  rankPct: number
  provinces: string[]
  managerId: string | null
}
export async function getUser(id: string): Promise<UserFull | null> {
  return repo.get<UserFull>('users', id)
}
/* Edycja własnego profilu — tylko pola niewrażliwe (imię/nazwisko/telefon).
 * Pola wrażliwe (rola/ranga/%/struktura) blokuje trigger app.users_guard_sensitive. */
export async function updateProfile(
  id: string,
  patch: { firstName?: string; lastName?: string; phone?: string | null },
): Promise<UserFull> {
  return repo.update<UserFull>('users', id, patch)
}

/* ── Admin: lista kont + zmiana pól wrażliwych przez serwerowe RPC (B2.3) ── */
export async function listAllUsers(): Promise<UserFull[]> {
  return repo.list<UserFull>('users')
}
/* Zmiana roli/rangi/% — RPC `admin_update_user` (wrapper → app.admin_update_user_profile,
 * SECURITY DEFINER z gardą app.require_admin()). Nie-admin dostaje wyjątek z bazy. */
export async function adminUpdateUser(
  targetId: string,
  patch: { role?: string; rank?: string; rank_pct?: number },
): Promise<UserFull> {
  const { data, error } = await supabase.rpc('admin_update_user', { p_target: targetId, p: patch })
  if (error) throw new Error(error.message)
  return rawRepo.fromDb<UserFull>('users', data)
}

/* Przesuń klienta na inny etap przez SERWEROWE RPC `advance_stage` (B4.7):
 * atomowo zapisuje `clients.current_stage` + `client_stage_history` (RLS = server-only)
 * + audyt do `events`, z gardą roli/własności po stronie bazy (admin lub właściciel).
 * Zwracany wiersz `clients` (snake_case) mapujemy na model camelCase przez repo.fromDb. */
export async function setClientStage(
  id: string,
  stage: number,
  note?: string,
): Promise<Client> {
  const { data, error } = await supabase.rpc('advance_stage', {
    p_client_id: id,
    p_target_stage: stage,
    p_note: note ?? null,
  })
  if (error) throw new Error(error.message)
  return rawRepo.fromDb<Client>('clients', data)
}

export async function listStages(): Promise<Stage[]> {
  const rows = await repo.list<Stage>('stages')
  return rows.sort((a, b) => a.stageOrder - b.stageOrder)
}

export async function listStageHistory(clientId: string): Promise<StageHistory[]> {
  return repo.list<StageHistory>('clientStageHistory', { clientId })
}

export async function listLeads(): Promise<Lead[]> {
  return repo.list<Lead>('leads')
}

export async function getLead(id: string): Promise<Lead | null> {
  return repo.get<Lead>('leads', id)
}

/* Znajdź klienta utworzonego z danego leada (sprawdzenie „proces już rozpoczęty"). */
export async function getClientByLead(leadId: string): Promise<Client | null> {
  const rows = await repo.list<Client>('clients', { leadId })
  return rows[0] ?? null
}

/* „Rozpocznij proces": SERWEROWE RPC `start_process` (B4.8) — atomowo przejmuje
 * leada (jeśli wolny) i tworzy klienta na etapie 1 (+ historia + audyt), pod gardą
 * praw po stronie bazy. Zwraca nowy wiersz `clients` (mapowany na camelCase). */
export async function startProcess(leadId: string): Promise<Client> {
  const { data, error } = await supabase.rpc('start_process', { p_lead_id: leadId })
  if (error) throw new Error(error.message)
  return rawRepo.fromDb<Client>('clients', data)
}

export async function listTasks(): Promise<Task[]> {
  return repo.list<Task>('tasks')
}

/* ── Kalendarz (calendar_events, RLS: własne + struktura/scope) ── */
export interface CalendarEvent {
  id: string
  clientId: string | null
  title: string | null
  type: string | null
  startTs: string | null
  endTs: string | null
  allDay: boolean
  location: string | null
  notes: string | null
}
export async function listCalendarEvents(): Promise<CalendarEvent[]> {
  return repo.list<CalendarEvent>('calendarEvents')
}

/* Zadania — RLS: użytkownik czyta/edytuje/dodaje w swoim zakresie (assigned_to ∈ scope). */
export async function setTaskStatus(id: string, status: string): Promise<Task> {
  return repo.update<Task>('tasks', id, { status })
}
export async function createTask(t: {
  assignedTo: string
  title: string
  notes: string | null
  dueDate: string | null
  priority: string
  clientId: string | null
}): Promise<Task> {
  return repo.create<Task>('tasks', {
    ...t,
    assignedBy: t.assignedTo,
    status: 'pending',
  })
}

/* ── B12.2: agregaty zespołu z backendu (widok v_team_pipeline, RLS pytającego) ── */
export interface TeamRow {
  userId: string
  firstName: string
  lastName: string
  role: string
  managerId: string | null
  clientsActive: number
  clientsWon: number
  clientsLost: number
  clientsTotal: number
  mmWon: number
  leadsTotal: number
  recruits: number
}

export async function listTeamPipeline(): Promise<TeamRow[]> {
  const { data, error } = await supabase.from('v_team_pipeline').select('*')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => {
    const o = rawRepo.fromDb<TeamRow>('v_team_pipeline', r)
    // PostgREST: count()→liczba, sum(numeric)→string — domykamy na Number.
    return {
      ...o,
      clientsActive: Number(o.clientsActive),
      clientsWon: Number(o.clientsWon),
      clientsLost: Number(o.clientsLost),
      clientsTotal: Number(o.clientsTotal),
      mmWon: Number(o.mmWon),
      leadsTotal: Number(o.leadsTotal),
      recruits: Number(o.recruits),
    }
  })
}

/* Realtime: odśwież agregaty po zmianie clients/leads. Zwraca funkcję odsubskrybowania. */
export function subscribeTeam(onChange: () => void): () => void {
  const ch = supabase
    .channel('team-pipeline')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, onChange)
    .subscribe()
  return () => {
    void supabase.removeChannel(ch)
  }
}

/* ── B13 front: Umowy/Prowizje (v_commission_totals + v_user_stats, RLS) ── */
export interface UserStats {
  userId: string
  contractsAllTime: number
  mmAllTime: number
  monthContracts: number
  monthMm: number
  ownTranchesTotal: number
  ownTranchesPaid: number
  ownTranchesInPlay: number
  overrideIncomeTotal: number
}
export interface CommissionRow {
  id: string
  advisorId: string
  mmNetto: number
  rate: number
  contractDate: string | null
  mmApproved: boolean
  totalTranches: number
  totalPaid: number
  totalInPlay: number
  t1Amount: number | null
  t1DueDate: string | null
  t1Paid: boolean | null
  t2Amount: number | null
  t2DueDate: string | null
  t2Paid: boolean | null
  overrideTotal: number
}
export interface CommissionMeta {
  id: string
  clientId: string | null
  product: string | null
}

const num = (v: unknown) => Number(v ?? 0)

export async function getMyStats(userId: string): Promise<UserStats | null> {
  const { data, error } = await supabase
    .from('v_user_stats')
    .select(
      'user_id, contracts_all_time, mm_all_time, month_contracts, month_mm, own_tranches_total, own_tranches_paid, own_tranches_in_play, override_income_total',
    )
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const o = rawRepo.fromDb<UserStats>('v_user_stats', data)
  return {
    ...o,
    contractsAllTime: num(o.contractsAllTime),
    mmAllTime: num(o.mmAllTime),
    monthContracts: num(o.monthContracts),
    monthMm: num(o.monthMm),
    ownTranchesTotal: num(o.ownTranchesTotal),
    ownTranchesPaid: num(o.ownTranchesPaid),
    ownTranchesInPlay: num(o.ownTranchesInPlay),
    overrideIncomeTotal: num(o.overrideIncomeTotal),
  }
}

export async function listCommissions(): Promise<CommissionRow[]> {
  const { data, error } = await supabase.from('v_commission_totals').select('*')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => {
    const o = rawRepo.fromDb<CommissionRow>('v_commission_totals', r)
    return {
      ...o,
      mmNetto: num(o.mmNetto),
      rate: num(o.rate),
      totalTranches: num(o.totalTranches),
      totalPaid: num(o.totalPaid),
      totalInPlay: num(o.totalInPlay),
      t1Amount: o.t1Amount == null ? null : num(o.t1Amount),
      t2Amount: o.t2Amount == null ? null : num(o.t2Amount),
      overrideTotal: num(o.overrideTotal),
    }
  })
}

export async function listCommissionMeta(): Promise<CommissionMeta[]> {
  return repo.list<CommissionMeta>('commissions')
}

/* Ranking: statystyki wszystkich widocznych osób (v_user_stats, RLS pytającego). */
export async function listTeamStats(): Promise<UserStats[]> {
  const { data, error } = await supabase
    .from('v_user_stats')
    .select('user_id, contracts_all_time, mm_all_time, month_contracts, month_mm, own_tranches_total, own_tranches_paid, own_tranches_in_play, override_income_total')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => {
    const o = rawRepo.fromDb<UserStats>('v_user_stats', r)
    return {
      ...o,
      contractsAllTime: num(o.contractsAllTime), mmAllTime: num(o.mmAllTime),
      monthContracts: num(o.monthContracts), monthMm: num(o.monthMm),
      ownTranchesTotal: num(o.ownTranchesTotal), ownTranchesPaid: num(o.ownTranchesPaid),
      ownTranchesInPlay: num(o.ownTranchesInPlay), overrideIncomeTotal: num(o.overrideIncomeTotal),
    }
  })
}

/* ── Aktualności (news) ── */
export interface News {
  id: string
  authorId: string | null
  scope: string
  title: string | null
  content: string | null
  pinned: boolean
  priority: string | null
  createdAt: string
}
export async function listNews(): Promise<News[]> {
  return repo.list<News>('news')
}

/* ── B9: Szkolenia + baza wiedzy (materials / qa_items / tests / test_attempts) ── */
export interface Material {
  id: string
  type: string // html | video | link
  title: string | null
  cat: string | null
  description: string | null
  content: string | null
  url: string | null
}
export interface QaItem {
  id: string
  cat: string | null
  q: string | null
  a: string | null // html
  tip: string | null
}
export interface TestMeta {
  id: string
  title: string | null
  description: string | null
  passingScore: number | null
  required: boolean
  active: boolean
}
export interface TestAttempt {
  id: string
  testId: string
  userId: string
  score: number | null
  passed: boolean
  createdAt: string
}

export async function listMaterials(): Promise<Material[]> {
  return repo.list<Material>('materials')
}

/* Zapis/usuwanie materiału — RLS dopuszcza tylko admina (materials write=admin, B1.4 §4.7). */
export async function createMaterial(m: {
  type: string
  title: string
  cat: string | null
  description: string | null
  content: string | null
  url: string | null
}): Promise<Material> {
  return repo.create<Material>('materials', m)
}
export async function deleteMaterial(id: string): Promise<void> {
  return repo.remove('materials', id)
}
export async function listQaItems(): Promise<QaItem[]> {
  return repo.list<QaItem>('qaItems')
}
/* Testy BEZ kolumny `questions` — nie wysyłamy poprawnych odpowiedzi do przeglądarki
 * (ocena pójdzie serwerowo w kolejnym kroku B9). */
export async function listTestsMeta(): Promise<TestMeta[]> {
  const { data, error } = await supabase
    .from('tests')
    .select('id, title, description, passing_score, required, active')
    .eq('active', true)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => rawRepo.fromDb<TestMeta>('tests', r))
}
export async function listMyTestAttempts(userId: string): Promise<TestAttempt[]> {
  return repo.list<TestAttempt>('testAttempts', { userId })
}

export interface TestQuestion {
  id: string
  text: string
  type: string // single | multi
  options: { id: string; text: string }[]
}
export interface TestFull extends TestMeta {
  questions: TestQuestion[]
}
export interface TestResult {
  score: number
  passed: boolean
  correct: number
  total: number
}

/* Pełny test BEZ poprawnych odpowiedzi (widok v_tests_public). */
export async function getTestPublic(id: string): Promise<TestFull> {
  const { data, error } = await supabase.from('v_tests_public').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return rawRepo.fromDb<TestFull>('v_tests_public', data)
}

/* Ocena SERWEROWA (RPC submit_test) — zwraca wynik i zapisuje podejście. */
export async function submitTest(
  testId: string,
  answers: Record<string, string[]>,
): Promise<TestResult> {
  const { data, error } = await supabase.rpc('submit_test', {
    p_test_id: testId,
    p_answers: answers,
  })
  if (error) throw new Error(error.message)
  return data as TestResult
}

/* ── ACT.1: log aktywności (widok v_activity nad events, RLS pytającego) ── */
export interface ActivityRow {
  id: string
  createdAt: string
  type: string
  stage: number | null
  note: string | null
  userId: string | null
  userFirst: string | null
  userLast: string | null
  clientId: string | null
  clientFirst: string | null
  clientLast: string | null
}

export async function listActivity(limit = 60): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from('v_activity')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => rawRepo.fromDb<ActivityRow>('v_activity', r))
}

export function subscribeActivity(onChange: () => void): () => void {
  const ch = supabase
    .channel('activity')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, onChange)
    .subscribe()
  return () => {
    void supabase.removeChannel(ch)
  }
}

/* ── B12.3: raport miesięczny struktury (cel vs realizacja) — widok v_team_month_report ── */
export interface MonthReportRow {
  userId: string
  firstName: string
  lastName: string
  role: string
  managerId: string | null
  goalMm: number | null
  goalContracts: number | null
  actualMm: number
  actualContracts: number
}

export async function listMonthReport(): Promise<MonthReportRow[]> {
  const { data, error } = await supabase.from('v_team_month_report').select('*')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => {
    const o = rawRepo.fromDb<MonthReportRow>('v_team_month_report', r)
    return {
      ...o,
      goalMm: o.goalMm == null ? null : Number(o.goalMm),
      goalContracts: o.goalContracts == null ? null : Number(o.goalContracts),
      actualMm: Number(o.actualMm),
      actualContracts: Number(o.actualContracts),
    }
  })
}

/* Realtime: odśwież raport po zmianie celu (goals) lub naliczeniu prowizji (commissions). */
export function subscribeReports(onChange: () => void): () => void {
  const ch = supabase
    .channel('month-report')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'commissions' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, onChange)
    .subscribe()
  return () => {
    void supabase.removeChannel(ch)
  }
}

export interface Goal {
  id: string
  userId: string
  period: string // month | quarter | year
  periodStart: string // date 'YYYY-MM-DD'
  metricType: string // contracts | mm
  target: number | null
  setBy: string | null
  notes: string | null
}

export async function listGoals(userId: string): Promise<Goal[]> {
  return repo.list<Goal>('goals', { userId })
}

/* Cel = osobny wiersz per (user, period, periodStart, metricType) — unikat w bazie.
 * Gate B12.1 najpierw sprawdza brakujące, więc tu prosty insert / update targetu. */
export async function createGoal(g: {
  userId: string
  period: string
  periodStart: string
  metricType: string
  target: number
  setBy: string
}): Promise<Goal> {
  return repo.create<Goal>('goals', { ...g, notes: '' })
}

export async function updateGoalTarget(id: string, target: number): Promise<Goal> {
  return repo.update<Goal>('goals', id, { target })
}
