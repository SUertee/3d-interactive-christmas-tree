const SESSION_KEY = 'wish_session_id';

const getSessionId = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(SESSION_KEY, generated);
  return generated;
};

export const saveWish = async (wishText: string): Promise<void> => {
  try {
    const res = await fetch('/.netlify/functions/save-wish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wish_text: wishText,
        session_id: getSessionId(),
        is_public: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn('Failed to save wish', res.status, text);
    }
  } catch (err) {
    console.warn('Failed to save wish', err);
  }
};
