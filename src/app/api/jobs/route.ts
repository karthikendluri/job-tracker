import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET() {
  return NextResponse.json({ jobs: store.getAll(), stats: store.stats() });
}

export async function POST(req: NextRequest) {
  const job = await req.json();
  return NextResponse.json(store.upsert(job));
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (updates.status === 'applied' && !updates.dateApplied) {
    updates.dateApplied = new Date().toISOString();
  }
  const updated = store.update(id, updates);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  store.delete(id);
  return NextResponse.json({ ok: true });
}
