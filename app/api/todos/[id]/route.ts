import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { TODO_COLUMNS, formatTodo } from '@/lib/todo-format';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

async function resolveContext(params: RouteParams['params']) {
  const session = await getServerSession(authOptions);
  const userId = session?.user ? Number((session.user as any).id) : NaN;
  const id = Number(params.id);

  if (!Number.isFinite(userId) || userId <= 0) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      ),
    };
  }
  if (!Number.isFinite(id) || id <= 0) {
    return {
      error: NextResponse.json(
        { success: false, error: 'ID tugas tidak valid' },
        { status: 400 }
      ),
    };
  }
  return { userId, id };
}

/**
 * PUT /api/todos/[id]
 * Body: { title?: string, completed?: boolean, restore?: boolean }
 * `restore: true` mengembalikan catatan dari Sampah. Selalu difilter user_id (isolasi data).
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const ctx = await resolveContext(params);
    if ('error' in ctx) return ctx.error;
    const { userId, id } = ctx;

    const body = await request.json();
    const { title, completed, restore } = body;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof title === 'string') {
      const trimmed = title.trim();
      if (!trimmed) {
        return NextResponse.json(
          { success: false, error: 'Judul tugas tidak boleh kosong' },
          { status: 400 }
        );
      }
      if (trimmed.length > 255) {
        return NextResponse.json(
          { success: false, error: 'Judul tugas maksimal 255 karakter' },
          { status: 400 }
        );
      }
      updatePayload.title = trimmed;
    }

    if (typeof completed === 'boolean') {
      updatePayload.completed = completed;
    }

    if (restore === true) {
      updatePayload.is_deleted = false;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('todos')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select(TODO_COLUMNS)
      .single();

    if (error || !updated) {
      return NextResponse.json(
        { success: false, error: 'Catatan tidak ditemukan atau Anda tidak memiliki akses' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: formatTodo(updated) });
  } catch (error: any) {
    console.error(`Error updating todo ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui catatan' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/todos/[id]
 *  - default            : pindahkan ke Sampah (soft delete, bisa di-restore)
 *  - ?permanent=true    : hapus PERMANEN (hanya untuk catatan yang sudah ada di Sampah)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const ctx = await resolveContext(params);
    if ('error' in ctx) return ctx.error;
    const { userId, id } = ctx;

    const permanent = new URL(request.url).searchParams.get('permanent') === 'true';

    if (permanent) {
      const { data, error } = await supabaseAdmin
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .eq('is_deleted', true)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Catatan tidak ditemukan di Sampah' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, message: 'Catatan dihapus permanen' });
    }

    const { data, error } = await supabaseAdmin
      .from('todos')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Catatan tidak ditemukan atau Anda tidak memiliki akses' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, message: 'Catatan dipindahkan ke Sampah' });
  } catch (error: any) {
    console.error(`Error deleting todo ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus catatan' },
      { status: 500 }
    );
  }
}
