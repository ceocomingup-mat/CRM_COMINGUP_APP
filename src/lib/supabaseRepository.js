/* ============================================================================
 *  supabaseRepository.js  —  CRM ComingUP, zadanie B1.2
 * ----------------------------------------------------------------------------
 *  Warstwa danych dla Części B (port React+Vite+TS, B4). Zastępuje App.Data
 *  (localStorage) prawdziwą bazą Supabase/Postgres.
 *
 *  DECYZJA (S213, DECISIONS.md): forma = moduł standalone (ESM); API = ASYNC.
 *  Kształt API jest 1:1 w NAZWACH metod jak App.Data (list/get/create/update/
 *  delete/count/query/subscribe/onAny), ale każda zwraca Promise — zgodnie z
 *  naturą Supabase i React (await / react-query / realtime). Stara, synchron.
 *  fasada localStorage NIE jest odtwarzana (B4 pisze wywołania od zera).
 *
 *  Model kanoniczny JS = camelCase kolumn bazy (advisor_id→advisorId,
 *  mm_netto→mmNetto, stage_order→stageOrder). Zapis dodatkowo PRZYJMUJE stare
 *  aliasy (masaMarzy, mm, order) dla wygody; odczyt zwraca zawsze camelCase.
 *
 *  Źródło schematu: B1.1_schema.sql + K4_Mapa_Migracji_Schema.md (K4.1).
 *  Połączenie: B1.1_Supabase_Connection.md.
 *
 *  UWAGI (otwarte → DECISIONS / kolejne zadania):
 *   • delete() = TWARDY DELETE — schemat B1.1 nie ma kolumn deleted_at
 *     (soft-delete odrzucony w K4.2). App.Data robił soft (_deleted:true).
 *   • Pola wyliczane (users.stats, goals.current, sumy prowizji) pochodzą z
 *     widoków v_user_stats / v_commission_totals — patrz helpery userStats()/
 *     commissionTotals(); pełny silnik = B13.
 *   • RLS jeszcze NIE włączony (B1.4) — publishable key ma teraz pełny dostęp.
 *   • Auth (auth_user_id) podłącza B2; tu repo działa jako klient anon.
 * ========================================================================== */

import { createClient } from '@supabase/supabase-js';

/* ── Dane połączenia (publiczne, bezpieczne do frontu po RLS) ─────────────── */
export const SUPABASE_URL = 'https://kkltdvzxkecqzfczkmeo.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_c9kt3uCcypq1N0Jhga04wQ_x577IwzA';

/* ── Mapa: encja (JS, App.Data) → tabela (Postgres) ──────────────────────── */
export const TABLES = {
  users: 'users',
  leads: 'leads',
  clients: 'clients',
  commissions: 'commissions',
  tasks: 'tasks',
  notes: 'notes',
  events: 'events',
  goals: 'goals',
  news: 'news',
  notifications: 'notifications',
  files: 'files',
  szkoleniaCats: 'training_categories',
  materials: 'materials',
  offices: 'offices',
  officeRankingSnapshots: 'office_ranking_snapshots',
  calendarEvents: 'calendar_events',
  pendingChanges: 'pending_changes',
  qaItems: 'qa_items',
  tests: 'tests',
  testAttempts: 'test_attempts',
  areas: 'areas',
  contests: 'contests',
  rankDefs: 'rank_defs',
  stages: 'stages',
  reports: 'reports',
  // tabele-dzieci (rozbicie obiektów zagnieżdżonych)
  clientStageHistory: 'client_stage_history',
  commissionTranches: 'commission_tranches',
  commissionOverrides: 'commission_overrides',
  // feature-keys (gamifikacja / cache)
  geoCache: 'geo_cache',
  userBadges: 'user_badges',
  userStreaks: 'user_streaks',
  userGamification: 'user_gamification',
};

/* ── Dozwolone kolumny per tabela (snake_case) — źródło: B1.1_schema.sql ──── */
/*    Zapis odrzuca klucze spoza listy (np. JS-only: areas, homeAddress, s1_*,
 *    meetingDate — przeniesione do checklist jsonb / pominięte w K4.1).        */
