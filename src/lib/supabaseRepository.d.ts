/* Typy dla przeniesionego modułu JS `supabaseRepository.js` (B1.2). */
export interface Repo {
  client: unknown
  init(opts?: { url?: string; key?: string; options?: unknown }): unknown
  ping(): Promise<{ ok: boolean; rankDefs?: number }>
  list<T = Record<string, unknown>>(entity: string, opts?: unknown): Promise<T[]>
  get<T = Record<string, unknown>>(entity: string, id: string): Promise<T | null>
  create<T = Record<string, unknown>>(entity: string, data: unknown): Promise<T>
  update<T = Record<string, unknown>>(entity: string, id: string, patch: unknown): Promise<T>
  remove(entity: string, id: string): Promise<void>
  delete(entity: string, id: string): Promise<void>
  count(entity: string, opts?: unknown): Promise<number>
  query<T = Record<string, unknown>>(entity: string, opts?: unknown): Promise<T[]>
  toDb<T = Record<string, unknown>>(entity: string, obj: unknown): T
  fromDb<T = Record<string, unknown>>(entity: string, row: unknown): T
  userStats(opts?: unknown): Promise<Record<string, unknown>[]>
  commissionTotals(opts?: unknown): Promise<Record<string, unknown>[]>
  dispose(): void
}
export const repo: Repo
export const TABLES: Record<string, string>
export const COLUMNS: Record<string, string[]>
export const SUPABASE_URL: string
export const SUPABASE_PUBLISHABLE_KEY: string
