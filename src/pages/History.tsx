import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Download, Trash2, ArrowLeft, FileJson, Table } from "lucide-react";
import * as XLSX from "xlsx";

interface Dataset {
  id: string;
  prompt: string;
  format: string;
  data: any;
  row_count: number;
  source_mode: string;
  created_at: string;
}

const formatExtension: Record<string, string> = {
  csv: ".csv", json: ".json", sql: ".sql", xml: ".xml", yaml: ".yaml", txt: ".txt", xlsx: ".xlsx",
};

const History = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      fetchDatasets();
    };
    checkAuth();
  }, [navigate]);

  const fetchDatasets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("datasets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setDatasets((data as Dataset[]) || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("datasets").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setDatasets((prev) => prev.filter((d) => d.id !== id));
      toast({ title: "Deleted" });
    }
  };

  const handleDownload = (dataset: Dataset) => {
    const content = typeof dataset.data === "string" ? dataset.data : JSON.stringify(dataset.data, null, 2);
    if (dataset.format === "xlsx") {
      const wb = XLSX.read(content, { type: "string" });
      XLSX.writeFile(wb, "dataset.xlsx");
      return;
    }
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dataset${formatExtension[dataset.format] || ".txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-6 pt-24 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Generation History</h1>
            <p className="text-muted-foreground mt-1">Your previously generated datasets</p>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Back</Link>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading...</div>
        ) : datasets.length === 0 ? (
          <div className="text-center py-20">
            <Table className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">No datasets yet. Generate your first one!</p>
            <Button className="mt-4 shadow-primary" asChild>
              <Link to="/">Start Generating</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {datasets.map((ds) => (
              <div key={ds.id} className="bg-card border border-border/50 rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ds.prompt}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium text-xs uppercase">
                        <FileJson className="w-3 h-3" />{ds.format}
                      </span>
                      <span>{ds.row_count} rows</span>
                      <span>{ds.source_mode}</span>
                      <span>{new Date(ds.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleDownload(ds)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(ds.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
