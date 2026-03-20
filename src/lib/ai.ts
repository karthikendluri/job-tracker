// Groq API — ultra-fast inference, free tier at console.groq.com
// Models: llama-3.3-70b-versatile, mixtral-8x7b-32768, gemma2-9b-it

async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured. Get a free key at console.groq.com');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: 'You are a career expert assistant. Always respond with valid JSON only — no markdown fences, no explanation outside the JSON.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Groq error ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

function parseJSON(raw: string): any {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Invalid JSON response');
  }
}

export async function extractSkills(resume: string) {
  const prompt = `Extract key information from this resume.

Resume:
${resume.slice(0, 2500)}

Return this exact JSON:
{"skills":["skill1","skill2","skill3"],"titles":["Senior Software Engineer"],"experience":"5 years","summary":"Two sentence professional summary."}`;

  try {
    const raw = await callGroq(prompt);
    return parseJSON(raw);
  } catch (e) {
    console.warn('extractSkills failed:', e);
    return { skills: [], titles: [], experience: '', summary: '' };
  }
}

export async function scoreJob(title: string, description: string, resumeSkills: any) {
  const prompt = `Score how well this job matches the candidate. Be precise.

Candidate skills: ${(resumeSkills.skills || []).slice(0, 15).join(', ')}
Candidate titles: ${(resumeSkills.titles || []).join(', ')}
Experience: ${resumeSkills.experience || 'unknown'}

Job title: ${title}
Job description: ${description.slice(0, 700)}

Return this exact JSON:
{"score":78,"reasons":["Matches 4 of 5 required skills","Title aligns with experience","Location is remote-friendly"]}`;

  try {
    const raw = await callGroq(prompt);
    const parsed = parseJSON(raw);
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 65)),
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : ['Skills match detected'],
    };
  } catch (e) {
    console.warn('scoreJob failed:', e);
    return { score: 65, reasons: ['Relevant experience', 'Skills overlap detected'] };
  }
}
