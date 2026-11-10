import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
export const TRADES = ["Electrician", "Plumber", "AC technician", "Carpenter", "Mechanic"];
export const AREAS = ["G-9", "G-10", "F-10", "I-8", "Satellite Town", "Saddar"];
export function openDatabase(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('worker','customer')));
    CREATE TABLE IF NOT EXISTS account_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id), display_name TEXT NOT NULL, bio TEXT NOT NULL, area TEXT NOT NULL, published INTEGER NOT NULL CHECK(published IN (0,1)));
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS workers(user_id TEXT PRIMARY KEY REFERENCES users(id), name TEXT NOT NULL, trade TEXT NOT NULL, years_experience INTEGER, services TEXT NOT NULL, areas TEXT NOT NULL, manual_available INTEGER NOT NULL DEFAULT 1, language TEXT NOT NULL DEFAULT 'en');
    CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES users(id), worker_id TEXT NOT NULL REFERENCES workers(user_id), area TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'requested', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES requests(id), sender_id TEXT NOT NULL REFERENCES users(id), body TEXT, audio_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES requests(id), version INTEGER NOT NULL, scope TEXT NOT NULL, price_pkr INTEGER NOT NULL CHECK(price_pkr >= 0), materials_included INTEGER NOT NULL, UNIQUE(request_id, version));
    CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY, request_id TEXT UNIQUE NOT NULL REFERENCES requests(id), proposal_id TEXT NOT NULL REFERENCES proposals(id), customer_id TEXT NOT NULL REFERENCES users(id), worker_id TEXT NOT NULL REFERENCES workers(user_id), status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','in_progress','completed','cancelled')), worker_marked_done_at TEXT, completed_at TEXT, idempotency_key TEXT UNIQUE NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_booking ON bookings(worker_id) WHERE status IN ('confirmed','in_progress');
    CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY, booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id), customer_id TEXT NOT NULL REFERENCES users(id), worker_id TEXT NOT NULL REFERENCES workers(user_id), rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), feedback TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS audio(id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), request_id TEXT REFERENCES requests(id), mime TEXT NOT NULL, data BLOB NOT NULL);
  `);
  const audioColumns = db
    .prepare("PRAGMA table_info(audio)")
    .all()
    .map((column) => column.name);
  if (!audioColumns.includes("purpose"))
    db.exec("ALTER TABLE audio ADD COLUMN purpose TEXT NOT NULL DEFAULT 'profile'");
  const reviewColumns = db
    .prepare("PRAGMA table_info(reviews)")
    .all()
    .map((column) => column.name);
  if (!reviewColumns.includes("audio_id"))
    db.exec("ALTER TABLE reviews ADD COLUMN audio_id TEXT REFERENCES audio(id)");
  if (!reviewColumns.includes("tags"))
    db.exec("ALTER TABLE reviews ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
  return db;
}
