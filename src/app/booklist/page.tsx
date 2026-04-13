"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Upload, 
  Search, 
  Filter, 
  MoreVertical, 
  FileUp, 
  Plus,
  Trash2,
  Edit,
  Library,
  Printer,
  X
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState, useRef, useEffect, useMemo } from "react";
import { Book, SCHOOLS } from "@/lib/types";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import Papa from "papaparse";
import { useToast } from "@/hooks/use-toast";
import jspdf from "jspdf";

export default function BooklistPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string>("1");

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ck-report-booklist");
    if (saved) {
      try {
        setBooks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load booklist", e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("ck-report-booklist", JSON.stringify(books));
  }, [books]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedBooks: Book[] = results.data.map((row: any, index: number) => ({
          id: Math.random().toString(36).substr(2, 9),
          class: (row.Class || row.class || "").toString().toUpperCase(),
          title: row["Book Name"] || row.bookname || row.Title || row.title || "",
          publisher: row.Publisher || row.publisher || "",
          price: row.Price || row.price || 0,
        }));

        if (parsedBooks.length > 0) {
          setBooks(prev => [...prev, ...parsedBooks]);
          toast({ title: "Import Successful", description: `${parsedBooks.length} books imported.` });
        }
        setIsUploading(false);
      },
      error: (error) => {
        toast({ title: "File Read Error", description: error.message, variant: "destructive" });
        setIsUploading(false);
      }
    });
  };

  const deleteBook = (id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
    toast({ title: "Book Deleted", variant: "destructive" });
  };

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchClass = selectedClass === "ALL" || b.class === selectedClass;
      const matchSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.publisher.toLowerCase().includes(searchTerm.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [books, selectedClass, searchTerm]);

  const classes = useMemo(() => {
    const unique = Array.from(new Set(books.map(b => b.class))).sort();
    return unique;
  }, [books]);

  const generatePDF = () => {
    if (selectedClass === "ALL") {
      toast({ title: "Select a Class", description: "Please filter by a specific class to generate the 4-in-1 booklist.", variant: "destructive" });
      return;
    }

    const classBooks = books.filter(b => b.class === selectedClass);
    if (classBooks.length === 0) {
      toast({ title: "No Books", description: "No books found for this class.", variant: "destructive" });
      return;
    }

    const doc = new jspdf({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const WIDTH = 297;
    const HEIGHT = 210;
    const MARGIN = 10;
    
    // 2x2 Grid dimensions
    const LIST_WIDTH = (WIDTH - (MARGIN * 3)) / 2;
    const LIST_HEIGHT = (HEIGHT - (MARGIN * 3)) / 2;

    const schoolInfo = SCHOOLS[selectedSchool];

    const drawList = (x: number, y: number) => {
      // Border
      doc.setDrawColor('#000000');
      doc.setLineWidth(0.3);
      doc.rect(x, y, LIST_WIDTH, LIST_HEIGHT);

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(schoolInfo.name, x + LIST_WIDTH / 2, y + 6, { align: "center" });
      doc.setFontSize(8);
      doc.text(schoolInfo.address, x + LIST_WIDTH / 2, y + 10, { align: "center" });
      
      doc.line(x, y + 13, x + LIST_WIDTH, y + 13);
      
      doc.setFontSize(9);
      doc.text(`BOOK LIST - CLASS: ${selectedClass}`, x + LIST_WIDTH / 2, y + 18, { align: "center" });
      
      // Table Header
      const col1X = x + 5;
      const col2X = x + 10;
      const col3X = x + LIST_WIDTH - 40;
      const col4X = x + LIST_WIDTH - 15;
      
      let cy = y + 25;
      doc.setFontSize(8);
      doc.text("S.N.", col1X, cy);
      doc.text("BOOK NAME", col2X, cy);
      doc.text("PUBLISHER", col3X, cy);
      doc.text("PRICE", col4X, cy, { align: "right" });
      
      cy += 2;
      doc.line(x + 5, cy, x + LIST_WIDTH - 5, cy);
      cy += 5;

      // Table Rows
      doc.setFont("helvetica", "normal");
      classBooks.forEach((book, idx) => {
        if (cy > y + LIST_HEIGHT - 10) return; // Prevent overflow
        doc.text((idx + 1).toString(), col1X, cy);
        
        // Truncate title if too long
        let title = book.title;
        if (title.length > 35) title = title.substring(0, 32) + "...";
        doc.text(title, col2X, cy);
        
        let pub = book.publisher;
        if (pub.length > 20) pub = pub.substring(0, 17) + "...";
        doc.text(pub, col3X, cy);
        
        doc.text(book.price.toString(), col4X, cy, { align: "right" });
        cy += 5;
      });

      // Footer
      doc.setFontSize(7);
      doc.text("Note: Prices are subject to change.", x + 5, y + LIST_HEIGHT - 5);
      doc.text("Principal Signature", x + LIST_WIDTH - 5, y + LIST_HEIGHT - 5, { align: "right" });
    };

    // Draw 4 copies
    drawList(MARGIN, MARGIN); // Top Left
    drawList(MARGIN * 2 + LIST_WIDTH, MARGIN); // Top Right
    drawList(MARGIN, MARGIN * 2 + LIST_HEIGHT); // Bottom Left
    drawList(MARGIN * 2 + LIST_WIDTH, MARGIN * 2 + LIST_HEIGHT); // Bottom Right

    doc.save(`Booklist_Class_${selectedClass}.pdf`);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline text-primary">Booklist Manager</h2>
            <p className="text-muted-foreground mt-1">Manage class-wise book requirements and prices.</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
            <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              <Upload className="size-4" />
              {isUploading ? "Uploading..." : "Import CSV"}
            </Button>
            <Button className="gap-2" onClick={generatePDF}>
              <Printer className="size-4" />
              Download 4-in-1 PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-1 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>School</Label>
                <Select onValueChange={setSelectedSchool} value={selectedSchool}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(SCHOOLS).map(s => (
                      <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select onValueChange={setSelectedClass} value={selectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Classes</SelectItem>
                    {['NUR', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(lvl => (
                      <SelectItem key={lvl} value={lvl}>Class {lvl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative pt-4">
                <Search className="absolute left-3 top-[calc(1rem+1.25rem)] size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search books..." 
                  className="pl-10" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3 border-none shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 h-10">
                    <TableHead className="w-[80px] text-[11px] font-bold uppercase">Class</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase">Book Name</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase">Publisher</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-right">Price</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.map((book) => (
                    <TableRow key={book.id} className="hover:bg-secondary/10 transition-colors h-10">
                      <TableCell className="font-bold text-[11px]">{book.class}</TableCell>
                      <TableCell className="text-[11px] font-medium">{book.title}</TableCell>
                      <TableCell className="text-[11px] opacity-70">{book.publisher}</TableCell>
                      <TableCell className="text-[11px] text-right font-bold text-primary">₹{book.price}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => deleteBook(book.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredBooks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Library className="size-12 mb-4 opacity-20" />
                  <p>No books found. Import a CSV to populate the list.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
