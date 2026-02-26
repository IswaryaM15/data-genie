import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, format, rowCount, webContext, qualityOptions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const formatInstructions: Record<string, string> = {
      csv: "Return ONLY valid CSV with a header row. Use commas as delimiters. Quote fields containing commas.",
      json: "Return ONLY a valid JSON array of objects. No markdown, no code fences.",
      sql: "Return ONLY valid SQL INSERT statements for a table called 'data'. Include a CREATE TABLE statement first.",
      xml: "Return ONLY valid XML with a root <dataset> element containing <row> elements.",
      yaml: "Return ONLY valid YAML as a list of objects. No markdown, no code fences.",
      xlsx: "Return ONLY valid CSV with a header row. Use commas as delimiters. Quote fields containing commas. This will be converted to Excel format.",
      txt: "Return the data as readable plain text with consistent formatting.",
    };

    const qualityPrompt = qualityOptions
      ? [
          qualityOptions.realistic && "Use realistic values matching real-world distributions",
          qualityOptions.statistical && "Ensure statistical accuracy with proper correlations between fields",
          qualityOptions.complete && "Every field must have a value, no nulls or empty strings",
          qualityOptions.noiseFree && "Data should be clean with no typos, formatting errors, or inconsistencies",
        ].filter(Boolean).join(". ")
      : "";

    const webContextPrompt = webContext
      ? `\n\nUse the following real-world reference data to make your output more realistic:\n${webContext.slice(0, 3000)}`
      : "";

    const systemPrompt = `You are a dataset generator. Generate exactly ${rowCount} rows of data.
${formatInstructions[format] || formatInstructions.csv}
${qualityPrompt ? `\nQuality requirements: ${qualityPrompt}.` : ""}
${webContextPrompt}

CRITICAL: Return ONLY the raw data in the requested format. No explanations, no markdown code fences, no extra text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a dataset: ${prompt}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Strip markdown code fences
    content = content.replace(/^```[\w]*\n?/gm, "").replace(/\n?```$/gm, "").trim();

    return new Response(JSON.stringify({ data: content, format, rowCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-dataset error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
