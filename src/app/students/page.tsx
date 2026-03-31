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
  UserPlus,
  Trash2,
  Edit,
  Users
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useState, useRef } from "react";
import { MOCK_STUDENTS, DEFAULT_TEMPLATE, Student, SCHOOLS, MarksheetTemplate, Grade, getMaxMarksPerTerm, getMaxTheoryMarks, getMaxPracticalMarks } from "@/lib/types";
import Papa from "papaparse";
import { useToast } from "@/hooks/use-toast";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const validationErrors: string[] = [];
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedStudents: Student[] = results.data.map((row: any, index: number) => {
          const grades: Grade[] = [];
          for (let i = 1; i <= 20; i++) {
            const subNameKey = `subject${i}_name`;
            if (row[subNameKey]) {
              const grade: Grade = {
                subject: row[subNameKey],
                term1: 0, term2: 0, term3: 0, term4: 0,
                details: { term1: { theory: 0, practical: 0 }, term2: { theory: 0, practical: 0 }, term3: { theory: 0, practical: 0 }, term4: { theory: 0, practical: 0 } }
              };
              const gradeLevel = row.gradeLevel || "1";
              const maxT = getMaxTheoryMarks(gradeLevel);
              const maxP = getMaxPracticalMarks(gradeLevel);

              [1, 2, 3, 4].forEach(t => {
                const theory = parseInt(row[`subject${i}_t${t}_theory`]) || 0;
                const practical = parseInt(row[`subject${i}_t${t}_practical`]) || 0;

                if (theory > maxT) {
                  validationErrors.push(`${row.name}: ${row[subNameKey] || "Subject"} Theory (${theory}) > ${maxT}`);
                }
                if (practical > maxP) {
                  validationErrors.push(`${row.name}: ${row[subNameKey] || "Subject"} Practical (${practical}) > ${maxP}`);
                }

                (grade as any)[`term${t}`] = theory + practical;
                if (grade.details) (grade.details as any)[`term${t}`] = { theory, practical };
              });
              grades.push(grade);
            }
          }
          let rawCode = "1";
          if (row.schoolCode) {
            const parsed = parseInt(String(row.schoolCode).trim());
            if (!isNaN(parsed)) rawCode = String(parsed);
          }
          return {
            id: row.id || index.toString(),
            name: row.name || "",
            studentId: row.id || index.toString(),
            fathersName: row.fathersName || "",
            mothersName: row.mothersName || "",
            dob: row.dob || "",
            penNo: row.penNo || "",
            class: row.class || "",
            rollNo: row.rollNo || "",
            srNo: row.srNo || "",
            address: row.address || "",
            schoolCode: rawCode,
            gradeLevel: row.gradeLevel || "1",
            attendance: { totalDays: parseInt(row.attendance_total) || 200, presentDays: parseInt(row.attendance_present) || 0 },
            coScholastic: {
              discipline: row.cs_discipline || "A",
              pt: row.cs_pt || "A",
              music: row.cs_music || "A",
              art: row.cs_art || "A",
              yoga: row.cs_yoga || "A"
            },
            optionalSubjectCode: parseInt(row.optionalCode) || 1,
            grades: grades
          };
        });

        if (parsedStudents.length > 0) {
          setStudents(parsedStudents);
          if (validationErrors.length > 0) {
            toast({
              title: "Imported with Warnings",
              description: `Found ${validationErrors.length} mark limit violations.`,
              variant: "destructive"
            });
            console.warn("Validation Errors:", validationErrors);
          } else {
            toast({ title: "Upload Successful", description: `${parsedStudents.length} student records imported.` });
          }
        }
        setIsUploading(false);
      },
      error: (error) => {
        toast({ title: "File Read Error", description: error.message, variant: "destructive" });
        setIsUploading(false);
      }
    });
  };

  const deleteStudent = (id: string) => {
    setStudents(students.filter(s => s.id !== id));
    toast({
      title: "Student Deleted",
      variant: "destructive",
    });
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline text-primary">Student Records</h2>
            <p className="text-muted-foreground mt-1">Manage and upload student academic data for report generation.</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx" onChange={handleFileUpload} />
            <Button variant="outline" className="flex items-center gap-2" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              <Upload className="size-4" />
              {isUploading ? "Uploading..." : "Import CSV/XLSX"}
            </Button>
            <Button className="bg-primary hover:bg-primary/90 flex items-center gap-2">
              <UserPlus className="size-4" />
              Add Student
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader className="border-b pb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search students by name or ID..." className="pl-10" />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button variant="outline" className="flex-1 md:flex-none gap-2">
                  <Filter className="size-4" />
                  Filter
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 md:flex-none gap-2">
                      <FileUp className="size-4" />
                      Export List
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Export as CSV</DropdownMenuItem>
                    <DropdownMenuItem>Export as XLSX</DropdownMenuItem>
                    <DropdownMenuItem>Print Directory</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="w-[200px]">Student Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id} className="hover:bg-secondary/20 transition-colors">
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>{student.rollNo}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            <Edit className="size-4" /> Edit Record
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => deleteStudent(student.id)}>
                            <Trash2 className="size-4" /> Delete Student
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {students.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Users className="size-12 mb-4 opacity-20" />
                <p>No students found. Upload a file to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}