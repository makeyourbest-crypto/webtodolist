'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Moon,
  Sun,
  RefreshCw,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Search,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  History,
} from 'lucide-react';

interface Todo {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface HistoryRow {
  createdAt: string;
  completed: boolean;
}

type Filter = 'all' | 'active' | 'completed' | 'trash';

/* ----------------------------- Helper tanggal ----------------------------- */
const HISTORY_DAYS = 30;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatLong = (d: Date) =>
  d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const formatShort = (d: Date) =>
  d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

const rangeParams = (d: Date) => {
  const from = startOfDay(d);
  const to = addDays(from, 1);
  return `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
};

export default function TodoApp() {
  const { data: session } = useSession();

  // Data
  const [todos, setTodos] = useState<Todo[]>([]); // catatan pada hari terpilih
  const [trashTodos, setTrashTodos] = useState<Todo[]>([]);
  const [trashCount, setTrashCount] = useState(0);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);

  // Status UI
  const [loading, setLoading] = useState(true);
  const [trashLoading, setTrashLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Tanggal & tampilan
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Form & edit
  const [inputTitle, setInputTitle] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Tema
  const [darkMode, setDarkMode] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dayReqId = useRef(0); // mencegah respons lama menimpa respons baru

  const isTrash = filter === 'trash';
  const isToday = !!(selectedDate && today && isSameDay(selectedDate, today));

  /* ------------------------------ Inisialisasi ------------------------------ */
  useEffect(() => {
    const now = new Date();
    setToday(startOfDay(now));
    setSelectedDate(startOfDay(now));

    const savedTheme = localStorage.getItem('todolist_theme');
    const systemPrefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : systemPrefersDark;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
    localStorage.setItem('todolist_theme', nextDark ? 'dark' : 'light');
  };

  /* -------------------------------- Fetching -------------------------------- */
  const fetchDay = useCallback(async (date: Date) => {
    const reqId = ++dayReqId.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/todos?${rangeParams(date)}`, { cache: 'no-store' });
      const data = await res.json();
      if (reqId !== dayReqId.current) return; // respons usang, abaikan

