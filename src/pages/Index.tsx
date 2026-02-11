import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import DatasetGenerator from "@/components/DatasetGenerator";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <Features />
      <DatasetGenerator />
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} DataForge. AI-powered dataset generation.
        </div>
      </footer>
    </div>
  );
};

export default Index;
