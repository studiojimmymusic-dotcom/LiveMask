import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'

// Mirror of the Supabase character row we cache locally for instant, offline
// display. `thumbnail_path` holds the (signed) thumbnail URL.
export interface Character {
  id: string
  name: string
  prompt: string
  thumbnail_path?: string | null
  storage_path?: string | null
}

let db: Database.Database | null = null

function getDb(): Database.Database {
  if (!db) {
    // Persisted under the user's AppData folder so it survives app restarts.
    const dbPath = join(app.getPath('userData'), 'livemask.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.exec(`
      create table if not exists characters (
        id text primary key,
        name text not null,
        prompt text not null,
        thumbnail_path text,
        storage_path text,
        synced_at integer
      );

      create table if not exists preferences (
        key text primary key,
        value text
      );
    `)
  }
  return db
}

// --- Preferences -----------------------------------------------------------

export function getPreference(key: string): string | null {
  const database = getDb()
  const row = database.prepare('select value from preferences where key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setPreference(key: string, value: string): void {
  const database = getDb()
  database
    .prepare(
      `insert into preferences (key, value) values (?, ?)
       on conflict(key) do update set value = excluded.value`
    )
    .run(key, value)
}

// --- Character cache -------------------------------------------------------

export function getCachedCharacters(): Character[] {
  const database = getDb()
  return database
    .prepare(
      'select id, name, prompt, thumbnail_path, storage_path from characters order by synced_at desc'
    )
    .all() as Character[]
}

// Replace all cached rows in a single transaction so the cache always reflects
// the latest authoritative list from Supabase (no stale leftovers).
export function setCachedCharacters(characters: Character[]): void {
  const database = getDb()
  const now = Math.floor(Date.now() / 1000)

  const upsert = database.prepare(`
    insert into characters (id, name, prompt, thumbnail_path, storage_path, synced_at)
    values (@id, @name, @prompt, @thumbnail_path, @storage_path, @synced_at)
    on conflict(id) do update set
      name = excluded.name,
      prompt = excluded.prompt,
      thumbnail_path = excluded.thumbnail_path,
      storage_path = excluded.storage_path,
      synced_at = excluded.synced_at
  `)

  const replaceAll = database.transaction((rows: Character[]) => {
    const ids = rows.map((c) => c.id)
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',')
      database.prepare(`delete from characters where id not in (${placeholders})`).run(...ids)
    } else {
      database.prepare('delete from characters').run()
    }

    for (const row of rows) {
      upsert.run({
        id: row.id,
        name: row.name,
        prompt: row.prompt,
        thumbnail_path: row.thumbnail_path ?? null,
        storage_path: row.storage_path ?? null,
        synced_at: now
      })
    }
  })

  replaceAll(characters)
}
