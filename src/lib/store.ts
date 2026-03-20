import { Job } from './types';

const jobStore = new Map();

export const store = {
  getAll(): Job[] {
    return Array.from(jobStore.values()).sort(
      (a: any, b: any) => new Date(b.dateFound).getTime() - new Date(a.dateFound).getTime()
    );
  },
  upsert(job: Job): Job {
    jobStore.set(job.id, job);
    return job;
  },
  update(id: string, updates: any): Job | null {
    const existing = jobStore.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    jobStore.set(id, updated);
    return updated;
  },
  delete(id: string): void {
    jobStore.delete(id);
  },
  stats() {
    const all = this.getAll();
    return {
      total:        all.length,
      saved:        all.filter((j: Job) => j.status === 'saved').length,
      applied:      all.filter((j: Job) => j.status === 'applied').length,
      interviewing: all.filter((j: Job) => j.status === 'interviewing').length,
      rejected:     all.filter((j: Job) => j.status === 'rejected').length,
      offer:        all.filter((j: Job) => j.status === 'offer').length,
    };
  },
};
