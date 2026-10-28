'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from 'lucide-react';

interface Todo {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function TodoApp() {
  const { data: session } = useSession();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<boolean>(false);

  // Form states
  const [inputTitle, setInputTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Filter & Search states
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Indonesian date
  const [dateString, setDateString] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Initial load
  useEffect(() => {
    const now = new Date();
    try {
      const formatted = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      setDateString(formatted);
    } catch {
      setDateString(now.toDateString());
    }

    const savedTheme = localStorage.getItem('todolist_theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : systemPrefersDark;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    fetchTodos();
  }, []);

  // Sync theme
  const toggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('todolist_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('todolist_theme', 'light');
    }
  };

  // Fetch todos from API
  const fetchTodos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/todos', { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        setTodos(data.data || []);
        setDbError(null);
      } else {
        setDbError(data.error || 'Gagal memuat catatan dari database');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setDbError('Gagal menghubungi database Supabase.');
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  const handleRetry = () => {
    setRetrying(true);
    fetchTodos();
  };

  // Add Todo
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputTitle.trim();

    if (!trimmed) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      inputRef.current?.focus();
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setTodos((prev) => [data.data, ...prev]);
        setInputTitle('');
        setDbError(null);
      } else {
        setDbError(data.error || 'Gagal menambahkan catatan');
      }
    } catch (err) {
      console.error('Add todo error:', err);
      setDbError('Gagal menambahkan catatan. Pastikan koneksi database aktif.');
    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  };

