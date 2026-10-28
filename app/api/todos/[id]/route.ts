import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

// PUT /api/todos/[id] - Update judul atau status selesai (HANYA milik user bersangkutan)
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const userId = Number((session.user as any).id);
    const id = Number(params.id);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: 'ID tugas tidak valid' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, completed } = body;

    // Siapkan data update
    const updatePayload: any = {
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
      updatePayload.title = trimmed;
    }

    if (typeof completed === 'boolean') {
      updatePayload.completed = completed;
    }

    // Update di Supabase dengan filter id & user_id (Security Isolation)
    const { data: updated, error } = await supabaseAdmin
      .from('todos')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, user_id, title, completed, created_at, updated_at')
      .single();

    if (error || !updated) {
      return NextResponse.json(
        { success: false, error: 'Catatan tidak ditemukan atau Anda tidak memiliki akses' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: Number(updated.id),
        userId: Number(updated.user_id),
        title: updated.title,
        completed: Boolean(updated.completed),
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error: any) {
    console.error(`Error updating todo ${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal memperbarui catatan',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/todos/[id] - Menghapus satu tugas (HANYA milik user bersangkutan)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const userId = Number((session.user as any).id);
    const id = Number(params.id);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: 'ID tugas tidak valid' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('todos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error(`Error deleting todo ${params.id}:`, error);
      return NextResponse.json(
        {
          success: false,
          error: 'Gagal menghapus catatan dari Supabase',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Catatan berhasil dihapus',
    });
  } catch (error: any) {
    console.error(`Error deleting todo ${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal menghapus catatan',
      },
      { status: 500 }
    );
  }
}
