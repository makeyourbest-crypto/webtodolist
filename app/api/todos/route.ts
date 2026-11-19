import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { TODO_COLUMNS, formatTodo, parseIsoDate, MIGRATION_HINT } from '@/lib/todo-format';

export const dynamic = 'force-dynamic';

async function getUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user ? Number((session.user as any).id) : NaN;
  return Number.isFinite(id) && id > 0 ? id : null;
}

const unauthorized = () =>
  NextResponse.json(
    { success: false, error: 'Unauthorized. Silakan login terlebih dahulu.' },
    { status: 401 }
  );

/**
 * GET /api/todos
 *  - (default / view=day) : catatan aktif pada rentang ?from=&to= (ISO), + jumlah item sampah
 *  - view=trash           : catatan di sampah (maks 200, terbaru dulu)
 *  - view=history         : ringkasan ringan (created_at, completed) sejak ?from= untuk timeline
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'day';
    const from = parseIsoDate(searchParams.get('from'));
    const to = parseIsoDate(searchParams.get('to'));

    if (view === 'trash') {
      let query = supabaseAdmin
        .from('todos')
        .select(TODO_COLUMNS)
        .eq('user_id', userId)
        .eq('is_deleted', true);

      if (from && to) {
        query = query.gte('created_at', from).lt('created_at', to);
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return NextResponse.json({ success: true, data: (data || []).map(formatTodo) });
    }

    if (view === 'history') {
      if (!from) {
        return NextResponse.json(
          { success: false, error: 'Parameter "from" wajib diisi' },
          { status: 400 }
        );
      }
      const { data, error } = await supabaseAdmin
        .from('todos')
        .select('created_at, completed')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .gte('created_at', from)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        data: (data || []).map((r: any) => ({
          createdAt: r.created_at as string,
          completed: Boolean(r.completed),
        })),
      });
    }

    if (view === 'month') {
      if (!from || !to) {
        return NextResponse.json(
          { success: false, error: 'Parameter "from" dan "to" wajib diisi' },
          { status: 400 }
        );
      }
      const { data, error } = await supabaseAdmin
        .from('todos')
        .select('id, title, completed, created_at')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .gte('created_at', from)
        .lt('created_at', to)
        .order('created_at', { ascending: true })
        .limit(2000);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        data: (data || []).map((r: any) => ({
          id: Number(r.id),
          title: r.title as string,
          completed: Boolean(r.completed),
          createdAt: r.created_at as string,
        })),
      });
    }

    // view = day
    if (!from || !to) {
      return NextResponse.json(
        { success: false, error: 'Parameter "from" dan "to" wajib diisi' },
        { status: 400 }
      );
    }

    // Dua query berjalan paralel agar tidak menambah latensi
    const [todosRes, trashRes] = await Promise.all([
      supabaseAdmin
        .from('todos')
        .select(TODO_COLUMNS)
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .gte('created_at', from)
        .lt('created_at', to)
        .order('created_at', { ascending: false })
        .limit(500),
      supabaseAdmin
        .from('todos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_deleted', true)
        .gte('created_at', from)
        .lt('created_at', to),
    ]);

    if (todosRes.error) throw todosRes.error;
    if (trashRes.error) throw trashRes.error;

    return NextResponse.json({
      success: true,
      data: (todosRes.data || []).map(formatTodo),
      trashCount: trashRes.count ?? 0,
    });
  } catch (error: any) {
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Gagal mengambil data dari Supabase. ${MIGRATION_HINT}`,
        data: [],
      },
      { status: 500 }
    );
  }
}

// POST /api/todos - Menambahkan catatan baru (selalu dibuat "sekarang" / hari ini)
export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Judul tugas tidak boleh kosong' },
        { status: 400 }
      );
    }
    if (title.length > 255) {
      return NextResponse.json(
        { success: false, error: 'Judul tugas maksimal 255 karakter' },
        { status: 400 }
      );
    }

    const { data: newTodo, error } = await supabaseAdmin
      .from('todos')
      .insert([{ user_id: userId, title, completed: false }])
      .select(TODO_COLUMNS)
      .single();

    if (error) {
      console.error('Supabase add todo error:', error);
      return NextResponse.json(
        { success: false, error: 'Gagal menambahkan catatan. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: formatTodo(newTodo) }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding todo:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan catatan' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/todos
 *  - ?scope=completed&from=&to= : pindahkan catatan selesai pada hari tsb ke Sampah (soft delete)
 *  - ?scope=trash               : kosongkan Sampah (hapus PERMANEN, tidak bisa dikembalikan)
 */
export async function DELETE(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'completed';

    if (scope === 'trash') {
      // Hanya hapus permanen catatan sampah yang dibuat HARI INI.
      // Catatan sampah dari hari lampau tetap tersimpan sebagai arsip riwayat.
      const now = new Date();
      const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const { error } = await supabaseAdmin
        .from('todos')
        .delete()
        .eq('user_id', userId)
        .eq('is_deleted', true)
        .gte('created_at', todayIso);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Sampah hari ini berhasil dikosongkan' });
    }

    const from = parseIsoDate(searchParams.get('from'));
    const to = parseIsoDate(searchParams.get('to'));
    if (!from || !to) {
      return NextResponse.json(
        { success: false, error: 'Parameter "from" dan "to" wajib diisi' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('todos')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .eq('completed', true)
      .gte('created_at', from)
      .lt('created_at', to);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Catatan selesai dipindahkan ke Sampah' });
  } catch (error: any) {
    console.error('Error deleting todos:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memproses penghapusan catatan' },
      { status: 500 }
    );
  }
}