  // Toggle Todo completion
  const handleToggleTodo = async (todo: Todo) => {
    const nextCompleted = !todo.completed;

    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed: nextCompleted } : t))
    );

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      const data = await res.json();

      if (!data.success) {
        setTodos((prev) =>
          prev.map((t) => (t.id === todo.id ? { ...t, completed: todo.completed } : t))
        );
        setDbError(data.error || 'Gagal mengubah status catatan');
      }
    } catch (err) {
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, completed: todo.completed } : t))
      );
      setDbError('Gagal mengubah status catatan.');
    }
  };

  // Delete Todo
  const handleDeleteTodo = async (id: number) => {
    const backup = [...todos];
    setTodos((prev) => prev.filter((t) => t.id !== id));

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!data.success) {
        setTodos(backup);
        setDbError(data.error || 'Gagal menghapus catatan');
      }
    } catch (err) {
      setTodos(backup);
      setDbError('Gagal menghapus catatan.');
    }
  };

  // Start inline edit
  const handleStartEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
  };

  // Save inline edit
  const handleSaveEdit = async (id: number) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }

    const original = todos.find((t) => t.id === id);
    if (original && original.title === trimmed) {
      setEditingId(null);
      return;
    }

    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: trimmed } : t))
    );
    setEditingId(null);

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      const data = await res.json();

      if (!data.success) {
        if (original) {
          setTodos((prev) =>
            prev.map((t) => (t.id === id ? { ...t, title: original.title } : t))
          );
        }
        setDbError(data.error || 'Gagal memperbarui judul catatan');
      }
    } catch (err) {
      if (original) {
        setTodos((prev) =>
          prev.map((t) => (t.id === id ? { ...t, title: original.title } : t))
        );
      }
      setDbError('Gagal memperbarui catatan.');
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  // Clear Completed
  const handleClearCompleted = async () => {
    const completedTodos = todos.filter((t) => t.completed);
    if (completedTodos.length === 0) return;

    const backup = [...todos];
    setTodos((prev) => prev.filter((t) => !t.completed));

    try {
      const res = await fetch('/api/todos', {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!data.success) {
        setTodos(backup);
        setDbError(data.error || 'Gagal menghapus catatan yang selesai');
      }
    } catch (err) {
      setTodos(backup);
      setDbError('Gagal menghapus catatan yang selesai.');
    }
  };

  // Computed Values
  const filteredTodos = useMemo(() => {
    return todos.filter((item) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'active'
          ? !item.completed
          : item.completed;
      const matchesSearch = item.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [todos, filter, searchQuery]);

  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const activeCount = totalCount - completedCount;
  const progressPercent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex items-start justify-center">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl shadow-indigo-500/5 dark:shadow-black/40 p-6 sm:p-8 space-y-6 transition-all duration-300">
        
        {/* ============================================================== */}
        {/* HEADER SECTION                                                */}
        {/* ============================================================== */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Catatan harian
            </h1>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{dateString || 'Hari ini'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* User Profile Badge & Logout */}
            {session?.user && (
              <div className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span className="max-w-[120px] truncate" title={session.user.name || session.user.email || 'Pengguna'}>
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

            {/* Tombol Ganti Tema */}
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

        {/* ============================================================== */}
        {/* MYSQL ERROR ALERT BANNER (IF ANY)                              */}
        {/* ============================================================== */}
        {dbError && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 space-y-2 text-sm animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Pemberitahuan Database</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">{dbError}</p>
                <div className="mt-2 text-xs bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-1">
                  <p className="font-medium">💡 Catatan Database:</p>
                  <p className="text-slate-600 dark:text-slate-400">
                    Pastikan tabel <code>users</code> dan <code>todos</code> sudah dibuat di SQL Editor Supabase.
                  </p>
                </div>
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

        {/* ============================================================== */}
        {/* PROGRESS CARD                                                  */}
        {/* ============================================================== */}
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
              {activeCount === 0 && totalCount > 0
                ? 'Semua tuntas! 🎉'
                : `${activeCount} tersisa`}
            </span>
          </div>
        </section>

        {/* ============================================================== */}
        {/* ADD TASK FORM                                                  */}
        {/* ============================================================== */}
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
              disabled={submitting}
            />

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-500/25 disabled:opacity-50 disabled:pointer-events-none shrink-0"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 stroke-[2.5]" />
              )}
              <span className="hidden sm:inline">Tambah</span>
            </button>
          </div>
        </form>

        {/* ============================================================== */}
        {/* FILTER & SEARCH BAR                                            */}
        {/* ============================================================== */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Filter Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition ${
                  filter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Semua ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('active')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition ${
                  filter === 'active'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Aktif ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('completed')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition ${
                  filter === 'completed'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Selesai ({completedCount})
              </button>
            </div>

            {/* Clear Completed Button */}
            {completedCount > 0 && (
              <button
                type="button"
                onClick={handleClearCompleted}
                className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline transition self-end sm:self-auto px-2 py-1"
              >
                Hapus Selesai ({completedCount})
              </button>
            )}
          </div>

          {/* Quick Search Input */}
          {totalCount > 2 && (
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
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* TODO LIST ITEMS                                                */}
        {/* ============================================================== */}
        <div className="space-y-2">
          {loading && todos.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-xs">Memuat catatan...</p>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {searchQuery
                  ? 'Tidak ada catatan yang cocok'
                  : filter === 'active'
                  ? 'Semua catatan aktif sudah beres!'
                  : filter === 'completed'
                  ? 'Belum ada catatan selesai'
                  : 'Belum ada catatan'}
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {searchQuery
                  ? 'Coba gunakan kata kunci pencarian yang lain.'
                  : filter === 'active'
                  ? 'Santai sejenak atau tambahkan target baru.'
                  : 'Tulis catatan atau tugas pertamamu di atas!'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredTodos.map((todo) => {
                const isEditing = editingId === todo.id;

                return (
                  <li
                    key={todo.id}
                    className={`group flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all ${
                      todo.completed
                        ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800/60'
                        : 'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-700/80 shadow-sm'
                    }`}
                  >
                    {/* Checkbox & Text */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
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

                    {/* Actions (Edit / Delete) */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(todo)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition"
                          title="Edit catatan"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                          title="Hapus catatan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ============================================================== */}
        {/* FOOTER STATS                                                   */}
        {/* ============================================================== */}
        <footer className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Catatan pribadi Anda tersimpan aman</span>
          <span className="flex items-center gap-1">
            Tekan <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">Enter</kbd> untuk tambah
          </span>
        </footer>

      </div>
    </main>
  );
}
