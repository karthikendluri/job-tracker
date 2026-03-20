import { NextRequest, NextResponse } from 'next/server';
import { getAllJobs, saveJob, updateJob, deleteJob, getStats } from '@/lib/store';
import { Job } from '@/lib/types';

export async function GET() {
  return NextResponse.json({ jobs: getAllJobs(), stats: getStats() });
}

export async function POST(req: NextRequest) {
  try {
    const job = await req.json() as Job;
    if (!job.id || !job.title) {
      return NextResponse.json({ error: 'id and title required' }, { status: 400 });
    }
    return NextResponse.json(saveJob(job));
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (updates.status === 'applied' && !updates.dateApplied) {
      updates.dateApplied = new Date().toISOString();
    }
    const updated = updateJob(id, updates);
    if (!updated) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    deleteJob(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