const COLUMNS = {
  users: ['id','legacy_id','role','first_name','last_name','email','phone','auth_user_id','rank','rank_pct','manager_id','office_id','provinces','avatar','home_address','home_lat','home_lng','rank_promoted_at','rank_below_since','created_at','updated_at'],
  leads: ['id','legacy_id','first_name','last_name','phone','email','province','city','address','source','status','advisor_id','created_at','updated_at'],
  clients: ['id','legacy_id','lead_id','advisor_id','first_name','last_name','phone','email','address','city','province','source','current_stage','mm_netto','mm_status','product','contract_date','status','lost_reason','lat','lng','photos','referrals_given','referred_by_client_id','checklist','created_at','updated_at'],
  client_stage_history: ['id','client_id','stage','entered_at','completed_at'],
  notes: ['id','client_id','author_id','content','created_at','updated_at'],
  commissions: ['id','legacy_id','client_id','advisor_id','mm_netto','mm_approved','rate','product','contract_date','created_at','updated_at'],
  commission_tranches: ['id','commission_id','tranche_no','amount','due_date','paid','paid_at'],
  commission_overrides: ['id','commission_id','user_id','rank','rate','sub_rate','mm_netto','amount'],
  events: ['id','legacy_id','client_id','user_id','type','stage','note','created_at'],
  tasks: ['id','legacy_id','assigned_to','assigned_by','client_id','title','notes','due_date','priority','status','created_at','updated_at'],
  goals: ['id','legacy_id','user_id','period','period_start','metric_type','target','set_by','notes','created_at','updated_at'],
  news: ['id','author_id','scope','office_id','title','content','pinned','priority','created_at','updated_at'],
  notifications: ['id','user_id','type','title','body','read','link_entity','link_id','created_at','updated_at'],
  files: ['id','legacy_id','uploaded_by','name','category','type','size','description','storage_path','sort_order','created_at','updated_at'],
  training_categories: ['id','legacy_id','name','icon','sort_order','created_at','updated_at'],
  materials: ['id','type','title','cat','description','content','url','created_at','updated_at'],
  offices: ['id','legacy_id','name','city','address','created_at','updated_at'],
  office_ranking_snapshots: ['id','office_id','period','payload','created_at'],
  calendar_events: ['id','legacy_id','user_id','client_id','title','type','start_ts','end_ts','all_day','location','notes','scope','office_id','created_at','updated_at'],
  pending_changes: ['id','legacy_id','user_id','field','old_value','new_value','status','reviewed_at','reviewed_by','created_at'],
  qa_items: ['id','legacy_id','cat','q','a','tip','created_at','updated_at'],
  tests: ['id','legacy_id','title','description','passing_score','required','active','questions','created_at','updated_at'],
  test_attempts: ['id','test_id','user_id','score','passed','answers','created_at'],
  areas: ['id','legacy_id','name','city','province','description','created_at','updated_at'],
  contests: ['id','legacy_id','title','metric','period','start_ts','end_ts','scope','reward_badge','reward_cash','reward_text','status','winner_id','winner_value','closed_at','post_news','created_by','created_at','updated_at'],
  rank_defs: ['id','legacy_id','league','name','min_contracts','pct','basis','req','req_label'],
  stages: ['id','stage_order','name','description','icon','required_fields','mm_required','can_lose','can_revert','checklist'],
  reports: ['id','type','period','payload','created_by','created_at'],
  geo_cache: ['id','query','lat','lng','provider','payload','cached_at'],
  user_badges: ['id','user_id','badge_key','earned_at'],
  user_streaks: ['user_id','streak_count','last_active'],
  user_gamification: ['user_id','snajper','data','updated_at'],
};

/* ── Aliasy nazw pól (JS → kolumna) — wyjątki spoza reguły camel↔snake ────── */
/*    Stosowane TYLKO przy zapisie/filtrze (wejście). Odczyt = czysty camelCase. */
const ALIASES = {
  clients: { masaMarzy: 'mm_netto' },     // K2: jedno pole MM
  commissions: { mm: 'mm_netto' },        // K2: snapshot MM (był 'mm')
  stages: { order: 'stage_order' },       // 'order' słowo zarezerwowane
};

