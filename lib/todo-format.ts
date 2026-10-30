/** Kolom yang diambil dari tabel todos (hindari select('*') agar ringan). */
export const TODO_COLUMNS = 'id, user_id, title, completed, is_deleted, created_at, updated_at';

/** Ubah baris database (snake_case) menjadi objek untuk frontend (camelCase). */
export function formatTodo(item: any) {
  return {
    id: Number(item.id),
    userId: Number(item.user_id),
    title: item.title as string,
    completed: Boolean(item.completed),
    isDeleted: Boolean(item.is_deleted),
    createdAt: item.created_at as string,
    updatedAt: item.updated_at as string,
  };
}

/** Parse query param tanggal ISO; kembalikan null jika tidak valid. */
export function parseIsoDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export const MIGRATION_HINT =
  'Pastikan migrasi SQL (migrations/001_soft_delete_and_history.sql) sudah dijalankan di Supabase.';
