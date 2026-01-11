import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(cors());
app.use(express.json({ limit: "50kb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30
  })
);

function normalizeItem(value) {
  return String(value || "").trim().toLowerCase();
}

app.post("/api/packing-suggestions", async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured." });
  }

  const {
    destination = "",
    dateRange = "",
    itinerary = [],
    existingPackingItems = []
  } = req.body || {};

  const existingItems = Array.isArray(existingPackingItems)
    ? existingPackingItems.map(normalizeItem).filter(Boolean)
    : [];

  const promptPayload = {
    destination,
    dateRange,
    itinerary,
    existingPackingItems: existingItems
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You generate concise, practical packing suggestions for a wedding trip. " +
              "Return JSON with { suggestions: [{ id, category, item, reason }] }. " +
              "Provide 12-25 suggestions, grouped across Clothing, Toiletries, Tech, Documents, Misc. " +
              "Avoid duplicates, avoid items already in existingPackingItems, keep items concrete."
          },
          { role: "user", content: JSON.stringify(promptPayload) }
        ],
        temperature: 0.4,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
      : [];

    const seen = new Set(existingItems);
    const filtered = [];
    for (const suggestion of suggestions) {
      const item = normalizeItem(suggestion.item);
      if (!item || seen.has(item)) continue;
      seen.add(item);
      filtered.push({
        id: suggestion.id || `ai-${filtered.length + 1}`,
        category: suggestion.category || "Misc",
        item: suggestion.item,
        reason: suggestion.reason || ""
      });
      if (filtered.length >= 25) break;
    }

    return res.json({ suggestions: filtered });
  } catch (error) {
    return res.status(502).json({ error: "Failed to fetch suggestions." });
  } finally {
    clearTimeout(timeoutId);
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Packing suggestions API running on port ${PORT}`);
});