      if (data.success) {
        setTodos(data.data || []);
        setTrashCount(data.trashCount ?? 0);
        setDbError(null);
      } else {
        setDbError(data.error || 'Gagal memuat catatan dari database');
      }
    } catch (err) {
      if (reqId !== dayReqId.current) return;
      console.error('Fetch error:', err);
      setDbError('Gagal menghubungi database Supabase.');
    } finally {
      if (reqId === dayReqId.current) {
        setLoading(false);
        setRetrying(false);
      }
    }
  }, []);

  const fetchTrash = useCallback(async () => {
    setTrashLoading(true);
    try {
      const res = await fetch('/api/todos?view=trash', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setTrashTodos(data.data || []);
        setTrashCount((data.data || []).length);
        setDbError(null);
      } else {
        setDbError(data.error || 'Gagal memuat Sampah');
      }
    } catch {
      setDbError('Gagal memuat Sampah.');
    } finally {
      setTrashLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const since = addDays(startOfDay(new Date()), -(HISTORY_DAYS - 1));
      const res = await fetch(
        `/api/todos?view=history&from=${encodeURIComponent(since.toISOString())}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (data.success) {
        setHistoryRows(data.data || []);
      } else {
        setDbError(data.error || 'Gagal memuat riwayat');
      }
    } catch {
      setDbError('Gagal memuat riwayat.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Muat catatan setiap kali tanggal berganti
  useEffect(() => {
    if (selectedDate) fetchDay(selectedDate);
  }, [selectedDate, fetchDay]);

  // Lazy: Sampah hanya dimuat saat tab dibuka
  useEffect(() => {
    if (filter === 'trash') fetchTrash();
  }, [filter, fetchTrash]);

  // Lazy: Riwayat hanya dimuat saat panel dibuka
  useEffect(() => {
    if (showHistory) fetchHistory();
  }, [showHistory, fetchHistory]);

  const handleRetry = () => {
    setRetrying(true);
    if (selectedDate) fetchDay(selectedDate);
    if (isTrash) fetchTrash();
  };

  /* ---------------------------- Navigasi tanggal ---------------------------- */
  const goToDate = (d: Date) => {
    setSelectedDate(startOfDay(d));
    setEditingId(null);
    setSearchQuery('');
    if (filter === 'trash') setFilter('all');
  };
  const goPrevDay = () => selectedDate && goToDate(addDays(selectedDate, -1));
  const goNextDay = () => selectedDate && !isToday && goToDate(addDays(selectedDate, 1));
  const goToday = () => today && goToDate(today);

  /* ----------------------------- Aksi catatan ------------------------------ */
  // Tambah (Optimistic UI) — selalu dibuat di hari ini
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputTitle.trim();

    if (!trimmed) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      inputRef.current?.focus();
      return;
    }

    const tempId = Date.now();
    const optimisticTodo: Todo = {
      id: tempId,
      userId: Number(session?.user ? (session.user as any).id : 0),
      title: trimmed,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setTodos((prev) => [optimisticTodo, ...prev]);
    setInputTitle('');
    inputRef.current?.focus();

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setTodos((prev) => prev.map((t) => (t.id === tempId ? data.data : t)));
        setDbError(null);
      } else {
        setTodos((prev) => prev.filter((t) => t.id !== tempId));
        setDbError(data.error || 'Gagal menambahkan catatan');
      }
    } catch (err) {
      console.error('Add todo error:', err);
      setTodos((prev) => prev.filter((t) => t.id !== tempId));
      setDbError('Gagal menambahkan catatan. Pastikan koneksi database aktif.');
    }
  };

  // Centang selesai
  const handleToggleTodo = async (todo: Todo) => {
    const nextCompleted = !todo.completed;
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, completed: nextCompleted } : t)));

    const rollback = () =>
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, completed: todo.completed } : t)));

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      const data = await res.json();
      if (!data.success) {
        rollback();
        setDbError(data.error || 'Gagal mengubah status catatan');
      }
    } catch {
      rollback();
      setDbError('Gagal mengubah status catatan.');
    }
  };

  // Hapus -> pindah ke Sampah (soft delete)
  const handleDeleteTodo = async (todo: Todo) => {
    const backupTodos = todos;
    const backupTrash = trashTodos;
    const backupCount = trashCount;

    setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    setTrashTodos((prev) => [{ ...todo, isDeleted: true, updatedAt: new Date().toISOString() }, ...prev]);
    setTrashCount((c) => c + 1);

    const rollback = () => {
      setTodos(backupTodos);
      setTrashTodos(backupTrash);
      setTrashCount(backupCount);
    };

    try {
      const res = await fetch(`/api/todos/${todo.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        rollback();
        setDbError(data.error || 'Gagal menghapus catatan');
      }
    } catch {
      rollback();
      setDbError('Gagal menghapus catatan.');
    }
  };

  // Restore dari Sampah
  const handleRestoreTodo = async (todo: Todo) => {
    const backupTodos = todos;
    const backupTrash = trashTodos;
    const backupCount = trashCount;

    setTrashTodos((prev) => prev.filter((t) => t.id !== todo.id));
    setTrashCount((c) => Math.max(0, c - 1));
    // Jika catatan berasal dari hari yang sedang dilihat, langsung tampilkan kembali
    if (selectedDate && todo.createdAt && isSameDay(new Date(todo.createdAt), selectedDate)) {
      setTodos((prev) => [{ ...todo, isDeleted: false }, ...prev]);
    }

    const rollback = () => {
      setTodos(backupTodos);
      setTrashTodos(backupTrash);
      setTrashCount(backupCount);
    };

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true }),
      });
      const data = await res.json();
      if (!data.success) {
        rollback();
        setDbError(data.error || 'Gagal mengembalikan catatan');
      }
    } catch {
      rollback();
      setDbError('Gagal mengembalikan catatan.');
    }
  };

  // Hapus permanen satu catatan di Sampah
  const handlePermanentDelete = async (todo: Todo) => {
    if (!window.confirm(`Hapus permanen "${todo.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;

    const backupTrash = trashTodos;
    const backupCount = trashCount;
    setTrashTodos((prev) => prev.filter((t) => t.id !== todo.id));
    setTrashCount((c) => Math.max(0, c - 1));

    const rollback = () => {
      setTrashTodos(backupTrash);
      setTrashCount(backupCount);
    };

    try {
      const res = await fetch(`/api/todos/${todo.id}?permanent=true`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        rollback();
        setDbError(data.error || 'Gagal menghapus permanen');
      }
    } catch {
      rollback();
      setDbError('Gagal menghapus permanen.');
    }
  };

  // Kosongkan Sampah (permanen)
  const handleEmptyTrash = async () => {
    if (trashTodos.length === 0) return;
    if (
      !window.confirm(
        `Hapus permanen semua ${trashTodos.length} catatan di Sampah? Tindakan ini tidak bisa dibatalkan.`
      )
    )
      return;

    const backupTrash = trashTodos;
    const backupCount = trashCount;
    setTrashTodos([]);
    setTrashCount(0);

    try {
      const res = await fetch('/api/todos?scope=trash', { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setTrashTodos(backupTrash);
        setTrashCount(backupCount);
        setDbError(data.error || 'Gagal mengosongkan Sampah');
      }
    } catch {
      setTrashTodos(backupTrash);
      setTrashCount(backupCount);
      setDbError('Gagal mengosongkan Sampah.');
    }
  };

  // Pindahkan semua catatan selesai (hari terpilih) ke Sampah
  const handleClearCompleted = async () => {
    if (!selectedDate) return;
    const completed = todos.filter((t) => t.completed);
    if (completed.length === 0) return;

    const backupTodos = todos;
    const backupTrash = trashTodos;
    const backupCount = trashCount;

    setTodos((prev) => prev.filter((t) => !t.completed));
    setTrashTodos((prev) => [
      ...completed.map((t) => ({ ...t, isDeleted: true, updatedAt: new Date().toISOString() })),
      ...prev,
    ]);
    setTrashCount((c) => c + completed.length);

    const rollback = () => {
      setTodos(backupTodos);
      setTrashTodos(backupTrash);
      setTrashCount(backupCount);
    };

    try {
      const res = await fetch(`/api/todos?scope=completed&${rangeParams(selectedDate)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) {
        rollback();
        setDbError(data.error || 'Gagal memindahkan catatan selesai');
      }
    } catch {
      rollback();
      setDbError('Gagal memindahkan catatan selesai.');
    }
  };

  // Edit inline
  const handleStartEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
  };
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };
  const handleSaveEdit = async (id: number) => {
    const trimmed = editingTitle.trim();
    const original = todos.find((t) => t.id === id);
    if (!trimmed || (original && original.title === trimmed)) {
      setEditingId(null);
      return;
    }

    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, title: trimmed } : t)));
    setEditingId(null);

    const rollback = () => {
      if (original) {
        setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, title: original.title } : t)));
      }
    };

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      const data = await res.json();
      if (!data.success) {
        rollback();
        setDbError(data.error || 'Gagal memperbarui judul catatan');
      }
    } catch {
      rollback();
      setDbError('Gagal memperbarui catatan.');
    }
  };

  /* ------------------------------ Nilai turunan ----------------------------- */
  const visibleTodos = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const source = isTrash ? trashTodos : todos;
    return source.filter((item) => {
      const matchesFilter =
        filter === 'all' || filter === 'trash'
          ? true
          : filter === 'active'
          ? !item.completed
          : item.completed;
      return matchesFilter && item.title.toLowerCase().includes(q);
    });
  }, [todos, trashTodos, filter, isTrash, searchQuery]);

  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const activeCount = totalCount - completedCount;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // Ringkasan riwayat per hari (dihitung di klien dengan zona waktu pengguna)
  const historySummary = useMemo(() => {
    const map = new Map<string, { date: Date; total: number; done: number }>();
    for (const row of historyRows) {
      const d = startOfDay(new Date(row.createdAt));
      const key = dayKey(d);
      const entry = map.get(key) || { date: d, total: 0, done: 0 };
      entry.total += 1;
      if (row.completed) entry.done += 1;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [historyRows]);

  const tabClass = (active: boolean) =>
    `flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
      active
        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
        : 'hover:text-slate-900 dark:hover:text-white'
    }`;

  /* --------------------------------- Render --------------------------------- */
  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex items-start justify-center">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl shadow-indigo-500/5 dark:shadow-black/40 p-6 sm:p-8 space-y-6 transition-all duration-300">
        {/* ============================ HEADER ============================ */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Catatan harian
            </h1>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{today ? formatLong(today) : 'Hari ini'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {session?.user && (
              <div className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span
                  className="max-w-[100px] truncate"
                  title={session.user.name || session.user.email || 'Pengguna'}
                >
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="p-1 hover:text-rose-600 dark:hover:text-rose-400 rounded transition"
                  title="Keluar (Logout)"
                  aria-label="Keluar"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={() => setShowHistory((v) => !v)}
              className={`p-2.5 rounded-xl border transition ${
                showHistory
                  ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
              aria-label="Riwayat"
              title="Riwayat harian"
            >
              <History className="w-4 h-4" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-700 transition"
              aria-label="Ganti Tema"
              title="Ganti Tema"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* ========================= ERROR BANNER ========================= */}
        {dbError && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 space-y-2 text-sm animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Pemberitahuan Database</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">{dbError}</p>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Menghubungkan...' : 'Coba Hubungkan Ulang'}
              </button>
            </div>
          </div>
        )}

        {/* ========================= PANEL RIWAYAT ======================== */}
        {showHistory && (
          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Riwayat {HISTORY_DAYS} hari terakhir
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Tutup riwayat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {historyLoading && historyRows.length === 0 ? (
              <div className="py-4 flex items-center justify-center text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
              </div>
            ) : historySummary.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Belum ada riwayat catatan.</p>
            ) : (
              <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {historySummary.map((h) => {
                  const pct = Math.round((h.done / h.total) * 100);
                  const active = selectedDate && isSameDay(h.date, selectedDate);
                  return (
                    <li key={dayKey(h.date)}>
                      <button
                        type="button"
                        onClick={() => {
                          goToDate(h.date);
                          setFilter('all');
                          setShowHistory(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border transition ${
                          active
                            ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {today && isSameDay(h.date, today) ? 'Hari ini' : formatShort(h.date)}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {h.done}/{h.total} selesai · {pct}%
                          </span>
                        </div>
                        <div className="mt-1.5 w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* ======================= NAVIGASI TANGGAL ======================= */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrevDay}
            disabled={!selectedDate}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition disabled:opacity-40"
            aria-label="Hari sebelumnya"
            title="Hari sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 text-center">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {selectedDate ? (isToday ? 'Hari ini' : formatShort(selectedDate)) : '...'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {selectedDate ? formatLong(selectedDate) : ''}
            </p>
          </div>

          {!isToday && (
            <button
              type="button"
              onClick={goToday}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-950 transition"
            >
              Hari ini
            </button>
          )}

          <button
            type="button"
            onClick={goNextDay}
            disabled={!selectedDate || isToday}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Hari berikutnya"
            title="Hari berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ========================= PROGRESS CARD ======================== */}
        {!isTrash && (
          <section className="bg-gradient-to-br from-indigo-50/70 to-blue-50/50 dark:from-indigo-950/30 dark:to-slate-800/50 border border-indigo-100/80 dark:border-indigo-900/50 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                Progres Pengerjaan
              </span>
              <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                {progressPercent}%
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {completedCount} dari {totalCount} catatan selesai
              </span>
              <span>
                {activeCount === 0 && totalCount > 0 ? 'Semua tuntas! 🎉' : `${activeCount} tersisa`}
              </span>
            </div>
          </section>
        )}

        {/* ========================== FORM TAMBAH ========================= */}
        {!isTrash &&
          (isToday ? (
            <form onSubmit={handleAddTodo} className="relative">
              <div
                className={`flex items-center gap-2 p-1.5 pl-4 rounded-2xl border-2 bg-slate-50 dark:bg-slate-800/80 transition-all ${
                  isShaking
                    ? 'border-rose-500 animate-shake'
                    : 'border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 dark:focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10'
                }`}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  placeholder="Tulis catatan atau tugas baru..."
                  className="w-full bg-transparent border-none outline-none text-sm sm:text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  maxLength={255}
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-500/25 shrink-0"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span className="hidden sm:inline">Tambah</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              <span>Kamu sedang melihat catatan hari lain. Catatan baru hanya bisa dibuat untuk hari ini.</span>
              <button
                type="button"
                onClick={goToday}
                className="shrink-0 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Ke hari ini
              </button>
            </div>
          ))}

        {/* ======================== FILTER & SEARCH ======================= */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 overflow-x-auto">
              <button type="button" onClick={() => setFilter('all')} className={tabClass(filter === 'all')}>
                Semua ({totalCount})
              </button>
              <button type="button" onClick={() => setFilter('active')} className={tabClass(filter === 'active')}>
                Aktif ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('completed')}
                className={tabClass(filter === 'completed')}
              >
                Selesai ({completedCount})
              </button>
              <button type="button" onClick={() => setFilter('trash')} className={tabClass(filter === 'trash')}>
                <span className="inline-flex items-center gap-1">
                  <Trash2 className="w-3 h-3" />
                  Sampah ({trashCount})
                </span>
              </button>
            </div>

            {!isTrash && completedCount > 0 && (
              <button
                type="button"
                onClick={handleClearCompleted}
                className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline transition self-end sm:self-auto px-2 py-1"
                title="Pindahkan catatan selesai ke Sampah"
              >
                Bersihkan Selesai ({completedCount})
              </button>
            )}
            {isTrash && trashTodos.length > 0 && (
              <button
                type="button"
                onClick={handleEmptyTrash}
                className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline transition self-end sm:self-auto px-2 py-1"
              >
                Kosongkan Sampah
              </button>
            )}
          </div>

          {(isTrash ? trashTodos.length : totalCount) > 2 && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari catatan..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {isTrash && (
            <p className="text-[11px] text-slate-400">
              Catatan di Sampah bisa dikembalikan kapan saja. Hapus permanen tidak bisa dibatalkan.
            </p>
          )}
        </div>

        {/* ========================== DAFTAR CATATAN ====================== */}
        <div className="space-y-2">
          {(isTrash ? trashLoading && trashTodos.length === 0 : loading && todos.length === 0) ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-xs">{isTrash ? 'Memuat Sampah...' : 'Memuat catatan...'}</p>
            </div>
          ) : visibleTodos.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-500">
                {isTrash ? <Trash2 className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {searchQuery
                  ? 'Tidak ada catatan yang cocok'
                  : isTrash
                  ? 'Sampah kosong'
                  : filter === 'active'
                  ? 'Semua catatan aktif sudah beres!'
                  : filter === 'completed'
                  ? 'Belum ada catatan selesai'
                  : isToday
                  ? 'Belum ada catatan hari ini'
                  : 'Tidak ada catatan di hari ini'}
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {searchQuery
                  ? 'Coba gunakan kata kunci pencarian yang lain.'
                  : isTrash
                  ? 'Catatan yang kamu hapus akan muncul di sini.'
                  : isToday
                  ? 'Tulis catatan atau tugas pertamamu di atas!'
                  : 'Gunakan panah untuk melihat hari lain, atau buka Riwayat.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {visibleTodos.map((todo) => {
                const isEditing = !isTrash && editingId === todo.id;

                return (
                  <li
                    key={todo.id}
                    className={`group flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all ${
                      isTrash || todo.completed
                        ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800/60'
                        : 'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-700/80 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isTrash ? (
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                            todo.completed
                              ? 'bg-slate-400 border-slate-400 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {todo.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleTodo(todo)}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
                            todo.completed
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                              : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400'
                          }`}
                          aria-label={todo.completed ? 'Batalkan selesai' : 'Tandai selesai'}
                        >
                          {todo.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      )}

                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(todo.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="flex-1 text-sm bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg border border-indigo-500 outline-none text-slate-800 dark:text-slate-100"
                            autoFocus
                            maxLength={255}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(todo.id)}
                            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                            title="Simpan"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Batal"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : isTrash ? (
                        <div className="min-w-0">
                          <p
                            className={`text-sm sm:text-base truncate ${
                              todo.completed
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {todo.title}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Dibuat{' '}
                            {todo.createdAt ? formatShort(new Date(todo.createdAt)) : '-'}
                            {todo.updatedAt ? ` · Dihapus ${formatShort(new Date(todo.updatedAt))}` : ''}
                          </p>
                        </div>
                      ) : (
                        <span
                          onClick={() => handleToggleTodo(todo)}
                          onDoubleClick={() => handleStartEdit(todo)}
                          className={`text-sm sm:text-base cursor-pointer select-none truncate transition ${
                            todo.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-100'
                          }`}
                          title="Klik untuk tandai selesai, klik dua kali untuk edit"
                        >
                          {todo.title}
                        </span>
                      )}
                    </div>

                    {/* Aksi */}
                    {isTrash ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestoreTodo(todo)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition"
                          title="Kembalikan catatan"
                          aria-label="Kembalikan catatan"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePermanentDelete(todo)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                          title="Hapus permanen"
                          aria-label="Hapus permanen"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      !isEditing && (
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(todo)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition"
                            title="Edit catatan"
                            aria-label="Edit catatan"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTodo(todo)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                            title="Pindahkan ke Sampah"
                            aria-label="Pindahkan ke Sampah"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ============================= FOOTER ============================ */}
        <footer className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Catatan pribadi Anda tersimpan aman</span>
          <span className="flex items-center gap-1">
            Tekan{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
              Enter
            </kbd>{' '}
            untuk tambah
          </span>
        </footer>
      </div>
    </main>
  );
}
