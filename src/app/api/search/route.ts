import { NextRequest, NextResponse } from 'next/server';
import { extractSkillsFromResume, scoreJobMatch } from '@/lib/ai';
import { Job } from '@/lib/types';

interface RawJob {
  title?: string;
  company_name?: string;
  location?: string;
  description?: string;
  link?: string;
  via?: string;
  detected_extensions?: { salary?: string };
}

function getMockJobs(query: string, location: string): RawJob[] {
  return [
    {
      title: `Senior ${query}`,
      company_name: 'TechCorp',
      location: location || 'Remote',
      description: `Exciting opportunity for a ${query} to join our growing team. You will design and build scalable systems, collaborate cross-functionally, and mentor junior team members. Strong communication and technical skills required.`,
      link: 'https://linkedin.com/jobs',
      via: 'LinkedIn',
      detected_extensions: { salary: '$120k–$160k' },
    },
    {
      title: `${query} Engineer`,
      company_name: 'StartupXYZ',
      location: location || 'San Francisco, CA',
      description: `Join our engineering team as a ${query} engineer. Work on cutting-edge products with modern tech stack. We value innovation, ownership, and continuous learning in a fast-paced environment.`,
      link: 'https://indeed.com/jobs',
      via: 'Indeed',
      detected_extensions: { salary: '$100k–$140k' },
    },
    {
      title: `Lead ${query}`,
      company_name: 'GlobalSolutions',
      location: location || 'New York, NY',
      description: `Lead a team of engineers as our ${query} lead. Drive technical decisions, architect solutions, and work closely with product. 5+ years experience preferred. Competitive compensation and equity.`,
      link: 'https://linkedin.com/jobs',
      via: 'LinkedIn',
      detected_extensions: { salary: '$150k–$200k' },
    },
    {
      title: `${query} Specialist`,
      company_name: 'InnovateCo',
      location: location || 'Austin, TX',
      description: `We need a skilled ${query} specialist to help us build the future. You will work with a talented team on complex problems, contribute to architecture decisions, and help grow our technical capabilities.`,
      link: 'https://indeed.com/jobs',
      via: 'Indeed',
      detected_extensions: { salary: '$90k–$120k' },
    },
    {
      title: `Junior ${query}`,
      company_name: 'GrowthStudio',
      location: location || 'Remote',
      description: `Great opportunity for an early-career ${query} to grow quickly. Mentorship provided. Work on real products from day one. We invest heavily in our team's professional development.`,
      link: 'https://linkedin.com/jobs',
      via: 'LinkedIn',
      detected_extensions: { salary: '$70k–$95k' },
    },
  ];
}

async function fetchJobsFromSerpAPI(query: string, location: string, source: string): Promise<RawJob[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return getMockJobs(query, location);

  const params = new URLSearchParams({
    engine: 'google_jobs',
    q: query,
    location: location || 'United States',
    api_key: key,
    num: '8',
  });
  if (source === 'linkedin') params.set('via', 'LinkedIn');
  if (source === 'indeed')   params.set('via', 'Indeed');

  const res = await fetch(`https://serpapi.com/search?${params.toString()}`);
  if (!res.ok) return getMockJobs(query, location);
  const data = await res.json();
  return Array.isArray(data.jobs_results) ? data.jobs_results : getMockJobs(query, location);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resume: string      = body.resume || '';
    const keywords: string    = body.keywords || '';
    const location: string    = body.location || '';
    const source: string      = body.source || 'all';
    const autoFromResume: boolean = Boolean(body.autoFromResume);

    let searchQuery = keywords;
    let skills: string[] = [];
    let titles: string[] = [];

    if (autoFromResume && resume) {
      const extracted = await extractSkillsFromResume(resume);
      skills = extracted.skills;
      titles = extracted.titles;
      const topTitle = titles[0] || '';
      const topSkills = skills.slice(0, 3).join(' ');
      searchQuery = `${topTitle} ${topSkills}`.trim() || 'software engineer';
    }

    if (!searchQuery) {
      return NextResponse.json({ error: 'Enter keywords or enable auto-search with resume' }, { status: 400 });
    }

    const rawJobs = await fetchJobsFromSerpAPI(searchQuery, location, source);

    const jobs: Job[] = await Promise.all(
      rawJobs.slice(0, 6).map(async (raw, i) => {
        let matchScore = 65;
        let matchReasons: string[] = ['Position available in your area', 'Role matches your experience level'];

        if (resume && skills.length > 0) {
          const scored = await scoreJobMatch(
            raw.title || '',
            raw.description || '',
            skills,
            titles
          );
          matchScore   = scored.score;
          matchReasons = scored.reasons;
        }

        const via = (raw.via || '').toLowerCase();
        const jobSource = via.includes('linkedin') ? 'linkedin' : via.includes('indeed') ? 'indeed' : 'manual';

        return {
          id:           `job-${Date.now()}-${i}`,
          title:        raw.title || 'Unknown Title',
          company:      raw.company_name || 'Unknown Company',
          location:     raw.location || location || 'Unknown',
          url:          raw.link || '#',
          description:  raw.description || '',
          salary:       raw.detected_extensions?.salary || '',
          matchScore,
          matchReasons,
          source:       jobSource,
          dateFound:    new Date().toISOString(),
          dateApplied:  '',
          status:       'saved',
          notes:        '',
        } as Job;
      })
    );

    return NextResponse.json({ jobs, query: searchQuery });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Search failed';
    console.error('Search error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
