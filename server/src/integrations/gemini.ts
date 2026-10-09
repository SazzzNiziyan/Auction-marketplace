import { env } from '../config/env';

interface GeminiResponse {
  candidates?: Array<{
    content: { parts: Array<{ text: string }> };
  }>;
  error?: { message: string };
}

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${env.GEMINI_API_KEY}`;

async function callGemini(prompt: string, timeoutMs = 15000): Promise<string | null> {
  if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'PLACEHOLDER') {
    return null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn('[Gemini] HTTP warning/quota:', res.status);
      return null;
    }

    const data = (await res.json()) as GeminiResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err) {
    console.warn('[Gemini] Request failed or timed out:', err);
    return null;
  }
}

/**
 * Generate listing title, description, and category suggestions from seller input.
 * Falls back to structured fallback if Gemini is offline.
 */
export async function suggestListing(
  rawText: string,
  categoryHint?: string
): Promise<{ title: string; description: string; suggestedCategory: string }> {
  const prompt = `You are an expert marketplace listing assistant for an Indian auction/e-commerce platform called Auctio.
  
Given this seller-provided product information:
"${rawText}"
${categoryHint ? `Category hint: ${categoryHint}` : ''}

Generate a professional product listing. Respond ONLY in valid JSON with these exact fields:
{
  "title": "Clear, specific product title (max 80 chars)",
  "description": "Detailed, honest product description (150-300 words). Mention condition, key features, any defects.",
  "suggestedCategory": "One of: Electronics, Collectibles & Art, Fashion, Home & Living, Jewellery, Vintage & Antiques, Sports & Outdoors, Books & Media"
}`;

  const raw = await callGemini(prompt);
  if (raw) {
    try {
      const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      // fallback below
    }
  }

  // Graceful deterministic fallback
  const firstLine = rawText.split('\n')[0].substring(0, 70);
  return {
    title: firstLine || 'Premium Handcrafted Item',
    description: `${rawText}\n\nCondition: Carefully inspected and preserved. Ready for immediate dispatch with secure packaging.`,
    suggestedCategory: categoryHint || 'Collectibles & Art',
  };
}

/**
 * Flag potentially problematic listing content for moderation.
 */
export async function moderateListing(
  title: string,
  description: string
): Promise<{ flagged: boolean; reason?: string; confidence: number }> {
  const prompt = `You are a content moderator for an Indian marketplace. Analyze this product listing for policy violations.

Title: "${title}"
Description: "${description}"

Check for: prohibited items (weapons, drugs, currency counterfeits, adult goods), misleading claims, hate speech, scam patterns.

Respond ONLY in valid JSON:
{
  "flagged": true/false,
  "reason": "Brief reason if flagged, null otherwise",
  "confidence": 0.0-1.0
}`;

  const raw = await callGemini(prompt, 10000);
  if (raw) {
    try {
      const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      // fallback below
    }
  }

  // Keyword-based local fallback safeguard
  const prohibitedWords = ['weapon', 'narcotics', 'stolen', 'fake currency', 'gun', 'counterfeit money'];
  const text = `${title} ${description}`.toLowerCase();
  for (const word of prohibitedWords) {
    if (text.includes(word)) {
      return { flagged: true, reason: `Contains flagged keyword: ${word}`, confidence: 0.95 };
    }
  }

  return { flagged: false, confidence: 0.1 };
}

/**
 * 24/7 AI Customer Support Chatbot
 */
export async function supportChatbot(userMessage: string, history: Array<{ role: string; content: string }> = []): Promise<string> {
  const context = `You are "Auctio Assistant", the helpful AI support specialist for Auctio — India's premier multi-vendor marketplace & live real-time auction platform.
Key platform facts:
- Buyers can buy fixed-price items immediately or bid in timed real-time auctions.
- Caution Deposits: To ensure serious bidding, auctions require a refundable Caution Deposit (typically ₹500 - ₹5,000 in test mode). Non-winners get 100% refund. Winners have it applied to their purchase.
- Anti-sniping: Bids placed in the final 5 minutes extend the auction timer by 5 minutes.
- Auto-bidding: Buyers can set a maximum proxy bid; the system bids the minimum necessary increment automatically.
- Multi-seller checkout: You can buy from multiple sellers at once in your cart; shipping is calculated per seller.
- Orders: Tracked from Paid -> Processing -> Shipped (with courier tracking #) -> Delivered.
- Returns/Refunds: Buyers can request a refund with photo evidence within 7 days of delivery.
- Payments: Currently processed via Razorpay Test Mode in INR (Indian Rupees).
Be polite, concise, professional, and Apple-like in tone.`;

  const conversation = history.map(h => `${h.role === 'user' ? 'Customer' : 'Assistant'}: ${h.content}`).join('\n');
  const fullPrompt = `${context}\n\nChat History:\n${conversation}\nCustomer: ${userMessage}\nAssistant:`;

  const response = await callGemini(fullPrompt, 12000);
  if (response) return response.trim();

  // Fallback if AI offline or 503 Unavailable
  const text = userMessage.toLowerCase();
  
  if (text.includes('deposit')) {
    return 'Caution deposits are required before bidding to ensure fair auctions. If you do not win, your deposit is 100% refunded to your payment method. Winning bidders will have it applied to their purchase!';
  }
  if (text.includes('snip') || text.includes('timer')) {
    return 'Our anti-sniping protection extends the auction by 5 minutes if any bid is placed in the final 5 minutes. This gives everyone a fair chance to respond without last-second bid sniping.';
  }
  if (text.includes('refund') || text.includes('return')) {
    return 'You can request a refund from your Buyer Dashboard under "Orders" by clicking "Request Refund" and uploading evidence. Our support team reviews all requests promptly within 24 hours.';
  }
  if (text.includes('hello') || text.includes('hi')) {
    return 'Hello! I am your Auctio marketplace assistant. How can I help you with live auctions, bidding, orders, or seller onboarding today?';
  }
  if (text.includes('seller') || text.includes('sell')) {
    return 'To become a seller, go to the Seller Dashboard and complete your verification profile. You can list items as fixed-price or start your own live auctions!';
  }
  if (text.includes('bid') || text.includes('auction')) {
    return 'You can browse live auctions on the Explore page. To place a bid, enter a room, pay the caution deposit if required, and you can either bid manually or set up a proxy auto-bid!';
  }
  
  // Default dynamic response based on input length
  if (text.length < 10) {
    return 'I am here to help! Could you provide a bit more detail?';
  }
  
  return `I understand you're asking about "${userMessage.substring(0, 30)}...". Since our AI servers are currently experiencing high demand, I cannot generate a detailed custom response right now. Please check our FAQ or try asking your question again in a moment!`;
}
