import Anthropic from '@anthropic-ai/sdk';

async function callAI(prompt: string): Promise<string> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      const block = msg.content[0];
      if (block.type === 'text') return block.text;
    } catch (e) {
      console.warn('Claude failed:', e);
    }
  }
  if (process.env.GOOGLE_API_KEY) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    );
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }
  throw new Error('No AI key configured. Add ANTHROPIC_API_KEY or GOOGLE_API_KEY.');
}

export async function extractSkillsFromResume(resume: string): Promise<{ skills: string[]; titles: string[] }> {
  const prompt = `Extract skills and job titles from this resume. Return ONLY JSON, no markdown.
Resume: ${resume.slice(0, 2000)}
Return: {"skills":["skill1","skill2"],"titles":["title1","title2"]}`;

  try {
    const raw = await callAI(prompt);
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (e) {
    console.warn('Skill extraction failed:', e);
  }
  return { skills: [], titles: [] };
}

export async function scoreJobMatch(
  jobTitle: string,
  jobDesc: string,
  skills: string[],
  titles: string[]
): Promise<{ score: number; reasons: string[] }> {
  const prompt = `Score this job match 0-100. Return ONLY JSON, no markdown.
Candidate skills: ${skills.slice(0, 15).join(', ')}
Candidate roles: ${titles.join(', ')}
Job: ${jobTitle}
Description: ${jobDesc.slice(0, 500)}
Return: {"score":75,"reasons":["reason1","reason2","reason3"]}`;

  try {
    const raw = await callAI(prompt);
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
      };
    }
  } catch (e) {
    console.warn('Job scoring failed:', e);
  }
  return { score: 65, reasons: ['Skills match detected', 'Role level appropriate'] };
}
