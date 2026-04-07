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
import { 
  MOCK_STUDENTS, 
  DEFAULT_TEMPLATE, 
  Student, 
  SCHOOLS, 
  MarksheetTemplate, 
  Grade, 
  getMaxMarksPerTerm, 
  getMaxTheoryMarks, 
  getMaxPracticalMarks,
  getSubjectsByGrade,
  SubjectDef,
  resolveSubjectName,
  formatDateToIndian,
  calculateAttendance
} from "@/lib/types";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import Papa from "papaparse";
import { useToast } from "@/hooks/use-toast";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [isClassPromptOpen, setIsClassPromptOpen] = useState(false);
  const [selectedPromptClass, setSelectedPromptClass] = useState<string>("");
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("ck-report-students");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Normalize existing data for case-insensitivity
        const normalized = parsed.map((s: any) => ({
          ...s,
          class: (s.class || "").toUpperCase(),
          gradeLevel: (s.gradeLevel || "1").toUpperCase()
        }));
        setStudents(normalized);
        localStorage.setItem("ck-report-students", JSON.stringify(normalized));
      } catch (e) {
        console.error("Failed to load students", e);
        setStudents(MOCK_STUDENTS);
      }
    } else {
      setStudents(MOCK_STUDENTS);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (students.length > 0) {
      localStorage.setItem("ck-report-students", JSON.stringify(students));
    }
  }, [students]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const validationErrors: string[] = [];
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => {
        // More robust header normalization: Remove spaces AND underscores
        return h.trim().toLowerCase()
          .replace(/[\s_]+/g, '') // Remove spaces and underscores
          .replace(/[^a-z0-9]/g, ''); // Remove other special characters
      },
      complete: (results) => {
        const parsedStudents: Student[] = results.data.map((row: any, index: number) => {
          const grades: Grade[] = [];
          const gradeLevel = (row.gradelevel || row.gradeLevel || row.class || "1").toUpperCase();
          const defaultSubjects = getSubjectsByGrade(gradeLevel);
          const dobVal = formatDateToIndian(row.dob || row.date_of_birth || row.dateofbirth);

          for (let i = 1; i <= 9; i++) {
            const subNameKey = `subject${i}name`;
            let subjectNameVal = row[subNameKey];
            
            // Check if any marks exist for this index even if name is missing
            const tKeys = [1, 2, 3, 4].map(t => `subject${i}t${t}theory`);
            const pKeys = [1, 2, 3, 4].map(t => `subject${i}t${t}practical`);
            const hasAnyMarks = [...tKeys, ...pKeys].some(k => row[k] !== undefined && row[k] !== "");

            // Pre-resolve the subject name if it exists or if we fall back to default
            const optionalCode = parseInt(row.optionalcode || row.optional_code) || 1;
            
            if (subjectNameVal) {
              subjectNameVal = resolveSubjectName(subjectNameVal, gradeLevel, optionalCode);
            } else if (hasAnyMarks && defaultSubjects[i - 1]) {
              subjectNameVal = resolveSubjectName(defaultSubjects[i - 1].name, gradeLevel, optionalCode);
            }

            if (subjectNameVal) {
              const grade: Grade = {
                subject: subjectNameVal,
                term1: 0, term2: 0, term3: 0, term4: 0,
                details: { term1: { theory: 0, practical: 0 }, term2: { theory: 0, practical: 0 }, term3: { theory: 0, practical: 0 }, term4: { theory: 0, practical: 0 } }
              };
              
              const maxT = getMaxTheoryMarks(gradeLevel);
              const maxP = getMaxPracticalMarks(gradeLevel);

              [1, 2, 3, 4].forEach(t => {
                const theoryKey = `subject${i}t${t}theory`;
                const practicalKey = `subject${i}t${t}practical`;
                const theory = parseInt(row[theoryKey]) || 0;
                const practical = parseInt(row[practicalKey]) || 0;

                if (theory > maxT) {
                  validationErrors.push(`${row.name || "Student"}: ${subjectNameVal} Theory (${theory}) > ${maxT} in T${t}`);
                }
                if (practical > maxP) {
                  validationErrors.push(`${row.name || "Student"}: ${subjectNameVal} Practical (${practical}) > ${maxP} in T${t}`);
                }

                (grade as any)[`term${t}`] = theory + practical;
                if (grade.details) (grade.details as any)[`term${t}`] = { theory, practical };
              });
              grades.push(grade);
            }
          }
          let rawCode = "1";
          const schoolCodeVal = row.schoolcode || row.schoolCode || row.school_code;
          if (schoolCodeVal) {
            const parsed = parseInt(String(schoolCodeVal).trim());
            if (!isNaN(parsed)) rawCode = String(parsed);
          }
          return {
            id: row.id || index.toString(),
            name: row.name || row.studentname || "",
            studentId: row.id || index.toString(),
            fathersName: row.fathersname || row.fathername || "",
            mothersName: row.mothersname || row.mothername || "",
            dob: dobVal,
            class: (row.class || "").toUpperCase(),
            rollNo: row.rollno || row.roll_no || "",
            srNo: row.srno || row.sr_no || "",
            address: row.address || "",
            schoolCode: rawCode,
            gradeLevel: gradeLevel,
            attendance: calculateAttendance(0), // Placeholder
            coScholastic: {
              discipline: row.csdiscipline || row.cs_discipline || "A",
              pt: row.cspt || row.cs_pt || "A",
              music: row.csmusic || row.cs_music || "A",
              art: row.csart || row.cs_art || "A",
              yoga: row.csyoga || row.cs_yoga || "A"
            },
            optionalSubjectCode: parseInt(row.optionalcode || row.optional_code) || 1,
            grades: grades
          };
        });

        // Update attendance based on marks for each student
        const studentsWithAttendance = parsedStudents.map(student => {
          let totalPossible = student.grades.length * (getMaxTheoryMarks(student.gradeLevel) + getMaxPracticalMarks(student.gradeLevel)) * 4;
          let totalObtained = student.grades.reduce((sum, g) => sum + g.term1 + g.term2 + g.term3 + g.term4, 0);
          if (totalPossible === 0) totalPossible = 1;
          const perc = (totalObtained / totalPossible) * 100;
          return {
            ...student,
            attendance: calculateAttendance(perc)
          };
        });

        if (studentsWithAttendance.length > 0) {
          const missingClass = studentsWithAttendance.some(s => !s.class);
          if (missingClass) {
            setPendingStudents(studentsWithAttendance);
            setIsClassPromptOpen(true);
          } else {
            setStudents(studentsWithAttendance);
            localStorage.setItem('ck-report-students', JSON.stringify(studentsWithAttendance));
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
    setStudents(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem("ck-report-students", JSON.stringify(updated));
      return updated;
    });
    toast({
      title: "Student Deleted",
      variant: "destructive",
    });
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent({ ...student });
    setIsEditDialogOpen(true);
  };

  const handleEditSave = () => {
    if (!editingStudent) return;
    
    setStudents(prev => {
      const updated = prev.map(s => s.id === editingStudent.id ? editingStudent : s);
      localStorage.setItem("ck-report-students", JSON.stringify(updated));
      return updated;
    });
    
    setIsEditDialogOpen(false);
    toast({
      title: "Student Updated",
      description: `${editingStudent.name}'s records have been updated.`
    });
  };

  const handleApplyClassToPending = () => {
    if (!selectedPromptClass) {
      toast({ title: "Select Class", description: "Please select a class to continue.", variant: "destructive" });
      return;
    }
    const updated = pendingStudents.map(s => ({ ...s, class: s.class || selectedPromptClass }));
    setStudents(updated);
    localStorage.setItem('ck-report-students', JSON.stringify(updated));
    setIsClassPromptOpen(false);
    setPendingStudents([]);
    toast({ title: "Import Complete", description: `Assigned ${selectedPromptClass} to missing records.` });
  };

  const getStudentMetrics = (student: Student) => {
    const termMax = getMaxMarksPerTerm(student.gradeLevel);
    const totalMaxPerSubject = termMax * 4;
    const totalObtained = student.grades.reduce((sum, g) => sum + g.term1 + g.term2 + g.term3 + g.term4, 0);
    const totalPossible = student.grades.length * totalMaxPerSubject;
    const percentage = totalPossible > 0 ? parseFloat(((totalObtained / totalPossible) * 100).toFixed(2)) : 0;
    return { totalObtained, percentage };
  };

  const studentsWithMetrics = useMemo(() => {
    // 1. Calculate basics for all
    const base = students.map(s => ({ ...s, ...getStudentMetrics(s) }));
    
    // 2. Group by school + class for rank calculation
    const groups: Record<string, number[]> = {};
    base.forEach(s => {
      const key = `${s.schoolCode}-${s.class}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s.totalObtained);
    });

    // 3. Sort each group for rank
    const sortedGroups: Record<string, number[]> = {};
    Object.keys(groups).forEach(k => {
      sortedGroups[k] = [...new Set(groups[k])].sort((a, b) => b - a);
    });

    // 4. Return students with rank
    return base.map(s => {
      const key = `${s.schoolCode}-${s.class}`;
      const rank = sortedGroups[key].indexOf(s.totalObtained) + 1;
      return { ...s, rank };
    });
  }, [students]);

  const handleExportCSV = () => {
    if (students.length === 0) {
      toast({ title: "No Data", description: "There are no student records to export.", variant: "destructive" });
      return;
    }

    const exportData = students.map(student => {
      const row: any = {
        id: student.id,
        name: student.name,
        fathersName: student.fathersName,
        mothersName: student.mothersName,
        dob: student.dob,
        class: student.class,
        rollNo: student.rollNo,
        srNo: student.srNo,
        address: student.address || "",
        schoolCode: student.schoolCode,
        gradeLevel: student.gradeLevel,
        optionalCode: student.optionalSubjectCode?.toString() || "1",
        cs_discipline: student.coScholastic?.discipline || "A",
        cs_pt: student.coScholastic?.pt || "A",
        cs_music: student.coScholastic?.music || "A",
        cs_art: student.coScholastic?.art || "A",
        cs_yoga: student.coScholastic?.yoga || "A",
      };

      // Map subjects back to flattened columns
      student.grades.forEach((grade, idx) => {
        const i = idx + 1;
        row[`subject${i}_name`] = grade.subject;
        [1, 2, 3, 4].forEach(t => {
          const detail = (grade.details as any)?.[`term${t}`];
          if (detail && (detail.theory > 0 || detail.practical > 0)) {
            row[`subject${i}_t${t}_theory`] = detail.theory;
            if (detail.practical > 0) row[`subject${i}_t${t}_practical`] = detail.practical;
          } else {
            row[`subject${i}_t${t}_theory`] = (grade as any)[`term${t}`] || "";
          }
        });
      });

      return row;
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Exported_Students_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Export Complete", description: "CSV file has been downloaded." });
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
                    <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
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
                <TableRow className="bg-secondary/30 h-10">
                  <TableHead className="w-[120px] text-[11px] font-bold uppercase">Name</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase">Father's Name</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase">Mother's Name</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase">Class</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase">Roll</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase">SR No</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase">DOB</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase text-primary">Marks</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase text-primary">%</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase text-primary">Rank</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsWithMetrics.map((student: Student & { totalObtained: number, percentage: number, rank: number }) => (
                  <TableRow key={student.id} className="hover:bg-secondary/10 transition-colors h-10">
                    <TableCell className="font-bold text-[11px] whitespace-nowrap">{student.name}</TableCell>
                    <TableCell className="text-[11px] opacity-70">{student.fathersName}</TableCell>
                    <TableCell className="text-[11px] opacity-70">{student.mothersName}</TableCell>
                    <TableCell className="text-[11px] font-bold">{student.class}</TableCell>
                    <TableCell className="text-[11px]">{student.rollNo}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">{student.srNo}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">{student.dob}</TableCell>
                    <TableCell className="text-[11px] font-black text-primary">{student.totalObtained}</TableCell>
                    <TableCell className="text-[11px] font-black text-primary">{student.percentage}%</TableCell>
                    <TableCell className="text-[11px]">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black ${
                        student.rank === 1 ? 'bg-yellow-100 text-yellow-800' : 
                        student.rank === 2 ? 'bg-gray-100 text-gray-800' : 
                        student.rank === 3 ? 'bg-orange-100 text-orange-800' : 
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {student.rank <= 3 ? `${student.rank}${student.rank === 1 ? 'ST' : student.rank === 2 ? 'ND' : 'RD'}` : '-'}
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
                          <DropdownMenuItem className="gap-2" onClick={() => handleEditClick(student)}>
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
      
      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student Profile</DialogTitle>
            <DialogDescription>Update baseline information for {editingStudent?.name}.</DialogDescription>
          </DialogHeader>
          
          {editingStudent && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Student Name</Label>
                <Input 
                  id="edit-name" 
                  value={editingStudent.name} 
                  onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-roll">Roll No</Label>
                <Input 
                  id="edit-roll" 
                  value={editingStudent.rollNo} 
                  onChange={(e) => setEditingStudent({...editingStudent, rollNo: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fathers">Father's Name</Label>
                <Input 
                  id="edit-fathers" 
                  value={editingStudent.fathersName} 
                  onChange={(e) => setEditingStudent({...editingStudent, fathersName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mothers">Mother's Name</Label>
                <Input 
                  id="edit-mothers" 
                  value={editingStudent.mothersName} 
                  onChange={(e) => setEditingStudent({...editingStudent, mothersName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dob">Date of Birth</Label>
                <Input 
                  id="edit-dob" 
                  value={editingStudent.dob} 
                  onChange={(e) => setEditingStudent({...editingStudent, dob: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sr">SR No</Label>
                <Input 
                  id="edit-sr" 
                  value={editingStudent.srNo} 
                  onChange={(e) => setEditingStudent({...editingStudent, srNo: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-class">Class</Label>
                <Input 
                  id="edit-class" 
                  value={editingStudent.class} 
                  onChange={(e) => setEditingStudent({...editingStudent, class: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-opt-code">Optional Subject Code (1-3)</Label>
                <Input 
                  id="edit-opt-code" 
                  type="number"
                  min="1"
                  max="3"
                  value={editingStudent.optionalSubjectCode || 1} 
                  onChange={(e) => setEditingStudent({...editingStudent, optionalSubjectCode: parseInt(e.target.value) || 1})}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input 
                  id="edit-address" 
                  value={editingStudent.address || ""} 
                  onChange={(e) => setEditingStudent({...editingStudent, address: e.target.value})}
                />
              </div>
              
              <div className="md:col-span-2 mt-4 border-t pt-4">
                <h4 className="text-sm font-bold uppercase mb-4 text-muted-foreground">Co-Scholastic</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Missing Class Prompt */}
      <Dialog open={isClassPromptOpen} onOpenChange={setIsClassPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Missing Class Data</DialogTitle>
            <DialogDescription>
              Some students in your CSV are missing a "Class". Please select a class to assign to all these records.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Assign to Class</Label>
            <Select onValueChange={setSelectedPromptClass} value={selectedPromptClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {['NUR', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(lvl => (
                  <SelectItem key={lvl} value={lvl}>Class {lvl}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClassPromptOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyClassToPending}>Import All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}