export type JobStatus = 'saved' | 'applied' | 'interviewing' | 'rejected' | 'offer';

export type JobSource = 'linkedin' | 'indeed' | 'manual';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  salary: string;
  matchScore: number;
  matchReasons: string[];
  source: JobSource;
  dateFound: string;
  dateApplied: string;
  status: JobStatus;
  notes: string;
}

export interface Stats {
  total: number;
  saved: number;
  applied: number;
  interviewing: number;
  rejected: number;
  offer: number;
}
