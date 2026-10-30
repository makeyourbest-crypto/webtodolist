-- ============================================================
-- Migrasi 001: Soft delete (Sampah/Restore) + index performa
-- Aman dijalankan berulang kali (idempotent) dan TIDAK menghapus data.
-- Jalankan di Supabase > SQL Editor.
-- ============================================================

ALTER TABLE todos ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Index komposit: query per user + status sampah + rentang tanggal
CREATE INDEX IF NOT EXISTS idx_todos_perf ON todos (user_id, is_deleted, created_at DESC);
