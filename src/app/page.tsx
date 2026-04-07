"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileUp, 
  Image as ImageIcon, 
  PenTool, 
  CheckCircle2,
  School,
  UserCircle,
  Download,
  Loader2,
  FileSpreadsheet
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  Student, 
  SCHOOLS, 
  getMaxMarksPerTerm, 
  DEFAULT_TEMPLATE, 
  MarksheetTemplate, 
  Grade, 
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import jspdf from "jspdf";
import Papa from "papaparse";
import JSZip from "jszip";

const SUBJECT_ORDER = [
  "hindi written",
  "hindi oral",
  "hindi",
  "english written",
  "english oral",
  "english",
  "mathematics",
  "math written",
  "math oral",
  "math / h.s.c",
  "math",
  "science",
  "social science",
  "evs",
  "computer",
  "g.k.",
  "urdu",
  "sanskrit",
  "poem",
  "home science",
  "h.sci",
  "pustak kala",
  "p. kala",
  "craft",
  "drawing"
];

const getSubjectPriority = (subjectName: string) => {
  const lowerName = subjectName.toLowerCase();
  for (let i = 0; i < SUBJECT_ORDER.length; i++) {
    if (lowerName.includes(SUBJECT_ORDER[i])) {
      return i;
    }
  }
  return 999;
};

