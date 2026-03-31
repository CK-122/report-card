"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  Share2, 
  Printer,
  Archive,
  History,
  FileSearch
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ExportPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleExport = () => {
    setIsExporting(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          toast({
            title: "Export Complete",
            description: "All report cards have been prepared for download.",
          });
          return 100;
        }
        return p + 10;
      });
    }, 300);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline text-primary">Export & Archives</h2>
          <p className="text-muted-foreground mt-1">Generate final PDF files and manage historical records.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-sm h-fit">
            <CardHeader>
              <CardTitle>Batch Export (PDF)</CardTitle>
              <CardDescription>Finalize 1,248 report cards for Term 2, 2024</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {isExporting ? (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Generating high-resolution PDFs...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">System is processing student branding, grades, and AI-generated narratives into print-ready documents.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-lg bg-secondary/5">
                  <FileText className="size-12 text-primary/20 mb-4" />
                  <p className="text-sm text-muted-foreground text-center max-w-sm px-4">Ready to generate final report cards for the entire institution using the "Standard Report Card" template.</p>
                  <Button className="mt-6 bg-primary hover:bg-primary/90 gap-2" size="lg" onClick={handleExport}>
                    <Download className="size-4" /> Start Batch Export
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Button variant="outline" className="flex-col h-24 gap-2">
                  <Printer className="size-5" />
                  <span className="text-xs">Print All</span>
                </Button>
                <Button variant="outline" className="flex-col h-24 gap-2">
                  <Share2 className="size-5" />
                  <span className="text-xs">Publish Online</span>
                </Button>
                <Button variant="outline" className="flex-col h-24 gap-2">
                  <Archive className="size-5" />
                  <span className="text-xs">Save to Archive</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Recent Archives</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: 'Term 1, 2024', date: 'Jan 15, 2024', count: 1210 },
                  { name: 'Annual 2023', date: 'Dec 10, 2023', count: 1180 },
                  { name: 'Term 3, 2023', date: 'Sep 22, 2023', count: 1205 },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-md hover:bg-secondary/20 transition-colors cursor-pointer group">
                    <div>
                      <p className="text-sm font-bold group-hover:text-primary transition-colors">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.date} • {item.count} reports</p>
                    </div>
                    <FileSearch className="size-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                ))}
                <Button variant="ghost" className="w-full gap-2 text-primary" size="sm">
                  <History className="size-4" /> View Full History
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-accent text-accent-foreground">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="size-5" />
                  Compliance Ready
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-accent-foreground/80 leading-relaxed">
                  GradeFlow Pro ensures all exports meet standard academic compliance for digital archiving and official certification. All PDF exports are digitally signed and timestamped.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}