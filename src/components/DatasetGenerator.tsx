import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Download, Sparkles, Globe, Cpu, Shuffle,
  FileJson, FileSpreadsheet, Database as DbIcon, FileText, FileCode,
  Image, Palette, Camera, Brush, Box, PenTool,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

const formats = [
  { value: "csv", label: "CSV", icon: FileSpreadsheet },
  { value: "json", label: "JSON", icon: FileJson },
  { value: "sql", label: "SQL", icon: DbIcon },
  { value: "xml", label: "XML", icon: FileCode },
  { value: "yaml", label: "YAML", icon: FileText },
  { value: "tsv", label: "Excel (TSV)", icon: FileSpreadsheet },
  { value: "txt", label: "Plain Text", icon: FileText },
];

const sourceModes = [
  { value: "synthetic", label: "AI Synthetic", icon: Cpu, desc: "Pure AI-generated data" },
  { value: "web", label: "Web Scraping", icon: Globe, desc: "Real-world patterns via Firecrawl" },
  { value: "hybrid", label: "Hybrid", icon: Shuffle, desc: "Best of both worlds" },
];

const imageStyles = [
  { value: "realistic", label: "Realistic", icon: Camera, desc: "Photographic quality" },
  { value: "professional", label: "Professional", icon: Palette, desc: "Clean stock photos" },
  { value: "artistic", label: "Artistic", icon: Brush, desc: "Creative & expressive" },
  { value: "minimal", label: "Minimal", icon: PenTool, desc: "Simple & elegant" },
  { value: "3d-render", label: "3D Render", icon: Box, desc: "CGI quality" },
  { value: "illustration", label: "Illustration", icon: Image, desc: "Digital art style" },
];

const examplePrompts = [
  "100 e-commerce product listings with name, price, category, rating, and stock status",
  "50 customer support tickets with priority, status, agent, and resolution time",
  "200 employee records with department, salary, hire date, and performance score",
];

const imageExamplePrompts = [
  "Product photos of sneakers on white background",
  "Professional headshots of diverse business people",
  "Food photography of gourmet desserts",
  "Modern office interior design concepts",
];

