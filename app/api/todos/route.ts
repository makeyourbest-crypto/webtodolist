import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/todos - Mengambil seluruh daftar tugas milik user yang sedang login dari Supabase
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const userId = Number((session.user as any).id);

    const { data: todos, error } = await supabaseAdmin
      .from('todos')
      .select('id, user_id, title, completed, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch todos error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Gagal mengambil data dari Supabase. Pastikan tabel "todos" sudah dibuat di SQL Editor.',
          data: [],
        },
        { status: 500 }
      );
    }

    const formattedTodos = (todos || []).map((item: any) => ({
      id: Number(item.id),
      userId: Number(item.user_id),
      title: item.title,
      completed: Boolean(item.completed),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: formattedTodos,
    });
  } catch (error: any) {
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal memuat catatan',
        data: [],
      },
      { status: 500 }
    );
  }
}

// POST /api/todos - Menambahkan tugas baru untuk user yang sedang login
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const userId = Number((session.user as any).id);
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
      .insert([
        {
          user_id: userId,
          title: title,
          completed: false,
        },
      ])
      .select('id, user_id, title, completed, created_at, updated_at')
      .single();

    if (error) {
      console.error('Supabase add todo error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Gagal menambahkan tugas ke Supabase: ' + error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: Number(newTodo.id),
          userId: Number(newTodo.user_id),
          title: newTodo.title,
          completed: Boolean(newTodo.completed),
          createdAt: newTodo.created_at,
          updatedAt: newTodo.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding todo:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal menambahkan tugas',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/todos - Menghapus semua tugas yang selesai HANYA milik user yang sedang login
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const userId = Number((session.user as any).id);

    const { error } = await supabaseAdmin
      .from('todos')
      .delete()
      .eq('user_id', userId)
      .eq('completed', true);

    if (error) {
      console.error('Supabase delete completed error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Gagal menghapus catatan selesai dari Supabase',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Catatan selesai berhasil dihapus',
    });
  } catch (error: any) {
    console.error('Error deleting completed todos:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal menghapus catatan selesai',
      },
      { status: 500 }
    );
  }
}
