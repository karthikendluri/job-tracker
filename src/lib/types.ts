export type JobStatus = 'saved' | 'applied' | 'interviewing' | 'rejected' | 'offer';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  matchScore: number;
  matchReasons: string[];
  source: string;
  dateFound: string;
  status: JobStatus;
  dateApplied: string;
  notes: string;
  salary: string;
}
