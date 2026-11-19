'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Calendar as CalendarIcon,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';

interface MonthTodo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date | null;
  today: Date | null;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export default function CalendarModal({
  isOpen,
  onClose,
  onSelectDate,
  selectedDate,
  today,
}: CalendarModalProps) {
  const initialDate = selectedDate || today || new Date();
  const [year, setYear] = useState<number>(initialDate.getFullYear());
  const [month, setMonth] = useState<number>(initialDate.getMonth()); // 0-11

  const [todos, setTodos] = useState<MonthTodo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync modal view when opened
  useEffect(() => {
    if (isOpen && selectedDate) {
      setYear(selectedDate.getFullYear());
      setMonth(selectedDate.getMonth());
    }
  }, [isOpen, selectedDate]);

  // Fetch month data
  const fetchMonthData = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const from = new Date(y, m, 1, 0, 0, 0, 0).toISOString();
      const to = new Date(y, m + 1, 1, 0, 0, 0, 0).toISOString();

      const res = await fetch(
        `/api/todos?view=month&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { cache: 'no-store' }
      );
      const result = await res.json();

      if (result.success) {
        setTodos(result.data || []);
      } else {
        setError(result.error || 'Gagal memuat aktivitas bulanan');
      }
    } catch (err: any) {
      console.error('Fetch month error:', err);
      setError('Gagal menghubungi server database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMonthData(year, month);
    }
  }, [isOpen, year, month, fetchMonthData]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleGoCurrentMonth = () => {
    const now = today || new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  };

  // Group todos by day number (1..31) in local time
  const dayStatsMap = useMemo(() => {
    const map = new Map<number, { count: number; completed: number; titles: string[] }>();

    for (const t of todos) {
      const d = new Date(t.createdAt);
      const dayNum = d.getDate();
      const existing = map.get(dayNum) || { count: 0, completed: 0, titles: [] };
      existing.count += 1;
      if (t.completed) existing.completed += 1;
      if (existing.titles.length < 3) {
        existing.titles.push(t.title);
      }
      map.set(dayNum, existing);
    }
    return map;
  }, [todos]);

  // Calendar grid calculations
  const { totalDays, firstDayIndex, calendarCells } = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // getDay: 0 = Min, 1 = Sen ... 6 = Sab
    // We want Sen (Monday) to be 0: (day + 6) % 7
    const rawFirstDay = new Date(year, month, 1).getDay();
    const startOffset = (rawFirstDay + 6) % 7;

    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(day);
    }

    return { totalDays: daysInMonth, firstDayIndex: startOffset, calendarCells: cells };
  }, [year, month]);

  // Export to CSV
  const handleExportCSV = () => {
    if (todos.length === 0) {
      alert(`Tidak ada catatan pada bulan ${MONTH_NAMES[month]} ${year} untuk diunduh.`);
      return;
    }

    const BOM = '\uFEFF';
    const headers = ['No', 'Tanggal', 'Waktu', 'Judul Catatan', 'Status'];
    const rows = todos.map((item, idx) => {
      const d = new Date(item.createdAt);
      const dateStr = d.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const cleanTitle = `"${item.title.replace(/"/g, '""')}"`;
      const status = item.completed ? 'Selesai' : 'Belum Selesai';
      return [idx + 1, dateStr, timeStr, cleanTitle, status].join(',');
    });

    const csvContent = BOM + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rekap-catatan-${MONTH_NAMES[month].toLowerCase()}-${year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate Year options around current year (-3 to +3)
  const currentYear = (today || new Date()).getFullYear();
  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear - 3; y <= currentYear + 3; y++) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-5 overflow-hidden transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================== MODAL HEADER ===================== */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Peta Aktivitas & Kalender
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih tanggal untuk melihat detail catatan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================== NAVIGATION & DROPDOWNS ================== */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Arrow Left */}
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            title="Bulan sebelumnya"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Month & Year Selects */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleGoCurrentMonth}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-900/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition whitespace-nowrap"
            >
              Bulan Ini
            </button>
          </div>

          {/* Arrow Right */}
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            title="Bulan berikutnya"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ================== CALENDAR GRID ================== */}
        <div className="space-y-2">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-1">
            {DAY_NAMES.map((dayName) => (
              <div key={dayName}>{dayName}</div>
            ))}
          </div>

          {/* Day Cells Grid */}
          {loading && todos.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-xs">Memuat kalender...</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarCells.map((dayNum, idx) => {
                if (dayNum === null) {
                  return <div key={`empty-${idx}`} className="h-10 sm:h-12" />;
                }

                const stats = dayStatsMap.get(dayNum);
                const count = stats?.count || 0;
                const completed = stats?.completed || 0;

                const cellDate = new Date(year, month, dayNum);
                const isCellToday =
                  today &&
                  today.getFullYear() === year &&
                  today.getMonth() === month &&
                  today.getDate() === dayNum;

                const isCellSelected =
                  selectedDate &&
                  selectedDate.getFullYear() === year &&
                  selectedDate.getMonth() === month &&
                  selectedDate.getDate() === dayNum;

                // Cek apakah tanggal ini adalah hari lampau (sebelum hari ini)
                const isPastDay = Boolean(
                  today &&
                    new Date(year, month, dayNum, 0, 0, 0, 0).getTime() <
                      new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).getTime()
                );

                // Aturan Pewarnaan:
                // - Hari lewat kosong (count === 0 && isPastDay): Merah / Rose (tanda terlewat/bolong)
                // - Hari ini / mendatang kosong: Abu-abu netral
                // - 1 tugas: Hijau Emerald
                // - >1 tugas: Biru Kontras Tinggi / Cyan Electric
                let colorClass =
                  'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60 hover:border-slate-400';

                if (count === 0 && isPastDay) {
                  colorClass =
                    'bg-rose-100/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300/80 dark:border-rose-800/60 hover:border-rose-400';
                } else if (count === 1) {
                  colorClass =
                    'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 font-semibold hover:border-emerald-500';
                } else if (count > 1) {
                  colorClass =
                    'bg-cyan-100 dark:bg-cyan-950/90 text-cyan-900 dark:text-cyan-100 border-cyan-400 dark:border-cyan-600 font-extrabold shadow-sm hover:border-cyan-500';
                }

                const ringClass = isCellToday
                  ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900'
                  : isCellSelected
                  ? 'ring-2 ring-indigo-400/60'
                  : '';

                const tooltipTitle =
                  count === 0
                    ? isPastDay
                      ? `${dayNum} ${MONTH_NAMES[month]} ${year}: Terlewat (tidak ada catatan)`
                      : `${dayNum} ${MONTH_NAMES[month]} ${year}: Belum ada catatan`
                    : `${dayNum} ${MONTH_NAMES[month]} ${year}: ${count} catatan (${completed} selesai)`;

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => {
                      onSelectDate(cellDate);
                      onClose();
                    }}
                    title={tooltipTitle}
                    className={`h-10 sm:h-12 rounded-xl border flex flex-col items-center justify-center relative transition-all active:scale-95 ${colorClass} ${ringClass}`}
                  >
                    <span className="text-xs sm:text-sm">{dayNum}</span>

                    {/* Small dot count indicator if tasks exist */}
                    {count > 0 && (
                      <span className="text-[10px] leading-none opacity-80 mt-0.5">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================== LEGENDA WARNA ================== */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Aktivitas:</span>
            <div className="flex items-center gap-1.5" title="Hari yang terlewat tanpa catatan">
              <span className="w-3.5 h-3.5 rounded-md bg-rose-200 dark:bg-rose-900 border border-rose-300 dark:border-rose-700" />
              <span>Terlewat</span>
            </div>
            <div className="flex items-center gap-1.5" title="Hari ini atau hari mendatang yang belum ada catatan">
              <span className="w-3.5 h-3.5 rounded-md bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600" />
              <span>0 Tugas</span>
            </div>
            <div className="flex items-center gap-1.5" title="Tepat 1 tugas dicatat">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-300 dark:bg-emerald-700 border border-emerald-400 dark:border-emerald-600" />
              <span>1 Tugas</span>
            </div>
            <div className="flex items-center gap-1.5" title="Lebih dari 1 tugas dicatat">
              <span className="w-3.5 h-3.5 rounded-md bg-cyan-300 dark:bg-cyan-600 border border-cyan-400 dark:border-cyan-500" />
              <span>&gt;1 Tugas</span>
            </div>
          </div>
        </div>

        {/* ================== FOOTER & EXPORT BUTTON ================== */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Total:{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {todos.length} catatan
            </strong>{' '}
            di bulan {MONTH_NAMES[month]} {year}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={todos.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            title="Unduh rekap data bulan ini ke format CSV (Excel)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Rekap Bulan Ini (CSV)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