export default function MarksheetProHome() {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSchoolCode, setSelectedSchoolCode] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [logo, setLogo] = useState<string | null>(null);
  const [teacherSign, setTeacherSign] = useState<string | null>(null);
  const [principalSign, setPrincipalSign] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<number | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<MarksheetTemplate>(DEFAULT_TEMPLATE);
  
  const [templateGrade, setTemplateGrade] = useState<string>("");
  const [templateStudentCount, setTemplateStudentCount] = useState<number>(10);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [isClassPromptOpen, setIsClassPromptOpen] = useState(false);
  const [selectedPromptClass, setSelectedPromptClass] = useState<string>("");

  const { toast } = useToast();

  const dataInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const teacherSignInputRef = useRef<HTMLInputElement>(null);
  const principalSignInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedTemplate = localStorage.getItem('marksheet_template');
    if (savedTemplate) {
      try {
        const parsed = JSON.parse(savedTemplate);
        setCurrentTemplate({
          ...parsed,
          offsets: { ...parsed.offsets, headerY: parsed.offsets.headerY }
        });
      } catch (e) {}
    }

    const savedStudents = localStorage.getItem('ck-report-students');
    if (savedStudents) {
      try {
        const parsed = JSON.parse(savedStudents);
        if (parsed.length > 0) {
          // Normalize existing data for case-insensitivity
          const normalized = parsed.map((s: any) => ({
            ...s,
            class: (s.class || "").toUpperCase(),
            gradeLevel: (s.gradeLevel || "1").toUpperCase()
          }));
          setStudents(normalized);
          setDataLoaded(true);
          const codes = Array.from(new Set(normalized.map((s: any) => s.schoolCode))) as string[];
          if (codes.length === 1) setSelectedSchoolCode(codes[0]);
          
          // Save normalized back
          localStorage.setItem('ck-report-students', JSON.stringify(normalized));
        }
      } catch (e) {}
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          
          for (let i = 1; i <= 20; i++) {
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
                details: {
                  term1: { theory: 0, practical: 0 },
                  term2: { theory: 0, practical: 0 },
                  term3: { theory: 0, practical: 0 },
                  term4: { theory: 0, practical: 0 }
                }
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
                if (grade.details) {
                  (grade.details as any)[`term${t}`] = { theory, practical };
                }
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
            fathersName: row.fathersname || row.fathername || "",
            mothersName: row.mothersname || row.mothername || "",
            dob: dobVal,
            class: (row.class || "").toUpperCase(),
            rollNo: row.rollno || row.roll_no || "",
            srNo: row.srno || row.sr_no || "",
            address: row.address || "",
            schoolCode: rawCode,
            gradeLevel: gradeLevel,
            attendance: calculateAttendance(0), // Placeholder, will update after marks calculation
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
            setDataLoaded(true);
            
            if (validationErrors.length > 0) {
              toast({
                title: "Imported with Warnings",
                description: `Found ${validationErrors.length} mark limit violations. Please check the data.`,
                variant: "destructive"
              });
              console.warn("Validation Errors:", validationErrors);
            } else {
              toast({
                title: "Data Loaded Successfully",
                description: `${parsedStudents.length} student records found.`,
              });
            }
            
            const codes = Array.from(new Set(parsedStudents.map(s => s.schoolCode)));
            if (codes.length === 1) setSelectedSchoolCode(codes[0]);
            
            localStorage.setItem('ck-report-students', JSON.stringify(parsedStudents));
          }
        }
      },
      error: (error) => {
        toast({ title: "File Read Error", description: error.message, variant: "destructive" });
      }
    });
  };

  const handleApplyClassToPending = () => {
    if (!selectedPromptClass) {
      toast({ title: "Select Class", description: "Please select a class to continue.", variant: "destructive" });
      return;
    }
    const updated = pendingStudents.map(s => ({ ...s, class: s.class || selectedPromptClass }));
    setStudents(updated);
    setDataLoaded(true);
    localStorage.setItem('ck-report-students', JSON.stringify(updated));
    setIsClassPromptOpen(false);
    setPendingStudents([]);
    toast({ title: "Import Complete", description: `Assigned ${selectedPromptClass} to missing records.` });
  };

  const downloadSampleCSV = () => {
    if (!templateGrade) {
      toast({ title: "Select Grade", description: "Please select a grade level.", variant: "destructive" });
      return;
    }

    const subjects = getSubjectsByGrade(templateGrade);

    const baseHeaders = [
      "id", "name", "fathersName", "mothersName", "dob", "class", 
      "rollNo", "srNo", "address", "schoolCode", "gradeLevel", "optionalCode",
      "cs_discipline", "cs_pt", "cs_music", "cs_art", "cs_yoga"
    ];

    const dynamicHeaders: string[] = [];
    subjects.forEach((sub, index) => {
      const idx = index + 1;
      dynamicHeaders.push(`subject${idx}_name`);
      [1, 2, 3, 4].forEach(t => {
        dynamicHeaders.push(`subject${idx}_t${t}_theory`);
        if (sub.hasPractical) {
          dynamicHeaders.push(`subject${idx}_t${t}_practical`);
        }
      });
    });

    const fullHeaders = [...baseHeaders, ...dynamicHeaders];
    let csvContent = fullHeaders.join(",") + "\n";

    const currentSchoolCode = selectedSchoolCode || "1";
    
    for (let i = 1; i <= templateStudentCount; i++) {
      const rowParts: string[] = [
        i.toString(), // id
        `Student ${i}`, // name
        "Father Name", // fathersName
        "Mother Name", // mothersName
        "2010-01-01", // dob
        templateGrade, // class
        i.toString(), // rollNo
        `SR-${1000 + i}`, // srNo
        "Address Line", // address
        currentSchoolCode, // schoolCode
        templateGrade, // gradeLevel
        "1", // optionalCode
        "A", "A", "A", "A", "A" // co-scholastic
      ];

      subjects.forEach((sub) => {
        rowParts.push(`"${sub.name}"`);
        [1, 2, 3, 4].forEach(() => {
          rowParts.push("");
          if (sub.hasPractical) {
            rowParts.push("");
          }
        });
      });

      csvContent += rowParts.join(",") + "\n";
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Template_Class_${templateGrade}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIsTemplateDialogOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
        toast({ title: "Asset Updated", description: `${file.name} uploaded successfully.` });
      };
      reader.readAsDataURL(file);
    }
  };

  const availableSchools = useMemo(() => {
    const codes = Array.from(new Set(students.map(s => s.schoolCode))).filter(Boolean);
    return codes.map(code => SCHOOLS[code]).filter(Boolean);
  }, [students]);

  const availableClasses = useMemo(() => {
    if (!selectedSchoolCode) return [];
    return Array.from(new Set(
      students
        .filter(s => s.schoolCode === selectedSchoolCode)
        .map(s => (s.class || "").toUpperCase())
        .filter(Boolean)
    )).sort((a, b) => {
      const order = ['NUR', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
      const idxA = order.indexOf(String(a));
      const idxB = order.indexOf(String(b));
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return String(a).localeCompare(String(b));
    });
  }, [students, selectedSchoolCode]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.schoolCode === selectedSchoolCode && 
      s.class === selectedClass
    );
  }, [students, selectedSchoolCode, selectedClass]);

  const getFilteredGrades = (student: Student) => {
    const level = student.gradeLevel.toUpperCase();
    const code = student.optionalSubjectCode || 1;

    return student.grades.filter(g => {
      const sub = g.subject.toLowerCase();
      if (['NUR', 'LKG', 'UKG'].includes(level)) {
        if (sub.includes('urdu / poem')) return true;
      } else if (parseInt(level) >= 1 && parseInt(level) <= 5) {
        if (sub.includes('urdu / sans')) return true;
      } else if (parseInt(level) >= 6 && parseInt(level) <= 8) {
        if (sub.includes('urdu / sans')) return true;
        if (sub.includes('h.sci. / p. kala') || sub.includes('h.s.c. / p. kala')) return true;
      } else if (parseInt(level) >= 9) {
        if (sub.includes('math / h.s.c')) return true;
      }
      return !['urdu / poem', 'urdu / sans', 'h.sci. / p. kala', 'h.s.c. / p. kala', 'math / h.s.c'].some(opt => sub.includes(opt));
    }).map(g => {
      let subjectName = g.subject.replace(/\s*\(T\s*\+\s*P\)\s*/g, '');
      const sub = g.subject.toLowerCase();

      if (['NUR', 'LKG', 'UKG'].includes(level) && sub.includes('urdu / poem')) {
        subjectName = code === 1 ? "Urdu" : "Poem";
      } else if (parseInt(level) >= 1 && parseInt(level) <= 5 && sub.includes('urdu / sans')) {
        subjectName = code === 1 ? "Urdu" : "Sanskrit";
      } else if (parseInt(level) >= 6 && parseInt(level) <= 8) {
        if (sub.includes('urdu / sans')) {
          subjectName = (code === 1 || code === 2) ? "Urdu" : "Sanskrit";
        } else if (sub.includes('h.sci. / p. kala') || sub.includes('h.s.c. / p. kala')) {
          subjectName = (code === 1 || code === 3) ? "Pustak Kala" : "Home Science";
        }
      } else if (parseInt(level) >= 9 && sub.includes('math / h.s.c')) {
        subjectName = code === 1 ? "Mathematics" : "Home Science";
      }
      
      return { ...g, subjectName };
    }).sort((a, b) => getSubjectPriority(a.subjectName) - getSubjectPriority(b.subjectName));
  };

  const generateVectorPDF = async (designNum: number) => {
    if (filteredStudents.length === 0) return;
    setIsGenerating(designNum);
    await new Promise(resolve => setTimeout(resolve, 800));

    const schoolInfo = SCHOOLS[selectedSchoolCode];
    const MARGIN = 4;
    const WIDTH = 210;
    const HEIGHT = 297;
    const CONTENT_WIDTH = WIDTH - (MARGIN * 2);
    const TABLE_WIDTH = CONTENT_WIDTH - 10;
    const TABLE_X = MARGIN + 5;
    const ROW_HEIGHT = 8;
    const HEADER_HEIGHT = 10;
    const GAP_MM = 6;

    const drawSecurityPattern = (doc: jspdf) => {
      doc.setFillColor('#E8E8E8');
      for (let x = MARGIN + 5; x < CONTENT_WIDTH + MARGIN - 5; x += 4) {
        for (let y = MARGIN + 5; y < HEIGHT - MARGIN - 5; y += 4) {
          doc.circle(x, y, 0.12, 'F');
        }
      }
    };

    const drawFrontPage = (doc: jspdf, student: Student, rank: number) => {
      const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };

      const studentGrades = getFilteredGrades(student);
      const termMax = getMaxMarksPerTerm(student.gradeLevel);
      const totalMaxPerSubject = termMax * 4;
      const totalObtained = studentGrades.reduce((sum, g) => sum + g.term1 + g.term2 + g.term3 + g.term4, 0);
      const totalPossible = studentGrades.length * totalMaxPerSubject;
      const percentage = parseFloat(((totalObtained / totalPossible) * 100).toFixed(2));
      
      const finalGrade = percentage >= 91 ? "A+" : 
                       percentage >= 81 ? "A" : 
                       percentage >= 71 ? "B" : 
                       percentage >= 61 ? "C" : "D";

      drawSecurityPattern(doc);
      
      if (logo) {
        doc.saveGraphicsState();
        try {
          // @ts-ignore
          const gstate = new doc.GState({ opacity: 0.1 });
          doc.setGState(gstate);
        } catch (e) {}
        doc.addImage(logo, 'PNG', (WIDTH - 120) / 2, (HEIGHT - 120) / 2, 120, 120);
        doc.restoreGraphicsState();
      }

      doc.setLineWidth(1.2);
      doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, HEIGHT - (MARGIN * 2));
      doc.setLineWidth(0.3);
      doc.rect(MARGIN + 1.5, MARGIN + 1.5, CONTENT_WIDTH - 3, HEIGHT - (MARGIN * 2) - 3);

      const baseTopY = currentTemplate.offsets.headerY - 3;
      const logoY = designNum === 2 ? baseTopY + 18 : baseTopY + 11;
      if (logo) doc.addImage(logo, 'PNG', TABLE_X, logoY, 20, 20);

      doc.setFont("times", "bold");
      doc.setFontSize(34);
      if (designNum === 2) {
        doc.setFillColor('#000000');
        doc.rect(TABLE_X, baseTopY + 4, TABLE_WIDTH, 14, 'F');
        doc.setTextColor('#FFFFFF');
      } else {
        doc.setTextColor('#000000');
      }
      const schoolNameX = designNum === 2 ? TABLE_X + (TABLE_WIDTH / 2) : (selectedSchoolCode === "3" ? (WIDTH / 2) + 7 : (WIDTH / 2) + 13);
      doc.text(schoolInfo.name, schoolNameX, baseTopY + 15, { align: "center" });
      
      doc.setTextColor('#000000');
      doc.setFont("times", "bolditalic");
      doc.setFontSize(16);
      const secondaryInfoX = (WIDTH / 2) + 4;
      doc.text(schoolInfo.tagline, secondaryInfoX, baseTopY + 23, { align: "center" });
      doc.text(schoolInfo.address, secondaryInfoX, baseTopY + 29, { align: "center" });
      doc.text(`Phone no : ${schoolInfo.contact}  |  Email : ${schoolInfo.email}`, secondaryInfoX, baseTopY + 35, { align: "center" });
       
      const headingY = baseTopY + 37 + 2;
      doc.setFillColor(designNum === 2 ? '#000000' : '#DCDCDC');
      doc.rect(TABLE_X, headingY, TABLE_WIDTH, HEADER_HEIGHT, 'F');
      doc.rect(TABLE_X, headingY, TABLE_WIDTH, HEADER_HEIGHT);
      doc.setTextColor(designNum === 2 ? '#FFFFFF' : '#000000');
      doc.setFontSize(20);
      doc.text("PROGRESS REPORT CARD (2025-26)", WIDTH / 2, headingY + 7, { align: "center" });

      doc.setTextColor('#000000');
      let currentY = headingY + HEADER_HEIGHT + GAP_MM;
      
      doc.setFillColor(designNum === 2 ? '#000000' : '#DCDCDC');
      doc.rect(TABLE_X, currentY, TABLE_WIDTH, HEADER_HEIGHT, 'F');
      doc.setTextColor(designNum === 2 ? '#FFFFFF' : '#000000');
      doc.setFontSize(16); doc.setFont("times", "bold");
      doc.text("STUDENT PROFILE", WIDTH / 2, currentY + 7, { align: "center" });
      doc.setTextColor('#000000');
      
      currentY += HEADER_HEIGHT + 9;
      const col1 = TABLE_X + 2; const col2 = col1 + 42;
      const col4 = TABLE_X + 115; const col5 = col4 + 25;
      doc.setFontSize(14);
      const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr === "N/A" || dateStr.trim() === "") return "XX/XX/XXXX";
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return dateStr;
      };
      const info = [
        { l: "STUDENT NAME:", v: String(student.name).toUpperCase(), l2: "CLASS / ROLL:", v2: `${String(student.class).toUpperCase()} / ${String(student.rollNo).toUpperCase()}` },
        { l: "FATHER'S NAME:", v: String(student.fathersName).toUpperCase(), l2: "DATE OF BIRTH:", v2: formatDate(student.dob) },
        { l: "MOTHER'S NAME:", v: String(student.mothersName).toUpperCase(), l2: "SR NO:", v2: String(student.srNo).toUpperCase() }
      ];
      info.forEach(row => {
        doc.setFont("times", "bold"); doc.text(row.l, col1, currentY);
        doc.setFont("times", "bold"); doc.text(row.v, col2, currentY);
        doc.setFont("times", "bold"); doc.text(row.l2, col4, currentY);
        doc.setFont("times", "bold"); doc.text(row.v2, col5, currentY);
        currentY += 9;
      });

      doc.setFont("times", "bold"); doc.text("ADDRESS:", col1, currentY);
      doc.setFont("times", "bold"); doc.text(student.address?.toUpperCase() || "N/A", col2, currentY);
      
      let startProfileY = currentY - (9 * 4) - 9 - HEADER_HEIGHT; 
      let profileTotalHeight = currentY - startProfileY + 4;
      doc.rect(TABLE_X, startProfileY, TABLE_WIDTH, profileTotalHeight);
      
      currentY += 6;

      currentY += GAP_MM;
      const subCol = TABLE_WIDTH * 0.23; const mCol = TABLE_WIDTH * 0.16;
      doc.setFillColor(designNum === 2 ? '#000000' : '#DCDCDC');
      doc.setTextColor(designNum === 2 ? '#FFFFFF' : '#000000');
      doc.rect(TABLE_X, currentY, TABLE_WIDTH, HEADER_HEIGHT, 'F');
      doc.rect(TABLE_X, currentY, TABLE_WIDTH, HEADER_HEIGHT);
      
      doc.text("Subjects", TABLE_X + 5, currentY + 7);
      const maxMarksPerTerm = getMaxMarksPerTerm(student.gradeLevel);
      const labelText = `(${maxMarksPerTerm})`;
      ['T1','T2','T3','T4'].forEach((t, i) => doc.text(`${t} ${labelText}`, TABLE_X + subCol + (mCol*(i+0.5)), currentY + 7, { align: "center" }));
      doc.text(`Total (${maxMarksPerTerm * 4})`, TABLE_X + subCol + (mCol*4) + (TABLE_WIDTH*0.13*0.5), currentY + 7, { align: "center" });

      doc.setTextColor('#000000');
      currentY += HEADER_HEIGHT;
      
      let t1Sum = 0, t2Sum = 0, t3Sum = 0, t4Sum = 0;

      studentGrades.forEach(g => {
        t1Sum += g.term1; t2Sum += g.term2; t3Sum += g.term3; t4Sum += g.term4;
        doc.rect(TABLE_X, currentY, TABLE_WIDTH, ROW_HEIGHT);
        
        doc.line(TABLE_X + subCol, currentY, TABLE_X + subCol, currentY + ROW_HEIGHT);
        [1,2,3,4].forEach(i => doc.line(TABLE_X + subCol + (mCol*i), currentY, TABLE_X + subCol + (mCol*i), currentY + ROW_HEIGHT));

        doc.setFontSize(14); doc.text((g as any).subjectName, TABLE_X + 5, currentY + 6);
        doc.setFontSize(13);
        const terms = ['term1', 'term2', 'term3', 'term4'];
        terms.forEach((t, i) => {
          const val = g.details?.[t as keyof typeof g.details];
          const mark = (val && val.practical > 0) ? `${val.theory}(T) + ${val.practical} (P)` : (g as any)[t].toString();
          doc.text(mark, TABLE_X + subCol + (mCol*(i+0.5)), currentY + 6, { align: "center" });
        });
        doc.setFont("times", "bold");
        doc.text((g.term1 + g.term2 + g.term3 + g.term4).toString(), TABLE_X + subCol + (mCol*4) + (TABLE_WIDTH*0.13*0.5), currentY + 6, { align: "center" });
        currentY += ROW_HEIGHT; doc.setFont("times", "bold");
      });

      doc.setFont("times", "bold");
      doc.setFillColor('#F5F5F5');
      doc.rect(TABLE_X, currentY, TABLE_WIDTH, ROW_HEIGHT, 'F');
      doc.rect(TABLE_X, currentY, TABLE_WIDTH, ROW_HEIGHT);
      doc.line(TABLE_X + subCol, currentY, TABLE_X + subCol, currentY + ROW_HEIGHT);
      [1,2,3,4].forEach(i => doc.line(TABLE_X + subCol + (mCol*i), currentY, TABLE_X + subCol + (mCol*i), currentY + ROW_HEIGHT));
      
      doc.text("TOTAL MARKS", TABLE_X + 5, currentY + 6);
      [t1Sum, t2Sum, t3Sum, t4Sum].forEach((sum, i) => doc.text(sum.toString(), TABLE_X + subCol + (mCol*(i+0.5)), currentY + 6, { align: "center" }));
      doc.text(totalObtained.toString(), TABLE_X + subCol + (mCol*4) + (TABLE_WIDTH*0.13*0.5), currentY + 6, { align: "center" });
      currentY += ROW_HEIGHT;

      currentY += GAP_MM;
      doc.setFillColor(designNum === 2 ? '#000000' : '#DCDCDC');
      doc.rect(TABLE_X, currentY, TABLE_WIDTH, HEADER_HEIGHT, 'F');
      doc.rect(TABLE_X, currentY, TABLE_WIDTH, HEADER_HEIGHT + ROW_HEIGHT);
      doc.setTextColor(designNum === 2 ? '#FFFFFF' : '#000000');
      const sumW = TABLE_WIDTH / 4;
      
      [1,2,3].forEach(i => doc.line(TABLE_X + (sumW*i), currentY + HEADER_HEIGHT, TABLE_X + (sumW*i), currentY + HEADER_HEIGHT + ROW_HEIGHT));

      ["OBTAINED", "PERCENTAGE", "GRADE", "CLASS RANK"].forEach((h, i) => doc.text(h, TABLE_X + (sumW*(i+0.5)), currentY + 7, { align: "center" }));
      doc.setTextColor('#000000');
      doc.text(`${totalObtained}/${totalPossible}`, TABLE_X + (sumW*0.5), currentY + HEADER_HEIGHT + 6, { align: "center" });
      doc.text(`${percentage}%`, TABLE_X + (sumW*1.5), currentY + HEADER_HEIGHT + 6, { align: "center" });
      doc.text(finalGrade, TABLE_X + (sumW*2.5), currentY + HEADER_HEIGHT + 6, { align: "center" });
      doc.text(rank <= 3 ? getOrdinal(rank) : "-", TABLE_X + (sumW*3.5), currentY + HEADER_HEIGHT + 6, { align: "center" });

      currentY += HEADER_HEIGHT + ROW_HEIGHT + GAP_MM;
      const halfW = (TABLE_WIDTH / 2) - 3;
      
      doc.setFillColor(designNum === 2 ? '#000000' : '#DCDCDC'); doc.rect(TABLE_X, currentY, halfW, HEADER_HEIGHT, 'F');
      doc.rect(TABLE_X, currentY, halfW, HEADER_HEIGHT + (ROW_HEIGHT * 4));
      doc.setTextColor(designNum === 2 ? '#FFFFFF' : '#000000');
      doc.line(TABLE_X + (halfW * 0.7), currentY + HEADER_HEIGHT, TABLE_X + (halfW * 0.7), currentY + HEADER_HEIGHT + (ROW_HEIGHT * 4));

      doc.setFont("times", "bold"); doc.text("CO-SCHOLASTIC", TABLE_X + halfW/2, currentY + 7, { align: "center" });
      doc.setTextColor('#000000');
      const activities = ["P.T.", "Discipline", "Art & Craft", "General Activity"];
      const csData = student.coScholastic || {};
      const values = [csData.pt, csData.discipline, csData.art, csData.yoga];

      activities.forEach((act, idx) => {
        const y = currentY + HEADER_HEIGHT + (ROW_HEIGHT * idx);
        doc.setFont("times", "bold"); doc.text(act, TABLE_X + 2, y + 6);
        doc.setFont("times", "bold"); doc.text(values[idx] || "A", TABLE_X + halfW - 5, y + 6, { align: "right" });
        doc.line(TABLE_X, y + ROW_HEIGHT, TABLE_X + halfW, y + ROW_HEIGHT);
      });

      const attX = TABLE_X + halfW + 6;
      doc.setFillColor(designNum === 2 ? '#000000' : '#DCDCDC'); doc.rect(attX, currentY, halfW, HEADER_HEIGHT, 'F');
      doc.rect(attX, currentY, halfW, HEADER_HEIGHT + (ROW_HEIGHT * 3));
      doc.setTextColor(designNum === 2 ? '#FFFFFF' : '#000000');
      doc.line(attX + (halfW * 0.7), currentY + HEADER_HEIGHT, attX + (halfW * 0.7), currentY + HEADER_HEIGHT + (ROW_HEIGHT * 3));

      doc.setFont("times", "bold"); doc.text("ATTENDANCE", attX + halfW/2, currentY + 7, { align: "center" });
      doc.setTextColor('#000000');
      const attData = [
        { l: "Total Days", v: student.attendance?.totalDays || 0 },
        { l: "Present Days", v: student.attendance?.presentDays || 0 },
        { l: "Attendance %", v: `${((student.attendance?.presentDays || 0) / (student.attendance?.totalDays || 1) * 100).toFixed(1)}%` }
      ];
      attData.forEach((row, idx) => {
        const y = currentY + HEADER_HEIGHT + (ROW_HEIGHT * idx);
        doc.setFont("times", "bold"); doc.text(row.l, attX + 2, y + 6);
        doc.setFont("times", "bold"); doc.text(row.v.toString(), attX + halfW - 5, y + 6, { align: "right" });
        if (idx < 2) doc.line(attX, y + ROW_HEIGHT, attX + halfW, y + ROW_HEIGHT);
      });
    };

    const drawBackPage = (doc: jspdf, student: Student) => {
      drawSecurityPattern(doc);
      if (logo) {
        doc.saveGraphicsState();
        try {
          // @ts-ignore
          const gstate = new doc.GState({ opacity: 0.1 });
          doc.setGState(gstate);
        } catch (e) {}
        doc.addImage(logo, 'PNG', (WIDTH - 120) / 2, (HEIGHT - 120) / 2, 120, 120);
        doc.restoreGraphicsState();
      }

      doc.setLineWidth(1.2); doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, HEIGHT - (MARGIN * 2));
      doc.setLineWidth(0.3); doc.rect(MARGIN + 1.5, MARGIN + 1.5, CONTENT_WIDTH - 3, HEIGHT - (MARGIN * 2) - 3);

      let backY = 10;
      
      doc.setFillColor(designNum === 2 ? '#000000' : '#DCDCDC'); 
      doc.rect(TABLE_X, backY, TABLE_WIDTH, HEADER_HEIGHT, 'F');
      doc.rect(TABLE_X, backY, TABLE_WIDTH, HEADER_HEIGHT + 25);
      doc.setTextColor(designNum === 2 ? '#FFFFFF' : '#000000');
      doc.setFont("times", "bold"); 
      doc.text("RESULT & PROMOTION", WIDTH / 2, backY + 7, { align: "center" });
      
      doc.setTextColor('#000000');
      doc.setFontSize(16);
      const nextClass = (cls: string) => {
        const order = ['NUR', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
        const idx = order.indexOf(cls.toUpperCase());
        return (idx !== -1 && idx < order.length - 1) ? order[idx + 1] : "__________";
      };
      doc.text(`Result:  PASS`, TABLE_X + 10, backY + HEADER_HEIGHT + 10);
      doc.text(`Promoted to Class:  ${nextClass(student.class)}`, TABLE_X + 10, backY + HEADER_HEIGHT + 18);
      
      backY += HEADER_HEIGHT + 25 + (GAP_MM * 2);

      doc.setFillColor(designNum === 2 ? '#000000' : '#DCDCDC'); doc.rect(TABLE_X, backY, TABLE_WIDTH, HEADER_HEIGHT, 'F');
      doc.rect(TABLE_X, backY, TABLE_WIDTH, HEADER_HEIGHT + (ROW_HEIGHT * 5));
      doc.setTextColor(designNum === 2 ? '#FFFFFF' : '#000000');
      
      doc.line(TABLE_X + (TABLE_WIDTH * 0.35), backY + HEADER_HEIGHT, TABLE_X + (TABLE_WIDTH * 0.35), backY + HEADER_HEIGHT + (ROW_HEIGHT * 5));
      doc.line(TABLE_X + (TABLE_WIDTH * 0.65), backY + HEADER_HEIGHT, TABLE_X + (TABLE_WIDTH * 0.65), backY + HEADER_HEIGHT + (ROW_HEIGHT * 5));

      doc.setFontSize(16); doc.setFont("times", "bold");
      doc.text("GRADING SYSTEM", WIDTH / 2, backY + 7, { align: "center" });
      doc.setTextColor('#000000');
      const systemY = backY + HEADER_HEIGHT;
      const gradingRows = [
        { r: "91-100", g: "A+", rm: "Outstanding" },
        { r: "81-90", g: "A", rm: "Excellent" },
        { r: "71-80", g: "B", rm: "Very Good" },
        { r: "61-70", g: "C", rm: "Good" },
        { r: "Below 60", g: "D", rm: "Needs Improvement" }
      ];
      gradingRows.forEach((g, idx) => {
        const y = systemY + (ROW_HEIGHT * idx);
        doc.setFont("times", "bold"); doc.text(g.r, TABLE_X + 10, y + 6);
        doc.setFont("times", "bold"); doc.text(g.g, TABLE_X + (TABLE_WIDTH*0.5), y + 6, { align: "center" });
        doc.setFont("times", "bolditalic"); doc.text(g.rm, TABLE_X + TABLE_WIDTH - 10, y + 6, { align: "right" });
        doc.line(TABLE_X, y + ROW_HEIGHT, TABLE_X + TABLE_WIDTH, y + ROW_HEIGHT);
      });
      backY += HEADER_HEIGHT + (ROW_HEIGHT * 5);

      backY += GAP_MM * 2;
      doc.setFillColor(designNum === 2 ? '#000000' : '#DCDCDC'); doc.rect(TABLE_X, backY, TABLE_WIDTH, HEADER_HEIGHT, 'F');
      doc.rect(TABLE_X, backY, TABLE_WIDTH, HEADER_HEIGHT + 65);
      doc.setTextColor(designNum === 2 ? '#FFFFFF' : '#000000');
      doc.setFont("times", "bold"); doc.text("ASSESSMENT SCHEME & SCHOOL RULES", WIDTH / 2, backY + 7, { align: "center" });
      doc.setTextColor('#000000');
      const _termMax = getMaxMarksPerTerm(student.gradeLevel);
      const theoryMax = getMaxTheoryMarks(student.gradeLevel);
      const practicalMax = getMaxPracticalMarks(student.gradeLevel);
      
      let markingScheme = `1. Each subject carries a maximum of ${_termMax} marks per term (Total ${_termMax * 4} Marks).`;
      if (practicalMax > 0) {
        markingScheme = `1. Assessment structure: Theory (${theoryMax}) + Practical (${practicalMax}) = ${_termMax} marks per term.`;
      }

      const rulesList = [
        markingScheme,
        "2. Students must maintain 75% attendance to appear in final exams.",
        "3. Punctuality and discipline are mandatory for all students.",
        "4. Parents are requested to attend Parent-Teacher Meetings regularly.",
        "5. Report card should be signed and returned within 3 days.",
        "6. Students must wear proper school uniform daily.",
        "7. Report card is valid only with the Principal's Signature and School Stamp."
      ];
      doc.setFontSize(14); doc.setFont("times", "bold");
      rulesList.forEach((rule, idx) => doc.text(rule, TABLE_X + 5, backY + HEADER_HEIGHT + 10 + (idx * 8)));

      const signY = HEIGHT - MARGIN - 35;
      const slotW = (TABLE_WIDTH / 3) - 4;
      const slots = [
        { l: "Teacher's Signature", x: TABLE_X, img: teacherSign },
        { l: "Parent's Signature", x: TABLE_X + slotW + 6, img: null },
        { l: "Principal's Signature", x: TABLE_X + (slotW * 2) + 12, img: principalSign }
      ];

      slots.forEach(slot => {
        doc.setFillColor(designNum === 2 ? '#000000' : '#E0E0E0');
        doc.rect(slot.x, signY, slotW, 6, 'F');
        doc.setTextColor(designNum === 2 ? '#FFFFFF' : '#000000');
        doc.setFontSize(14); doc.setFont("times", "bold");
        doc.text(slot.l, slot.x + slotW/2, signY + 4, { align: "center" });
        doc.setDrawColor('#000000');
        doc.rect(slot.x, signY, slotW, 25);
        if (slot.img) {
          doc.addImage(slot.img, 'PNG', slot.x + 5, signY + 8, slotW - 10, 14);
        }
      });
      doc.setTextColor('#000000');
    };

    try {
      const allStudentTotals = filteredStudents.map(s => {
        const gs = getFilteredGrades(s);
        return gs.reduce((sum, g) => sum + g.term1 + g.term2 + g.term3 + g.term4, 0);
      });
      const sortedTotals = [...allStudentTotals].sort((a, b) => b - a);

      // 1. Generate Front Pages PDF
      const docFront = new jspdf("p", "mm", "a4");
      for (let i = 0; i < filteredStudents.length; i++) {
        if (i > 0) docFront.addPage();
        const currentTotal = allStudentTotals[i];
        const rank = sortedTotals.indexOf(currentTotal) + 1;
        drawFrontPage(docFront, filteredStudents[i], rank);
      }

      // 2. Generate Back Page PDF (Single Page)
      const docBack = new jspdf("p", "mm", "a4");
      drawBackPage(docBack, filteredStudents[0]);

      // 3. Create ZIP
      const zip = new JSZip();
      zip.file(`${selectedClass}_Front_Pages.pdf`, docFront.output("blob"));
      zip.file(`${selectedClass}_Back_Page.pdf`, docBack.output("blob"));

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${selectedClass}_Reports.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

    } catch (e) { console.error(e); } finally { setIsGenerating(null); }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-primary">CK REPORT PRO</h1>
          <p className="text-muted-foreground uppercase text-xs font-bold tracking-[0.2em]">Institutional Report Generator</p>
        </div>

        <input type="file" ref={dataInputRef} className="hidden" accept=".csv, .xlsx" onChange={handleFileUpload} />
        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setLogo)} />
        <input type="file" ref={teacherSignInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setTeacherSign)} />
        <input type="file" ref={principalSignInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setPrincipalSign)} />

        <Card className={`border-2 transition-all ${dataLoaded ? 'border-green-500 bg-green-50/5' : 'border-dashed'}`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="flex items-center justify-center size-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                Academic Data Source
              </CardTitle>
              <CardDescription className="text-xs">Identify School & Class from uploaded data.</CardDescription>
            </div>
            {dataLoaded && <CheckCircle2 className="size-5 text-green-500" />}
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant={dataLoaded ? "outline" : "default"} className="w-full h-12 gap-2" onClick={() => dataInputRef.current?.click()}>
              <FileUp className="size-4" />
              {dataLoaded ? "Replace Data Source" : "Upload Excel/CSV File"}
            </Button>
            
            <div className="flex justify-center">
              <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen} modal={false}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold text-muted-foreground hover:text-primary gap-1">
                    <FileSpreadsheet className="size-3" />
                    Download Sample Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Generate Custom Template</DialogTitle>
                    <DialogDescription>Select a class and student count to get a pre-formatted template.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Class</Label>
                      <Select onValueChange={setTemplateGrade} value={templateGrade}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent>
                          {['NUR', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(lvl => (
                            <SelectItem key={lvl} value={lvl}>Class {lvl}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Students</Label>
                      <Input
                        type="number"
                        min="1"
                        max="500"
                        value={templateStudentCount}
                        onChange={(e) => setTemplateStudentCount(parseInt(e.target.value) || 1)}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={downloadSampleCSV} disabled={!templateGrade} className="w-full">
                      Download Template
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {dataLoaded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                  <School className="size-3" /> Institution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select onValueChange={setSelectedSchoolCode} value={selectedSchoolCode}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Identify School..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSchools.map(school => (
                      <SelectItem key={school.code} value={school.code}>{school.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                  <UserCircle className="size-3" /> Cohort
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select 
                  onValueChange={setSelectedClass} 
                  value={selectedClass}
                  disabled={!selectedSchoolCode}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select Class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedClass && (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Finalize Assets</CardTitle>
              <CardDescription className="text-xs">Branding and signatures.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-24 flex-col gap-2 border-dashed" onClick={() => logoInputRef.current?.click()}>
                  {logo ? <img src={logo} className="h-12" alt="Logo" /> : <ImageIcon className="size-6 opacity-20" />}
                  <span className="text-[10px] font-bold uppercase">Upload Logo</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2 border-dashed" onClick={() => teacherSignInputRef.current?.click()}>
                  {teacherSign ? <img src={teacherSign} className="h-12" alt="Teacher Sign" /> : <PenTool className="size-6 opacity-20" />}
                  <span className="text-[10px] font-bold uppercase">Teacher Sign</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2 border-dashed" onClick={() => principalSignInputRef.current?.click()}>
                  {principalSign ? <img src={principalSign} className="h-12" alt="Principal Sign" /> : <PenTool className="size-6 opacity-20" />}
                  <span className="text-[10px] font-bold uppercase">Principal Sign</span>
                </Button>
              </div>
              <div className="pt-6 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  className="h-16 text-md font-black gap-3 shadow-lg"
                  onClick={() => generateVectorPDF(1)}
                  disabled={isGenerating !== null}
                >
                  {isGenerating === 1 ? <Loader2 className="animate-spin" /> : <Download />}
                  DESIGN 1 (CLASSIC)
                </Button>
                <Button 
                  className="h-16 text-md font-black gap-3 bg-black text-white hover:bg-gray-900 shadow-lg"
                  onClick={() => generateVectorPDF(2)}
                  disabled={isGenerating !== null}
                >
                  {isGenerating === 2 ? <Loader2 className="animate-spin" /> : <Download />}
                  DESIGN 2 (DARK HEADER)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
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
      </div>
    </AppShell>
  );
}
