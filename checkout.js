// /api/checkout.js — Vercel serverless proxy
// Runs server-side: no CORS restrictions, no secrets in frontend

export default async function handler(req, res) {
  // CORS headers for browser
  res.setHeader('Access-Control-Allow-Origin', 'https://qsisto.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const body = req.body || {};

  // Validate terms
  if (!body.terms_accepted || !body.privacy_accepted) {
    return res.status(400).json({
      success: false,
      error: 'terms_not_accepted',
      message: 'Please accept Terms and Privacy Policy.'
    });
  }

  // Forward to n8n checkout workflow (server-side — no CORS)
  try {
    const n8nRes = await fetch(
      'https://qsisto.app.n8n.cloud/webhook/storeguard-create-checkout-v2',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    const data = await n8nRes.json().catch(() => ({}));

    if (data.checkout_url || data.url) {
      return res.status(200).json({
        success: true,
        checkout_url: data.checkout_url || data.url,
        session_id: data.session_id || null,
        plan: data.plan || 'starter',
        price_eur: 49
      });
    }

    return res.status(200).json({
      success: false,
      error: data.error || 'stripe_session_creation_failed',
      message: data.message || 'Could not create checkout session.'
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      error: 'proxy_error',
      message: 'Checkout service unavailable. Please try again.'
    });
  }
}