/* ── Klucze nigdy nie zapisywane (wyliczane / techniczne) ─────────────────── */
const STRIP = new Set(['stats', 'current', 'password']); // + każdy z prefiksem '_'

/* ── Tabele z kluczem głównym innym niż 'id' ──────────────────────────────── */
const PK = { user_streaks: 'user_id', user_gamification: 'user_id' };

/* ── Konwersja nazw ───────────────────────────────────────────────────────── */
const camelToSnake = (s) => s.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
const snakeToCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

function tableFor(entity) {
  const t = TABLES[entity];
  if (!t) throw new Error(`[Repo] Nieznana encja: "${entity}"`);
  return t;
}

/* Nazwa kolumny dla klucza JS w danej tabeli (alias → camel→snake). */
function colFor(table, key) {
  const aliasMap = ALIASES[Object.keys(TABLES).find((e) => TABLES[e] === table)] || {};
  return aliasMap[key] || camelToSnake(key);
}

/* obiekt JS → wiersz DB (snake_case, tylko dozwolone kolumny). */
export function toDb(entity, obj) {
  const table = TABLES[entity] || entity;
  const allow = COLUMNS[table] || null;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;          // pola techniczne (_deleted, _autoMtg…)
    if (STRIP.has(k)) continue;               // wyliczane (stats, current…)
    const col = colFor(table, k);
    if (allow && !allow.includes(col)) continue; // klucz spoza schematu → pomiń
    out[col] = v;
  }
  HOOKS[table]?.toDb?.(out, obj);             // transformacje per-tabela
  return out;
}

/* wiersz DB → obiekt JS (camelCase). */
export function fromDb(entity, row) {
  if (!row) return null;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[snakeToCamel(k)] = v;
  return out;
}

/* ── Hooki per-tabela (np. rozbicie scope 'office:XX' → scope + office_id) ── */
const HOOKS = {
  news: { toDb: splitScope },
  calendar_events: { toDb: splitScope },
};
function splitScope(out) {
  if (typeof out.scope === 'string' && out.scope.includes(':')) {
    const [scope, ref] = out.scope.split(':');
    out.scope = scope;                        // 'office'
    if (ref && out.office_id == null) out.office_id = ref; // oczekiwany UUID office
  }
}

/* ============================================================================
 *  SupabaseRepository — async, kształt API jak App.Data
 * ========================================================================== */
export class SupabaseRepository {
  constructor() {
    this.client = null;
    this._channels = new Set();
  }

