import { Job, Stats } from './types';

const store = new Map<string, Job>();

export function getAllJobs(): Job[] {
  return Array.from(store.values()).sort(
    (a, b) => new Date(b.dateFound).getTime() - new Date(a.dateFound).getTime()
  );
}

export function saveJob(job: Job): Job {
  store.set(job.id, job);
  return job;
}

export function updateJob(id: string, updates: Partial<Job>): Job | null {
  const job = store.get(id);
  if (!job) return null;
  const updated = { ...job, ...updates };
  store.set(id, updated);
  return updated;
}

export function deleteJob(id: string): void {
  store.delete(id);
}

export function getStats(): Stats {
  const jobs = getAllJobs();
  return {
    total:        jobs.length,
    saved:        jobs.filter(j => j.status === 'saved').length,
    applied:      jobs.filter(j => j.status === 'applied').length,
    interviewing: jobs.filter(j => j.status === 'interviewing').length,
    rejected:     jobs.filter(j => j.status === 'rejected').length,
    offer:        jobs.filter(j => j.status === 'offer').length,
  };
}
