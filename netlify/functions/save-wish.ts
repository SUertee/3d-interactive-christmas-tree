import { neon } from '@netlify/neon';

type WishPayload = {
  wish_text: string;
  session_id?: string;
  is_public?: boolean;
};

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let payload: WishPayload | null = null;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const wishText = payload?.wish_text?.trim();
  if (!wishText || wishText.length > 200) {
    return new Response('Invalid wish_text', { status: 400 });
  }

  const sql = neon();
  try {
    await sql`
      insert into public.wishes (wish_text, session_id, is_public)
      values (${wishText}, ${payload?.session_id ?? null}, ${payload?.is_public ?? false})
    `;
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('Failed to insert wish', err);
    return new Response('Insert failed', { status: 500 });
  }
};
