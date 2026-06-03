/**
 * Cloudflare Pages Function
 * POST /api/submit  →  vytvoří záznam v Airtable
 *
 * Env vars (Cloudflare Settings → Environment variables):
 *   AIRTABLE_TOKEN  — Personal Access Token (scope: data.records:write)
 *   AIRTABLE_BASE   — base ID (default appa8Q2n56u3THoJv)
 *   AIRTABLE_TABLE  — table name (default "Sousto")
 */

interface FormData {
  name?: string;
  email?: string;
  jidlo?: string;
  proc?: string;
  terapie?: boolean;
  souhlas?: boolean;
}

interface Env {
  AIRTABLE_TOKEN: string;
  AIRTABLE_BASE?: string;
  AIRTABLE_TABLE?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const data = (await request.json()) as FormData;

    // Validation
    if (!data.name || !data.email || !data.terapie || !data.souhlas) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email' }),
        { status: 400, headers },
      );
    }

    if (!env.AIRTABLE_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Server not configured' }),
        { status: 500, headers },
      );
    }

    const baseId = env.AIRTABLE_BASE || 'appa8Q2n56u3THoJv';
    const tableName = env.AIRTABLE_TABLE || 'Sousto';

    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                Name: data.name,
                Email: data.email,
                Jidlo: data.jidlo || '',
                Proc: data.proc || '',
                Terapie: data.terapie,
                Souhlas: data.souhlas,
              },
            },
          ],
        }),
      },
    );

    if (!airtableRes.ok) {
      const errText = await airtableRes.text();
      console.error('Airtable error:', airtableRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Airtable submission failed' }),
        { status: 502, headers },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('Function error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers },
    );
  }
};

// CORS preflight (for local dev / cross-origin testing)
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
