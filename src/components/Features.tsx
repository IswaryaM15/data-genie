import { Brain, FileJson, Zap, Globe, Shield, ImageIcon } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "LLM Intelligence",
    description: "Gemini-powered generation creates contextually accurate, statistically sound data.",
  },
  {
    icon: FileJson,
    title: "7 Export Formats",
    description: "CSV, JSON, SQL, XML, YAML, Excel (TSV), and plain text — one prompt, any format.",
  },
  {
    icon: Zap,
    title: "Instant Generation",
    description: "Get up to 500 rows of production-ready data in seconds, not hours.",
  },
  {
    icon: Globe,
    title: "Hybrid Mode",
    description: "Blend real web-scraped patterns with AI generation for maximum realism.",
  },
  {
    icon: Shield,
    title: "Quality Controls",
    description: "Toggle realistic distributions, statistical accuracy, completeness, and noise removal.",
  },
  {
    icon: ImageIcon,
    title: "Image Datasets",
    description: "Generate visual datasets with style variations — product photos, avatars, and more.",
  },
];

const Features = () => {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-glow pointer-events-none" />
      <div className="container mx-auto px-6 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to{" "}
            <span className="text-gradient">Generate Data</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            A complete toolkit for creating realistic, production-ready datasets with AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group p-6 rounded-xl shadow-card bg-card border border-border/50 hover:shadow-card-hover hover:border-primary/20 transition-all duration-300"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
