import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, style, count, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const stylePrompts: Record<string, string> = {
      realistic: "Ultra-realistic, photographic quality, natural lighting, high detail",
      professional: "Clean, corporate, professional stock photo style, well-composed",
      artistic: "Creative, artistic interpretation, painterly style, expressive colors",
      minimal: "Minimalist, clean lines, simple composition, muted tones, elegant",
      "3d-render": "3D rendered, CGI quality, smooth surfaces, studio lighting",
      illustration: "Digital illustration, vector-like, flat design, vibrant and modern",
    };

    const styleInstruction = stylePrompts[style] || stylePrompts.realistic;
    const imageCount = Math.min(Math.max(count || 4, 1), 8);
    const images: { url: string; prompt: string }[] = [];

    // Generate images sequentially (API processes one at a time)
    for (let i = 0; i < imageCount; i++) {
      const variationPrompt = `${prompt}. Variation ${i + 1} of ${imageCount} — create a unique variation. Style: ${styleInstruction}. Ultra high resolution.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            { role: "user", content: variationPrompt },
          ],
          modalities: ["image", "text"],
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
        console.error(`Image generation error (${i + 1}):`, response.status, t);
        continue; // Skip failed images, continue with others
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (imageUrl) {
        images.push({ url: imageUrl, prompt: variationPrompt });
      }
    }

    if (images.length === 0) {
      throw new Error("Failed to generate any images");
    }

    // Store in Supabase storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Ensure bucket exists
    const { data: buckets } = await supabaseClient.storage.listBuckets();
    if (!buckets?.find(b => b.id === "generated-images")) {
      await supabaseClient.storage.createBucket("generated-images", { public: true });
    }

    const storedImages: { url: string; path: string }[] = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      // Convert base64 to buffer
      const base64Data = img.url.replace(/^data:image\/\w+;base64,/, "");
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      const filePath = `${userId}/${Date.now()}-${i}.png`;
      const { error: uploadError } = await supabaseClient.storage
        .from("generated-images")
        .upload(filePath, binaryData, { contentType: "image/png" });

      if (!uploadError) {
        const { data: urlData } = supabaseClient.storage
          .from("generated-images")
          .getPublicUrl(filePath);
        storedImages.push({ url: urlData.publicUrl, path: filePath });
      }
    }

    return new Response(JSON.stringify({ images: storedImages, count: storedImages.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-images error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
