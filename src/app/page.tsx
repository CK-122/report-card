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
import { Progress } from "@/components/ui/progress";
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
  const [designNum, setDesignNum] = useState(2);
  
  const { toast } = useToast();

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

    const loadStudents = async () => {
      try {
        const res = await fetch('/api/students');
        if (!res.ok) throw new Error('Failed to fetch students');
        const data = await res.json();
        setStudents(data);
        setDataLoaded(true);
        toast({ title: "Data Loaded", description: `Successfully loaded ${data.length} students from the system.`, variant: "default" });
      } catch (error) {
        console.error('Error loading students:', error);
        toast({ title: "Load Error", description: "Failed to load student data from the local folder.", variant: "destructive" });
      }
    };

    loadStudents();
  }, [toast]);

  useEffect(() => {
    if (selectedSchoolCode && SCHOOLS[selectedSchoolCode]?.logo) {
      setLogo(SCHOOLS[selectedSchoolCode].logo);
    }
  }, [selectedSchoolCode]);



  const availableSchools = useMemo(() => {
    const codes = Array.from(new Set(students.map(s => s.schoolCode))).filter(Boolean);
    return codes.map(code => SCHOOLS[code]).filter(Boolean);
  }, [students]);

  const availableClasses = useMemo(() => {
    return Array.from(new Set(
      students
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
  }, [students]);

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

  const generateAllReportCards = async (designNum: number, targetClass?: string) => {
    const className = targetClass || selectedClass;
    const classStudents = students.filter(s => (s.class || "").toUpperCase() === className.toUpperCase());
    if (classStudents.length === 0) return;
    
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

    const drawSecurityPattern = (doc: jspdf, schoolName: string = "") => {
      // Full Page Cream Background for Design 3
      if (designNum === 3) {
        doc.setFillColor('#fffbeb'); 
        doc.rect(0, 0, WIDTH, HEIGHT, 'F');
        
        // Diagonal School Name Pattern
        doc.saveGraphicsState();
        try {
          // @ts-ignore
          const gstate = new doc.GState({ opacity: 0.3 });
          doc.setGState(gstate);
          doc.setTextColor('#E0E0E0');
          doc.setFontSize(9);
          doc.setFont("times", "bold");
          
          const text = (schoolName || "OFFICIAL REPORT CARD").toUpperCase();
          const stepX = 70;
          const stepY = 15;
          
          for (let y = MARGIN; y < HEIGHT - MARGIN; y += stepY) {
            for (let x = -30; x < WIDTH + 30; x += stepX) {
              // Alternate offset for staggered look
              const offsetX = (Math.floor(y / stepY) % 2) * (stepX / 2);
              doc.text(text, x + offsetX, y, { angle: 0 });
            }
          }
        } catch (e) {
          console.error("GState error", e);
        }
        doc.restoreGraphicsState();
      } else {
        // Classic Micro-dots for other designs
        doc.setFillColor('#E8E8E8');
        for (let x = MARGIN + 5; x < CONTENT_WIDTH + MARGIN - 5; x += 4) {
          for (let y = MARGIN + 5; y < HEIGHT - MARGIN - 5; y += 4) {
            doc.circle(x, y, 0.12, 'F');
          }
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

      const currentSchoolInfo = SCHOOLS[student.schoolCode] || SCHOOLS["1"];
      drawSecurityPattern(doc, currentSchoolInfo.name);
      const sLogo = designNum === 3 ? (currentSchoolInfo.logoColor || currentSchoolInfo.logo) : (currentSchoolInfo.logo || (window as any)._currentLogo || logo);
      
      if (designNum === 3 && sLogo) {
        doc.saveGraphicsState();
        try {
          // @ts-ignore
          const gstate = new doc.GState({ opacity: 0.15 });
          doc.setGState(gstate);
          doc.addImage(sLogo, 'PNG', (WIDTH - 110) / 2, (HEIGHT - 110) / 2, 110, 110);
        } catch (e) {}
        doc.restoreGraphicsState();
      }

      if (designNum === 3) {
        // High-End Guilloche Border for Design 3
        doc.setDrawColor('#1e3a8a');
        doc.setLineWidth(1.5);
        doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, HEIGHT - (MARGIN * 2));
        
        // Inner Patterned Lines
        doc.setLineWidth(0.2);
        for (let i = 0.8; i < 2.5; i += 0.3) {
          doc.setDrawColor(i > 1.5 ? '#f59e0b' : '#1e3a8a');
          doc.rect(MARGIN + i, MARGIN + i, CONTENT_WIDTH - (i * 2), HEIGHT - (MARGIN * 2) - (i * 2));
        }
        
        // Corner Embellishments
        doc.setFillColor('#1e3a8a');
        const s = 4;
        [
          [MARGIN, MARGIN], 
          [MARGIN + CONTENT_WIDTH - s, MARGIN], 
          [MARGIN, MARGIN + HEIGHT - (MARGIN * 2) - s], 
          [MARGIN + CONTENT_WIDTH - s, MARGIN + HEIGHT - (MARGIN * 2) - s]
        ].forEach(pos => {
          doc.rect(pos[0] - 0.5, pos[1] - 0.5, s + 1, s + 1, 'F');
          doc.setDrawColor('#f59e0b');
          doc.rect(pos[0] + 0.5, pos[1] + 0.5, s - 1, s - 1);
        });
      } else {
        doc.setLineWidth(1.2);
        doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, HEIGHT - (MARGIN * 2));
        doc.setLineWidth(0.3);
        doc.rect(MARGIN + 1.5, MARGIN + 1.5, CONTENT_WIDTH - 3, HEIGHT - (MARGIN * 2) - 3);
      }

      const baseTopY = currentTemplate.offsets.headerY - 3;
      const logoY = (designNum === 2 || designNum === 3) ? baseTopY + 19 : baseTopY + 11;
      if (sLogo) doc.addImage(sLogo, 'PNG', TABLE_X, logoY, 20, 20);

      doc.setFont("times", "bold");
      doc.setFontSize(34);
      if (designNum === 2) {
        doc.setFillColor('#000000');
        doc.rect(TABLE_X, baseTopY + 5, TABLE_WIDTH, 14, 'F');
        doc.setTextColor('#FFFFFF');
      } else if (designNum === 3) {
        doc.setFillColor('#1e3a8a');
        doc.rect(TABLE_X, baseTopY + 5, TABLE_WIDTH, 14, 'F');
        
        doc.setTextColor('#FFFFFF');
        doc.setDrawColor('#f59e0b');
        doc.setLineWidth(1);
        doc.line(TABLE_X, baseTopY + 19, TABLE_X + TABLE_WIDTH, baseTopY + 19);
      } else {
        doc.setTextColor('#000000');
      }
      const sInfo = (window as any)._currentSchoolInfo || schoolInfo;
      
      const schoolNameX = designNum === 2 || designNum === 3 ? TABLE_X + (TABLE_WIDTH / 2) : (sInfo.code === "3" ? (WIDTH / 2) + 7 : (WIDTH / 2) + 13);
      doc.text(sInfo.name, schoolNameX, baseTopY + 16, { align: "center" });
      
      doc.setTextColor('#000000');
      doc.setFont("times", "bold");
      doc.setFontSize(16);
      const secondaryInfoX = (WIDTH / 2) + 4;
      const taglineY = (designNum === 2 || designNum === 3) ? baseTopY + 25 : baseTopY + 23;
      doc.text(sInfo.tagline, secondaryInfoX, taglineY, { align: "center" });
      doc.text(sInfo.address, secondaryInfoX, taglineY + 6, { align: "center" });
      doc.text(`Phone no : ${sInfo.contact}  |  Email : ${sInfo.email}`, secondaryInfoX, taglineY + 12, { align: "center" });
       
      const headingY = baseTopY + 37 + 2;
      doc.setFillColor(designNum === 2 ? '#000000' : designNum === 3 ? '#1e3a8a' : '#DCDCDC');
      doc.rect(TABLE_X, headingY, TABLE_WIDTH, HEADER_HEIGHT, 'F');
      doc.setDrawColor(designNum === 3 ? '#f59e0b' : '#000000');
      doc.setLineWidth(0.5);
      doc.rect(TABLE_X, headingY, TABLE_WIDTH, HEADER_HEIGHT);
      doc.setTextColor(designNum === 2 || designNum === 3 ? '#FFFFFF' : '#000000');
      doc.setFontSize(20);
      doc.text("PROGRESS REPORT CARD (2025-26)", WIDTH / 2, headingY + 7, { align: "center" });

      doc.setTextColor('#000000');
      let currentY = headingY + HEADER_HEIGHT + GAP_MM;
      
      doc.setFillColor(designNum === 2 ? '#000000' : designNum === 3 ? '#1e3a8a' : '#DCDCDC');
      doc.setDrawColor(designNum === 3 ? '#f59e0b' : '#000000');
      doc.setLineWidth(designNum === 3 ? 0.4 : 0.3);
      doc.rect(TABLE_X, currentY, TABLE_WIDTH, HEADER_HEIGHT, designNum === 3 ? 'FD' : 'F');
      doc.setTextColor(designNum === 2 || designNum === 3 ? '#FFFFFF' : '#000000');
      doc.setFontSize(16); doc.setFont("times", "bold");
      doc.text("STUDENT PROFILE", WIDTH / 2, currentY + 7, { align: "center" });
      doc.setTextColor('#000000');
      
      const cardY = currentY + HEADER_HEIGHT;
      const col1 = TABLE_X + 2; const col2 = col1 + 42;
      const col4 = TABLE_X + 110; const col5 = col4 + 38;
      doc.setFontSize(12);
      const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr === "N/A" || dateStr.trim() === "") return "XX/XX/XXXX";
        return formatDateToIndian(dateStr);
      };
      const info = [
        { l: "STUDENT NAME:", v: String(student.name).toUpperCase(), l2: "CLASS / ROLL:", v2: `${String(student.class).toUpperCase()} / ${String(student.rollNo).toUpperCase()}` },
        { l: "FATHER'S NAME:", v: String(student.fathersName).toUpperCase(), l2: "D.O.B:", v2: formatDate(student.dob) },
        { l: "MOTHER'S NAME:", v: String(student.mothersName).toUpperCase(), l2: "SR NO:", v2: String(student.srNo).toUpperCase() }
      ];
      if (designNum === 3) {
        // Modern Card Layout for Design 3 Profile
        const padding = 6;
        const cardHeight = (9 * 4) + 6;
        doc.setDrawColor('#f59e0b');
        doc.setLineWidth(0.4);
        (doc as any).roundedRect(TABLE_X, cardY, TABLE_WIDTH, cardHeight, 1, 1, 'D');
        
        // Internal data
        let innerY = cardY + 8;
        info.forEach((row, idx) => {
          doc.setFontSize(11); doc.setTextColor('#1e3a8a');
          doc.setFont("times", "bold"); doc.text(row.l, col1, innerY);
          doc.text(row.l2, col4, innerY);
          
          doc.setFontSize(13); doc.setTextColor('#000000');
          doc.setFont("times", "bold"); doc.text(row.v, col1 + 35, innerY);
          doc.text(row.v2, col4 + 32, innerY);
          innerY += 9;
        });
        
        doc.setFontSize(11); doc.setTextColor('#1e3a8a');
        doc.text("ADDRESS:", col1, innerY);
        doc.setFontSize(12); doc.setTextColor('#000000');
        doc.text(student.address?.toUpperCase() || "N/A", col1 + 35, innerY);
        currentY = cardY + cardHeight;
      } else {
        info.forEach(row => {
          doc.setFont("times", "bold"); doc.text(row.l, col1, cardY + 9);
          doc.setFont("times", "bold"); doc.text(row.v, col2, cardY + 9);
          doc.setFont("times", "bold"); doc.text(row.l2, col4, cardY + 9);
          doc.setFont("times", "bold"); doc.text(row.v2, col5, cardY + 9);
          currentY += 9;
        });

        doc.setFont("times", "bold"); doc.text("ADDRESS:", col1, currentY + 9);
        doc.setFont("times", "bold"); doc.text(student.address?.toUpperCase() || "N/A", col2, currentY + 9);
        
        let startProfileY = cardY; 
        let profileTotalHeight = (currentY + 9) - cardY + 4;
        doc.rect(TABLE_X, startProfileY, TABLE_WIDTH, profileTotalHeight);
        currentY = cardY + profileTotalHeight;
      }
      
      currentY += 6;

      currentY += GAP_MM;
      const subCol = TABLE_WIDTH * 0.23; const mCol = TABLE_WIDTH * 0.16;
      doc.setFillColor(designNum === 2 ? '#000000' : designNum === 3 ? '#1e3a8a' : '#DCDCDC');
      doc.setTextColor(designNum === 2 || designNum === 3 ? '#FFFFFF' : '#000000');
      doc.rect(TABLE_X, currentY, TABLE_WIDTH, HEADER_HEIGHT, 'F');
      doc.setDrawColor(designNum === 3 ? '#f59e0b' : '#000000');
      doc.rect(TABLE_X, currentY, TABLE_WIDTH, HEADER_HEIGHT);
      
      doc.text("Subjects", TABLE_X + 5, currentY + 7);
      const maxMarksPerTerm = getMaxMarksPerTerm(student.gradeLevel);
      const labelText = `(${maxMarksPerTerm})`;
      ['T1','T2','T3','T4'].forEach((t, i) => doc.text(`${t} ${labelText}`, TABLE_X + subCol + (mCol*(i+0.5)), currentY + 7, { align: "center" }));
      doc.text(`Total (${maxMarksPerTerm * 4})`, TABLE_X + subCol + (mCol*4) + (TABLE_WIDTH*0.13*0.5), currentY + 7, { align: "center" });

      doc.setTextColor('#000000');
      currentY += HEADER_HEIGHT;
      
      let t1Sum = 0, t2Sum = 0, t3Sum = 0, t4Sum = 0;

      studentGrades.forEach((g, idx) => {
        t1Sum += g.term1; t2Sum += g.term2; t3Sum += g.term3; t4Sum += g.term4;
        
        
        doc.setDrawColor(designNum === 3 ? '#f59e0b' : '#000000');
        doc.rect(TABLE_X, currentY, TABLE_WIDTH, ROW_HEIGHT);
        
        doc.line(TABLE_X + subCol, currentY, TABLE_X + subCol, currentY + ROW_HEIGHT);
        [1,2,3,4].forEach(i => doc.line(TABLE_X + subCol + (mCol*i), currentY, TABLE_X + subCol + (mCol*i), currentY + ROW_HEIGHT));

        doc.setFontSize(14); 
        if (designNum === 3) doc.setTextColor('#1e3a8a');
        doc.text((g as any).subjectName, TABLE_X + 5, currentY + 6);
        doc.setTextColor('#000000');
        
        doc.setFontSize( designNum === 3 ? 12 : 13);
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
      doc.rect(TABLE_X, currentY, TABLE_WIDTH, ROW_HEIGHT);
      doc.line(TABLE_X + subCol, currentY, TABLE_X + subCol, currentY + ROW_HEIGHT);
      [1,2,3,4].forEach(i => doc.line(TABLE_X + subCol + (mCol*i), currentY, TABLE_X + subCol + (mCol*i), currentY + ROW_HEIGHT));
      
      doc.text("TOTAL MARKS", TABLE_X + 5, currentY + 6);
      [t1Sum, t2Sum, t3Sum, t4Sum].forEach((sum, i) => doc.text(sum.toString(), TABLE_X + subCol + (mCol*(i+0.5)), currentY + 6, { align: "center" }));
      doc.text(totalObtained.toString(), TABLE_X + subCol + (mCol*4) + (TABLE_WIDTH*0.13*0.5), currentY + 6, { align: "center" });
      currentY += ROW_HEIGHT;

      currentY += GAP_MM;
      doc.setFillColor(designNum === 2 ? '#000000' : designNum === 3 ? '#1e3a8a' : '#DCDCDC');
      doc.rect(TABLE_X, currentY, TABLE_WIDTH, HEADER_HEIGHT, 'F');
      doc.setDrawColor(designNum === 3 ? '#f59e0b' : '#000000');
      doc.rect(TABLE_X, currentY, TABLE_WIDTH, HEADER_HEIGHT + ROW_HEIGHT);
      doc.setTextColor(designNum === 2 || designNum === 3 ? '#FFFFFF' : '#000000');
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
      
      doc.setFillColor(designNum === 2 ? '#000000' : designNum === 3 ? '#1e3a8a' : '#DCDCDC'); doc.rect(TABLE_X, currentY, halfW, HEADER_HEIGHT, 'F');
      doc.setDrawColor(designNum === 3 ? '#f59e0b' : '#000000');
      doc.rect(TABLE_X, currentY, halfW, HEADER_HEIGHT + (ROW_HEIGHT * 4));
      doc.setTextColor(designNum === 2 || designNum === 3 ? '#FFFFFF' : '#000000');
      doc.line(TABLE_X + (halfW * 0.7), currentY + HEADER_HEIGHT, TABLE_X + (halfW * 0.7), currentY + HEADER_HEIGHT + (ROW_HEIGHT * 4));

      doc.setFont("times", "bold"); doc.text("CO-SCHOLASTIC", TABLE_X + halfW/2, currentY + 7, { align: "center" });
      doc.setTextColor('#000000');
      const activities = ["P.T.", "Discipline", "Art & Craft", "General Activity"];
      const csData = student.coScholastic || {};
      const values = [csData.pt, csData.discipline, csData.art, csData.yoga];

      activities.forEach((act, idx) => {
        const y = currentY + HEADER_HEIGHT + (ROW_HEIGHT * idx);
        if (designNum === 3) doc.setTextColor('#1e3a8a');
        doc.setFont("times", "bold"); doc.text(act, TABLE_X + 2, y + 6);
        doc.setTextColor('#000000');
        doc.setFont("times", "bold"); doc.text(values[idx] || "A", TABLE_X + halfW - 5, y + 6, { align: "right" });
        doc.line(TABLE_X, y + ROW_HEIGHT, TABLE_X + halfW, y + ROW_HEIGHT);
      });

      const attX = TABLE_X + halfW + 6;
      doc.setFillColor(designNum === 2 ? '#000000' : designNum === 3 ? '#1e3a8a' : '#DCDCDC'); doc.rect(attX, currentY, halfW, HEADER_HEIGHT, 'F');
      doc.setDrawColor(designNum === 3 ? '#f59e0b' : '#000000');
      doc.rect(attX, currentY, halfW, HEADER_HEIGHT + (ROW_HEIGHT * 3));
      doc.setTextColor(designNum === 2 || designNum === 3 ? '#FFFFFF' : '#000000');
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
        if (designNum === 3) doc.setTextColor('#1e3a8a');
        doc.setFont("times", "bold"); doc.text(row.l, attX + 2, y + 6);
        doc.setTextColor('#000000');
        doc.setFont("times", "bold"); doc.text(row.v.toString(), attX + halfW - 5, y + 6, { align: "right" });
        if (idx < 2) doc.line(attX, y + ROW_HEIGHT, attX + halfW, y + ROW_HEIGHT);
      });
    };

    const drawBackPage = (doc: jspdf, student: Student) => {
      drawSecurityPattern(doc, SCHOOLS[student.schoolCode]?.name || "");
      const sLogo = (window as any)._currentLogo || logo;
      if (designNum === 3 && sLogo) {
        doc.saveGraphicsState();
        try {
          // @ts-ignore
          const gstate = new doc.GState({ opacity: 0.1 });
          doc.setGState(gstate);
          doc.addImage(sLogo, 'PNG', (WIDTH - 120) / 2, (HEIGHT - 120) / 2, 120, 120);
        } catch (e) {}
        doc.restoreGraphicsState();
      }

      if (designNum === 3) {
        // High-End Guilloche Border for Design 3 (Sync with Front)
        doc.setDrawColor('#f59e0b');
        doc.setLineWidth(1.5);
        doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, HEIGHT - (MARGIN * 2));
        
        doc.setLineWidth(0.2);
        for (let i = 0.8; i < 2.5; i += 0.3) {
          doc.setDrawColor(i > 1.5 ? '#f59e0b' : '#1e3a8a');
          doc.rect(MARGIN + i, MARGIN + i, CONTENT_WIDTH - (i * 2), HEIGHT - (MARGIN * 2) - (i * 2));
        }
        
        // Corner Embellishments (Sync with Front)
        doc.setFillColor('#1e3a8a');
        const s = 4;
        [
          [MARGIN, MARGIN], 
          [MARGIN + CONTENT_WIDTH - s, MARGIN], 
          [MARGIN, MARGIN + HEIGHT - (MARGIN * 2) - s], 
          [MARGIN + CONTENT_WIDTH - s, MARGIN + HEIGHT - (MARGIN * 2) - s]
        ].forEach(pos => {
          doc.rect(pos[0] - 0.5, pos[1] - 0.5, s + 1, s + 1, 'F');
          doc.setDrawColor('#f59e0b');
          doc.rect(pos[0] + 0.5, pos[1] + 0.5, s - 1, s - 1);
        });
      } else {
        doc.setLineWidth(1.2); doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, HEIGHT - (MARGIN * 2));
        doc.setLineWidth(0.3); doc.rect(MARGIN + 1.5, MARGIN + 1.5, CONTENT_WIDTH - 3, HEIGHT - (MARGIN * 2) - 3);
      }

      let backY = 10;
      
      doc.setFillColor(designNum === 2 ? '#000000' : designNum === 3 ? '#1e3a8a' : '#DCDCDC'); doc.rect(TABLE_X, backY, TABLE_WIDTH, HEADER_HEIGHT, 'F');
      doc.setDrawColor(designNum === 3 ? '#f59e0b' : '#000000');
      doc.rect(TABLE_X, backY, TABLE_WIDTH, HEADER_HEIGHT + 25);
      doc.setTextColor(designNum === 2 || designNum === 3 ? '#FFFFFF' : '#000000');
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

      doc.setFillColor(designNum === 2 ? '#000000' : designNum === 3 ? '#1e3a8a' : '#DCDCDC'); doc.rect(TABLE_X, backY, TABLE_WIDTH, HEADER_HEIGHT, 'F');
      doc.setDrawColor(designNum === 3 ? '#f59e0b' : '#000000');
      doc.rect(TABLE_X, backY, TABLE_WIDTH, HEADER_HEIGHT + (ROW_HEIGHT * 5));
      doc.setTextColor(designNum === 2 || designNum === 3 ? '#FFFFFF' : '#000000');
      
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
      doc.setFillColor(designNum === 2 ? '#000000' : designNum === 3 ? '#1e3a8a' : '#DCDCDC'); doc.rect(TABLE_X, backY, TABLE_WIDTH, HEADER_HEIGHT, 'F');
      doc.setDrawColor(designNum === 3 ? '#f59e0b' : '#000000');
      doc.rect(TABLE_X, backY, TABLE_WIDTH, HEADER_HEIGHT + 65);
      doc.setTextColor(designNum === 2 || designNum === 3 ? '#FFFFFF' : '#000000');
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
        doc.setFillColor(designNum === 2 ? '#000000' : designNum === 3 ? '#1e3a8a' : '#E0E0E0');
        doc.rect(slot.x, signY, slotW, 6, 'F');
        doc.setTextColor(designNum === 2 || designNum === 3 ? '#FFFFFF' : '#000000');
        doc.setFontSize(14); doc.setFont("times", "bold");
        doc.text(slot.l, slot.x + slotW/2, signY + 4, { align: "center" });
        doc.setTextColor('#000000');
        
        doc.setDrawColor(designNum === 3 ? '#f59e0b' : '#000000');
        doc.setLineWidth(designNum === 3 ? 0.5 : 0.3);
        doc.rect(slot.x, signY, slotW, 25);
        if (slot.img) {
          doc.addImage(slot.img, 'PNG', slot.x + 5, signY + 8, slotW - 10, 14);
        }
      });
      doc.setTextColor('#000000');
    };

    const downloadBlob = (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    const generateForSchool = async (schoolCode: string, schoolStudents: Student[]) => {
      if (schoolStudents.length === 0) return;
      
      const school = SCHOOLS[schoolCode] || SCHOOLS["1"];
      const sLogo = designNum === 3 ? (school.logoColor || school.logo) : (school.logo || logo);
      
      const allStudentTotals = schoolStudents.map(s => {
        const gs = getFilteredGrades(s);
        return gs.reduce((sum, g) => sum + g.term1 + g.term2 + g.term3 + g.term4, 0);
      });
      const sortedTotals = [...allStudentTotals].sort((a, b) => b - a);

      const docFront = new jspdf("p", "mm", "a4");
      for (let i = 0; i < schoolStudents.length; i++) {
        if (i > 0) docFront.addPage();
        const currentTotal = allStudentTotals[i];
        const rank = sortedTotals.indexOf(currentTotal) + 1;
        // Use a wrapper that ensures the correct school context for headers
        const originalSchoolInfo = schoolInfo;
        const originalLogo = logo;
        (window as any)._currentSchoolInfo = school;
        (window as any)._currentLogo = sLogo;
        
        drawFrontPage(docFront, schoolStudents[i], rank);
      }

      const docBack = new jspdf("p", "mm", "a4");
      drawBackPage(docBack, schoolStudents[0]);

      const zip = new JSZip();
      const safeSchoolName = school.name.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
      zip.file(`${className}_Front_Pages.pdf`, docFront.output("blob"));
      zip.file(`${className}_Back_Page.pdf`, docBack.output("blob"));

      const content = await zip.generateAsync({ type: "blob" });
      downloadBlob(content, `${safeSchoolName}_${className}_Reports.zip`);
    };

    try {
      // Group all students in this class by schoolCode
      const classStudents = students.filter(s => (s.class || "").toUpperCase() === className.toUpperCase());
      const studentsBySchool: Record<string, Student[]> = {};
      
      classStudents.forEach(s => {
        const sCode = s.schoolCode || "1";
        if (!studentsBySchool[sCode]) studentsBySchool[sCode] = [];
        studentsBySchool[sCode].push(s);
      });

      const schoolCodes = Object.keys(studentsBySchool);
      for (let i = 0; i < schoolCodes.length; i++) {
        const sCode = schoolCodes[i];
        setIsGenerating(Math.round(((i + 1) / schoolCodes.length) * 100));
        await generateForSchool(sCode, studentsBySchool[sCode]);
        // Small delay to prevent browser blocking multiple downloads
        if (i < schoolCodes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

    } catch (e) { 
      console.error(e); 
      toast({ title: "Generation Error", description: "Failed to generate report cards.", variant: "destructive" });
    } finally { 
      setIsGenerating(null); 
    }
  };



  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 py-10">
        <div className="text-center space-y-2 mb-12">
          <h1 className="text-4xl font-black tracking-tight text-primary">CK REPORT PRO</h1>
          <p className="text-muted-foreground uppercase text-xs font-bold tracking-[0.2em]">Institutional Report Generator</p>
        </div>

        {dataLoaded ? (
          <div className="max-w-md mx-auto">
            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-sm font-bold text-primary uppercase flex items-center justify-center gap-2">
                  <UserCircle className="size-4" /> SELECT CLASS TO GENERATE
                </CardTitle>
                <CardDescription className="text-[10px]">Report cards will download automatically for all schools.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 pb-8 px-8">
                <div className="space-y-4">
                  <div className="flex justify-center gap-2 mb-4">
                    <Button 
                      variant={designNum === 1 ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setDesignNum(1)}
                      className="h-8 text-[10px] font-bold uppercase tracking-wider"
                    >
                      Classic
                    </Button>
                    <Button 
                      variant={designNum === 2 ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setDesignNum(2)}
                      className="h-8 text-[10px] font-bold uppercase tracking-wider"
                    >
                      Dark Header
                    </Button>
                    <Button 
                      variant={designNum === 3 ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setDesignNum(3)}
                      className={`h-8 text-[10px] font-bold uppercase tracking-wider ${designNum === 3 ? 'bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90' : ''}`}
                    >
                      Colorful
                    </Button>
                  </div>

                  <Select 
                    onValueChange={(val) => {
                      setSelectedClass(val);
                      if (val) generateAllReportCards(designNum, val);
                    }} 
                    value={selectedClass}
                  >
                  <SelectTrigger className="h-14 text-lg font-bold border-2 border-primary/20 hover:border-primary transition-all shadow-md">
                    <SelectValue placeholder="Chose Class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map(cls => (
                      <SelectItem key={cls} value={cls} className="font-bold py-3 text-lg">Class {cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isGenerating !== null && (
                  <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-between text-[9pt] font-black uppercase text-primary">
                      <span>Generating Report Cards...</span>
                      <span>Please wait</span>
                    </div>
                    <Progress value={isGenerating} className="h-2" />
                  </div>
                )}
                </div>
              </CardContent>
            </Card>
            
            <p className="text-center mt-6 text-[10px] text-muted-foreground uppercase font-bold tracking-widest animate-pulse">
              System is Ready • {students.length} Records Loaded
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="size-10 animate-spin text-primary opacity-20" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Syncing Data Store...</p>
          </div>
        )}

      </div>
    </AppShell>
  );
}
