import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap, Download } from "lucide-react";

const stats = [
  { label: "Formats", value: "7+" },
  { label: "Max Rows", value: "500" },
  { label: "AI Models", value: "2" },
];

const Hero = () => {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    let y = 0;
    let animId: number;
    const animate = () => {
      y = (y + 0.15) % 40;
      grid.style.transform = `translateY(${y}px)`;
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-hero">
      {/* Animated grid */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.07]">
        <div
          ref={gridRef}
          className="absolute inset-[-40px] bg-[length:40px_40px]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(0 0% 100% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.4) 1px, transparent 1px)",
          }}
        />
      </div>

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: "3s" }} />

      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-up">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span className="text-sm font-medium text-primary-foreground/80">AI-Powered Dataset Generation</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-primary-foreground leading-[1.1] mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          Generate Datasets{" "}
          <span className="text-gradient">Instantly</span>
        </h1>

        <p className="text-lg md:text-xl text-primary-foreground/60 max-w-2xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          Describe your data in plain English and get production-ready datasets
          in CSV, JSON, SQL, and more. Powered by AI with optional web-sourced realism.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <Button size="lg" className="shadow-primary text-base px-8" asChild>
            <a href="#generator">
              <Zap className="w-4 h-4 mr-2" />
              Start Generating
            </a>
          </Button>
          <Button size="lg" variant="outline" className="text-base px-8 border-primary-foreground/20 text-primary-foreground/80 hover:bg-primary-foreground/5" asChild>
            <Link to="/auth">
              <ArrowRight className="w-4 h-4 mr-2" />
              Create Account
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 md:gap-16 animate-fade-up" style={{ animationDelay: "0.4s" }}>
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary-foreground">{stat.value}</div>
              <div className="text-sm text-primary-foreground/40 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
