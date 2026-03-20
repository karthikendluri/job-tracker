import { NextRequest, NextResponse } from 'next/server';
import { extractSkills, scoreJob } from '@/lib/ai';
import { Job } from '@/lib/types';

function getMockJobs(query: string, location: string): any[] {
  return [
    { title: `Senior ${query}`, company_name: 'TechCorp Inc', location: location || 'Remote', description: `We are looking for an experienced ${query} to join our growing team. You will build scalable systems and collaborate with cross-functional teams. Strong communication skills required.`, via: 'LinkedIn', link: 'https://linkedin.com/jobs', salary: '$120k–$160k' },
    { title: `${query} Engineer`, company_name: 'StartupXYZ', location: location || 'San Francisco, CA', description: `Join our ${query} team. Work with modern cloud technologies, contribute to architecture decisions, and mentor junior engineers. 3+ years experience needed.`, via: 'Indeed', link: 'https://indeed.com/jobs', salary: '$110k–$145k' },
    { title: `Lead ${query}`, company_name: 'GlobalSystems', location: location || 'New York, NY', description: `Lead a team of engineers as ${query}. Own technical roadmap, drive best practices, and deliver high-impact products. AWS and CI/CD experience preferred.`, via: 'LinkedIn', link: 'https://linkedin.com/jobs', salary: '$140k–$185k' },
    { title: `${query} Specialist`, company_name: 'DataDriven Co', location: location || 'Austin, TX', description: `Specialist role for an experienced ${query}. Work on data pipelines, analytics, and platform infrastructure. Python and SQL required.`, via: 'Indeed', link: 'https://indeed.com/jobs', salary: '$100k–$135k' },
    { title: `Principal ${query}`, company_name: 'EnterpriseAI', location: location || 'Remote', description: `Principal-level ${query} to architect large-scale distributed systems. Influence technical direction and mentor engineering teams.`, via: 'LinkedIn', link: 'https://linkedin.com/jobs', salary: '$160k–$220k' },
  ];
}

async function searchViaSerpAPI(query: string, location: string, source: string): Promise<any[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return getMockJobs(query, location);

  const params = new URLSearchParams({
    engine: 'google_jobs',
    q: source === 'linkedin' ? `${query} site:linkedin.com` : source === 'indeed' ? `${query} site:indeed.com` : query,
    location: location || 'United States',
    api_key: key,
    num: '8',
  });

  const res = await fetch(`https://serpapi.com/search?${params}`);
  if (!res.ok) return getMockJobs(query, location);
  const data = await res.json();
  return data.jobs_results || getMockJobs(query, location);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resume, keywords, location, source, autoFromResume } = body;

    let searchQuery = keywords || '';

    if (autoFromResume && resume) {
      const skills = await extractSkills(resume);
      const topTitle = skills.titles?.[0] || '';
      const topSkills = skills.skills?.slice(0, 3).join(' ') || '';
      searchQuery = `${topTitle} ${topSkills}`.trim() || 'software engineer';
    }

    if (!searchQuery) {
      return NextResponse.json({ error: 'Enter keywords or paste your resume with Auto-search enabled' }, { status: 400 });
    }

    const rawJobs = await searchViaSerpAPI(searchQuery, location || '', source || 'all');
    const resumeSkills = resume ? await extractSkills(resume) : null;

    const jobs: Job[] = await Promise.all(
      rawJobs.slice(0, 6).map(async (raw: any, i: number) => {
        let matchScore = 72;
        let matchReasons: string[] = ['Relevant experience', 'Skills match'];

        if (resumeSkills) {
          try {
            const scored = await scoreJob(raw.title || '', raw.description || '', resumeSkills);
            matchScore   = scored.score;
            matchReasons = scored.reasons;
          } catch { /* keep defaults */ }
        }

        const src = (raw.via || '').toLowerCase().includes('linkedin') ? 'linkedin'
          : (raw.via || '').toLowerCase().includes('indeed') ? 'indeed' : 'manual';

        return {
          id:           `job-${Date.now()}-${i}`,
          title:        raw.title || 'Role',
          company:      raw.company_name || 'Company',
          location:     raw.location || location || 'Location',
          url:          raw.link || '#',
          description:  raw.description || '',
          salary:       raw.salary || raw.detected_extensions?.salary || '',
          matchScore,
          matchReasons,
          source:       src,
          dateFound:    new Date().toISOString(),
          status:       'saved' as const,
          dateApplied:  '',
          notes:        '',
        };
      })
    );

    return NextResponse.json({ jobs, query: searchQuery });
  } catch (err: any) {
    console.error('Search error:', err);
    return NextResponse.json({ error: err?.message || 'Search failed' }, { status: 500 });
  }
}