  /* init() — utwórz klienta (singleton). opts: {url, key, fetch}. */
  init(opts = {}) {
    if (this.client) return this.client;
    this.client = createClient(
      opts.url || SUPABASE_URL,
      opts.key || SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: true, autoRefreshToken: true }, ...(opts.options || {}) }
    );
    return this.client;
  }
  _c() {
    if (!this.client) this.init();
    return this.client;
  }

  /* Lekki ping — sprawdza łączność i dostęp (count na rank_defs). */
  async ping() {
    const { error, count } = await this._c()
      .from('rank_defs').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return { ok: true, rankDefs: count };
  }

  /* list(entity, filters={}) → Promise<rows[]>  (eq; wartość-tablica → .in) */
  async list(entity, filters = {}) {
    const table = tableFor(entity);
    let q = this._c().from(table).select('*');
    q = applyFilters(q, table, filters);
    const { data, error } = await q;
    if (error) throw error;
    return data.map((r) => fromDb(entity, r));
  }

  /* get(entity, id) → Promise<row|null> */
  async get(entity, id) {
    const table = tableFor(entity);
    const pk = PK[table] || 'id';
    const { data, error } = await this._c()
      .from(table).select('*').eq(pk, id).maybeSingle();
    if (error) throw error;
    return fromDb(entity, data);
  }

  /* create(entity, data) → Promise<row> */
  async create(entity, data) {
    const table = tableFor(entity);
    const { data: row, error } = await this._c()
      .from(table).insert(toDb(entity, data)).select().single();
    if (error) throw error;
    return fromDb(entity, row);
  }

  /* update(entity, id, patch) → Promise<row> */
  async update(entity, id, patch) {
    const table = tableFor(entity);
    const pk = PK[table] || 'id';
    const { data: row, error } = await this._c()
      .from(table).update(toDb(entity, patch)).eq(pk, id).select().single();
    if (error) throw error;
    return fromDb(entity, row);
  }

  /* delete(entity, id) → Promise<void>  — TWARDY DELETE (brak deleted_at) */
  async delete(entity, id) {
    const table = tableFor(entity);
    const pk = PK[table] || 'id';
    const { error } = await this._c().from(table).delete().eq(pk, id);
    if (error) throw error;
    return true;
  }
  remove(entity, id) { return this.delete(entity, id); } // alias (delete = słowo kluczowe)

  /* count(entity, filters={}) → Promise<number> */
  async count(entity, filters = {}) {
    const table = tableFor(entity);
    let q = this._c().from(table).select('*', { count: 'exact', head: true });
    q = applyFilters(q, table, filters);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  }

  /* query(entity, build) → Promise<rows[]>
   *   Async-odpowiednik App.Data.query(fn). 'build' dostaje surowy builder
   *   PostgREST (filtry na kolumnach snake_case), bo predykat JS nie poleci
   *   na serwer. Przykład:
   *     repo.query('clients', q => q.gte('contract_date', from).in('advisor_id', ids)) */
  async query(entity, build) {
    const table = tableFor(entity);
    let q = this._c().from(table).select('*');
    if (typeof build === 'function') q = build(q) || q;
    const { data, error } = await q;
    if (error) throw error;
    return data.map((r) => fromDb(entity, r));
  }

  /* subscribe(entity, cb) → unsubscribe()  (realtime postgres_changes) */
  subscribe(entity, cb) {
    const table = tableFor(entity);
    const ch = this._c()
      .channel(`rt:${table}:${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (p) => {
        try {
          cb({
            eventType: p.eventType,
            new: p.new ? fromDb(entity, p.new) : null,
            old: p.old ? fromDb(entity, p.old) : null,
          });
        } catch (e) { console.error('[Repo] subscriber error', e); }
      })
      .subscribe();
    this._channels.add(ch);
    return () => { this._c().removeChannel(ch); this._channels.delete(ch); };
  }

  /* onAny(cb) → unsubscribe()  (zmiany we wszystkich tabelach public) */
  onAny(cb) {
    const ch = this._c()
      .channel(`rt:any:${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, (p) => {
        try { cb(p.table, p.eventType, p.new, p.old); }
        catch (e) { console.error('[Repo] onAny error', e); }
      })
      .subscribe();
    this._channels.add(ch);
    return () => { this._c().removeChannel(ch); this._channels.delete(ch); };
  }

  /* Sprzątanie wszystkich kanałów realtime. */
  dispose() {
    for (const ch of this._channels) this._c().removeChannel(ch);
    this._channels.clear();
  }

  /* ── Widoki silnika prowizji (K1/B13) — read-only ──────────────────────── */
  async userStats(userId) {
    let q = this._c().from('v_user_stats').select('*');
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (error) throw error;
    const rows = data.map((r) => fromDb('users', r));
    return userId ? rows[0] || null : rows;
  }
  async commissionTotals(commissionId) {
    let q = this._c().from('v_commission_totals').select('*');
    if (commissionId) q = q.eq('id', commissionId);
    const { data, error } = await q;
    if (error) throw error;
    const rows = data.map((r) => fromDb('commissions', r));
    return commissionId ? rows[0] || null : rows;
  }

  // pomocnicze (testy / introspekcja)
  tableFor(entity) { return tableFor(entity); }
  toDb(entity, obj) { return toDb(entity, obj); }
  fromDb(entity, row) { return fromDb(entity, row); }
}

/* applyFilters — eq / .in() na kolumnach (klucz JS → snake, z aliasami). */
function applyFilters(q, table, filters) {
  for (const [k, v] of Object.entries(filters || {})) {
    const col = colFor(table, k);
    if (Array.isArray(v)) q = q.in(col, v);
    else if (v === null) q = q.is(col, null);
    else q = q.eq(col, v);
  }
  return q;
}

/* Singleton gotowy do importu w aplikacji (B4). */
export const repo = new SupabaseRepository();
export default repo;