const DatasetGenerator = () => {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"tabular" | "image">("tabular");
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("csv");
  const [sourceMode, setSourceMode] = useState("synthetic");
  const [rowCount, setRowCount] = useState(50);
  const [quality, setQuality] = useState({ realistic: true, statistical: true, complete: true, noiseFree: true });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Image-specific state
  const [imageStyle, setImageStyle] = useState("realistic");
  const [imageCount, setImageCount] = useState(4);
  const [generatedImages, setGeneratedImages] = useState<{ url: string; path: string }[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Enter a prompt", description: "Describe the dataset you want to generate.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to generate datasets.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setResult(null);
    setGeneratedImages([]);

    try {
      if (mode === "image") {
        await handleImageGeneration();
      } else {
        await handleTabularGeneration();
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message || "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleTabularGeneration = async () => {
    let webContext = "";
    if (sourceMode === "web" || sourceMode === "hybrid") {
      const { data: scrapeData } = await supabase.functions.invoke("scrape-web-data", {
        body: { query: prompt },
      });
      if (scrapeData?.results?.length) {
        webContext = scrapeData.results.map((r: any) => `Source: ${r.title}\n${r.content}`).join("\n\n");
      }
    }

    const { data, error } = await supabase.functions.invoke("generate-dataset", {
      body: { prompt, format, rowCount, webContext: webContext || undefined, qualityOptions: quality },
    });

    if (error) throw error;
    if (data?.error) {
      toast({ title: "Generation failed", description: data.error, variant: "destructive" });
      return;
    }

    setResult(data.data);

    await supabase.from("datasets").insert({
      user_id: user!.id, prompt, format, data: data.data, row_count: rowCount, source_mode: sourceMode,
    });

    toast({ title: "Dataset generated!", description: `${rowCount} rows in ${format.toUpperCase()} format.` });
  };

  const handleImageGeneration = async () => {
    const { data, error } = await supabase.functions.invoke("generate-images", {
      body: { prompt, style: imageStyle, count: imageCount, userId: user!.id },
    });

    if (error) throw error;
    if (data?.error) {
      toast({ title: "Generation failed", description: data.error, variant: "destructive" });
      return;
    }

    setGeneratedImages(data.images || []);

    await supabase.from("datasets").insert({
      user_id: user!.id,
      prompt,
      format: "image",
      data: JSON.stringify(data.images),
      row_count: data.count,
      source_mode: `image-${imageStyle}`,
    });

    toast({ title: "Images generated!", description: `${data.count} images created in ${imageStyle} style.` });
  };

  const handleDownload = () => {
    if (!result) return;
    const ext: Record<string, string> = { csv: ".csv", json: ".json", sql: ".sql", xml: ".xml", yaml: ".yaml", tsv: ".tsv", txt: ".txt" };
    const blob = new Blob([result], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dataset${ext[format] || ".txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadImage = async (imageUrl: string, index: number) => {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `image-${index + 1}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentExamples = mode === "image" ? imageExamplePrompts : examplePrompts;

  return (
    <section id="generator" className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient">Generate</span> Your Dataset
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Describe what you need and let AI create it for you.
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="max-w-4xl mx-auto mb-8">
          <Tabs value={mode} onValueChange={(v) => { setMode(v as "tabular" | "image"); setResult(null); setGeneratedImages([]); }}>
            <TabsList className="grid w-full max-w-xs mx-auto grid-cols-2">
              <TabsTrigger value="tabular" className="flex items-center gap-2">
                <DbIcon className="w-4 h-4" />
                Tabular Data
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Images
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="max-w-4xl mx-auto grid gap-8 lg:grid-cols-[1fr,320px]">
          {/* Main form */}
          <div className="space-y-6">
            {/* Prompt */}
            <div>
              <Label className="text-base font-semibold mb-2 block">
                {mode === "image" ? "Describe the images you need" : "Describe your dataset"}
              </Label>
              <Textarea
                placeholder={mode === "image"
                  ? "e.g. Product photos of sneakers on white background"
                  : "e.g. 100 e-commerce product listings with prices, ratings, and categories"
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] resize-none text-base"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {currentExamples.map((ep) => (
                  <button
                    key={ep}
                    onClick={() => setPrompt(ep)}
                    className="text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors truncate max-w-[280px]"
                  >
                    {ep}
                  </button>
                ))}
              </div>
            </div>

            {mode === "tabular" ? (
              <>
                {/* Source mode */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Data Source</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {sourceModes.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setSourceMode(m.value)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          sourceMode === m.value
                            ? "border-primary bg-primary/5 shadow-card"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <m.icon className={`w-5 h-5 mb-2 ${sourceMode === m.value ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="font-medium text-sm">{m.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format + Row count */}
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-semibold mb-2 block">Format</Label>
                    <Select value={format} onValueChange={setFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {formats.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            <span className="flex items-center gap-2">
                              <f.icon className="w-4 h-4" />
                              {f.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-base font-semibold mb-2 block">
                      Rows: <span className="text-primary">{rowCount}</span>
                    </Label>
                    <Slider
                      value={[rowCount]}
                      onValueChange={([v]) => setRowCount(v)}
                      min={10}
                      max={500}
                      step={10}
                      className="mt-3"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Image style */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Image Style</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {imageStyles.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setImageStyle(s.value)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          imageStyle === s.value
                            ? "border-primary bg-primary/5 shadow-card"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <s.icon className={`w-5 h-5 mb-2 ${imageStyle === s.value ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="font-medium text-sm">{s.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image count */}
                <div>
                  <Label className="text-base font-semibold mb-2 block">
                    Images: <span className="text-primary">{imageCount}</span>
                  </Label>
                  <Slider
                    value={[imageCount]}
                    onValueChange={([v]) => setImageCount(v)}
                    min={1}
                    max={8}
                    step={1}
                    className="mt-3"
                  />
                </div>
              </>
            )}

            {/* Generate button */}
            <Button
              size="lg"
              className="w-full shadow-primary text-base"
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === "image" ? "Generating Images..." : "Generating..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {mode === "image" ? "Generate Images" : "Generate Dataset"}
                </>
              )}
            </Button>
          </div>

          {/* Sidebar */}
          <div className="bg-card border border-border/50 rounded-xl p-5 shadow-card h-fit space-y-5">
            {mode === "tabular" ? (
              <>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Quality Controls</h3>
                {(
                  [
                    { key: "realistic", label: "Realistic Values", desc: "Match real-world distributions" },
                    { key: "statistical", label: "Statistical Accuracy", desc: "Proper field correlations" },
                    { key: "complete", label: "Complete Data", desc: "No missing values" },
                    { key: "noiseFree", label: "Noise-Free", desc: "Clean, consistent output" },
                  ] as const
                ).map((opt) => (
                  <div key={opt.key} className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </div>
                    <Switch
                      checked={quality[opt.key]}
                      onCheckedChange={(v) => setQuality((prev) => ({ ...prev, [opt.key]: v }))}
                    />
                  </div>
                ))}
              </>
            ) : (
              <>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Image Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary">
                    <Image className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-muted-foreground">
                      Images are stored in your account and available for download as PNG files.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary">
                    <Palette className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-muted-foreground">
                      Try different styles to find the perfect visual tone for your dataset.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabular Result */}
        {result && mode === "tabular" && (
          <div className="max-w-4xl mx-auto mt-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Generated Data</h3>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download {format.toUpperCase()}
              </Button>
            </div>
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-card">
              <pre className="p-5 text-sm font-mono overflow-auto max-h-[400px] text-foreground/80 whitespace-pre-wrap">
                {result}
              </pre>
            </div>
          </div>
        )}

        {/* Image Result */}
        {generatedImages.length > 0 && mode === "image" && (
          <div className="max-w-4xl mx-auto mt-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Generated Images</h3>
              <span className="text-sm text-muted-foreground">{generatedImages.length} images</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {generatedImages.map((img, i) => (
                <div key={i} className="group relative rounded-xl overflow-hidden border border-border/50 bg-card shadow-card aspect-square">
                  <img
                    src={img.url}
                    alt={`Generated image ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownloadImage(img.url, i)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default DatasetGenerator;
