const https = require('https');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand } = req.body || {};
  if (!brand) return res.status(400).json({ error: 'No brand provided' });

  const prompt = `You are the AMB Group brand research tool. Research "${brand}" and score it against AMB criteria for South Africa marketplace distribution.

Score each criterion 0-3 (max 21 total):
1. Revenue: 3=£5-15M, 2=£2-5M or £15-20M, 0=outside
2. Lifecycle: 3=2-5yr growing, 2=5-8yr 20%+, 1=8-12yr, 0=over12 or under2
3. SA demand: 3=DHL to SA + SA Trends, 2=either, 1=SA social only, 0=none
4. Category fit: 3=supplements/textured hair/scalp, 2=SPF/science skincare/oral/body, 1=makeup, 0=irrelevant
5. Approachability: 3=founder contactable under 50 staff, 2=CMO on LinkedIn, 1=wholesale email, 0=corporate
6. Repeat+price: 3=30-day R200-500, 2=60-90day R150-800, 1=6-month, 0=one-time
7. Social: 3=viral TikTok last 30 days, 2=regular moderate, 1=low, 0=none

Disqualify if: acquired by LOreal/Unilever/PG/Coty/Puig/LVMH, publicly listed, in Clicks/DisChem/Woolworths SA, revenue over 50M GBP, or has dedicated SA website/official SA distributor.

Return ONLY valid JSON with no markdown:
{"brand":"${brand}","disqualified":false,"disqualified_reason":null,"total":0,"scores":{"revenue":{"score":0,"max":3,"note":""},"lifecycle":{"score":0,"max":3,"note":""},"sa_demand":{"score":0,"max":3,"note":""},"category_fit":{"score":0,"max":3,"note":""},"approachability":{"score":0,"max":3,"note":""},"repeat_price":{"score":0,"max":3,"note":""},"social":{"score":0,"max":3,"note":""}},"verdict":"APPROACH NOW","sa_assessment":"","key_facts":{"founded":"","revenue_est":"","markets":"","employees":"","sa_presence":"","founder":""}}

Verdict: APPROACH NOW, APPROACH - SOLID, RESEARCH MORE, SKIP, or DISQUALIFIED`;

  const body = JSON.stringify({
    model: 'claude-opus-4-5',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }]
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = (parsed.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
          const result = JSON.parse(text);
          res.status(200).json(result);
        } catch (e) {
          res.status(500).json({ error: 'Parse failed: ' + e.message });
        }
        resolve();
      });
    });

    apiReq.on('error', (e) => {
      res.status(500).json({ error: 'Network error: ' + e.message });
      resolve();
    });

    apiReq.write(body);
    apiReq.end();
  });
}
