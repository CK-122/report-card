"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog";
import { Student, getMaxMarksPerTerm, SCHOOLS, Grade } from "@/lib/types";
import { 
  Eye, 
  FileSearch
} from "lucide-react";
import { useState } from "react";

export default function ReportsPreview() {
  const [students] = useState<Student[]>([]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline text-primary">Student Performance Preview</h2>
          <p className="text-muted-foreground mt-1">Review finalized scores and institutional layout.</p>
        </div>

        {students.length === 0 ? (
          <Card className="border-none shadow-sm flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FileSearch className="size-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">No active session data found.</p>
            <p className="text-xs">Please return to the <strong>Generator</strong> tab and upload a CSV/Excel file to preview reports.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {students.map((student) => {
              const obtained = student.grades.reduce((sum, g) => sum + g.term1 + g.term2 + g.term3 + g.term4, 0);

              return (
                <Card key={student.id} className="border-none shadow-sm flex flex-col">
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{student.name}</CardTitle>
                      <CardDescription>Roll No: {student.rollNo} • Class {student.class}</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{obtained}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Score</p>
                    </div>
                  </CardHeader>
                  <div className="p-4 border-t flex items-center justify-end gap-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="text-primary gap-2" size="sm">
                          <Eye className="size-4" /> Full Layout
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[850px] max-h-[90vh] overflow-y-auto p-0 border-none bg-transparent shadow-none">
                        <DialogHeader>
                          <DialogTitle className="sr-only">Layout Preview - {student.name}</DialogTitle>
                        </DialogHeader>
                        <ReportCard student={student} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ReportCard({ student }: { student: Student }) {
  const [designNum, setDesignNum] = useState(1);
  const schoolInfo = SCHOOLS[student.schoolCode] || SCHOOLS["1"];
  
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
    });
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

  const t1Total = studentGrades.reduce((sum, g) => sum + g.term1, 0);
  const t2Total = studentGrades.reduce((sum, g) => sum + g.term2, 0);
  const t3Total = studentGrades.reduce((sum, g) => sum + g.term3, 0);
  const t4Total = studentGrades.reduce((sum, g) => sum + g.term4, 0);

  const formatMark = (grade: any, term: string) => {
    return grade[term]?.toString() || "0";
  };
  
  const formatSubjectName = (name: string, studentClass: string) => {
    if (!['NUR', 'LKG', 'UKG'].includes(studentClass.toUpperCase())) return name;
    return name
      .replace(/\bO\b/g, 'Oral')
      .replace(/\bW\b/g, 'Written')
      .replace(/\bO\./g, 'Oral')
      .replace(/\bW\./g, 'Written');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === "N/A") return "N/A";
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateStr;
  };

  const SECTION_GAP = "6mm"; 

  return (
    <div className="flex flex-col gap-8 items-center py-8">
      <div className="bg-white rounded-lg min-h-[1100px] border-[3px] border-double border-gray-800 p-8 space-y-0 text-black font-serif w-full max-w-[800px] shadow-2xl overflow-hidden relative">
        <div className="absolute inset-4 border-[0.5pt] border-black pointer-events-none" />
        
        <div className="text-center relative pt-0 mt-[-3mm]">
          <h1 className={`text-[37pt] font-black uppercase tracking-tight mb-2 leading-tight ${designNum === 2 ? '' : (student.schoolCode === "3" ? 'pl-[14mm]' : 'pl-[26mm]')} ${designNum === 2 ? 'bg-[#101010] text-white px-8 pt-3 pb-0 inline-block absolute left-1/2 -translate-x-1/2 w-[calc(100%-8mm)]' : ''}`}>
            {schoolInfo.name}
          </h1>
          <div className={`text-[15pt] italic font-bold space-y-1 text-center pl-[8mm] ${designNum === 2 ? 'mt-[10mm]' : 'mt-[2mm]'}`}>
            <p className="mb-0 leading-tight">{schoolInfo.tagline}</p>
            <p className="mb-0 leading-tight">{schoolInfo.address}</p>
            <p className="leading-tight pb-2 border-b border-black">Phone no : {schoolInfo.contact}  |  Email : {schoolInfo.email}</p>
          </div>
          
          
          <div className="flex justify-center gap-2 mb-4 no-print mt-2">
            <Button 
              variant={designNum === 1 ? "default" : "outline"} 
              size="sm" 
              onClick={() => setDesignNum(1)}
              className="font-bold text-[10pt]"
            >
              Classic
            </Button>
            <Button 
              variant={designNum === 2 ? "default" : "outline"} 
              size="sm" 
              onClick={() => setDesignNum(2)}
              className="font-bold text-[10pt]"
            >
              Dark Header
            </Button>
          </div>

          <div className={`mt-2 border border-black py-2 relative top-[2mm] ${designNum === 2 ? 'bg-black text-white' : 'bg-gray-200/80'}`}>
            <h2 className="text-[20pt] font-black uppercase tracking-widest leading-none text-center">PROGRESS REPORT CARD (2025-26)</h2>
          </div>
        </div>

        <table className="w-full text-[14pt] border-collapse border border-black uppercase" style={{ marginTop: SECTION_GAP }}>
          <thead>
            <tr className={`border-b border-black h-[12mm] ${designNum === 2 ? 'bg-black text-white' : 'bg-gray-200'}`}>
              <th colSpan={5} className="text-center text-[16pt] font-black uppercase">STUDENT PROFILE</th>
            </tr>
          </thead>
          <tbody className="font-bold">
            <tr className="h-[10mm]">
              <td className="pl-4 pr-2 whitespace-nowrap w-[20%]">Student Name:</td>
              <td className="w-[30%]">{student.name}</td>
              <td className="w-[5%]" />
              <td className="pr-2 whitespace-nowrap w-[15%]">Class:</td>
              <td className="w-[30%]">{student.class}</td>
            </tr>
            <tr className="h-[10mm]">
              <td className="pl-4 pr-2 whitespace-nowrap">Father Name:</td>
              <td>{student.fathersName}</td>
              <td />
              <td className="pr-2 whitespace-nowrap">Roll No:</td>
              <td>{student.rollNo}</td>
            </tr>
            <tr className="h-[10mm]">
              <td className="pl-4 pr-2 whitespace-nowrap">Mother Name:</td>
              <td>{student.mothersName}</td>
              <td />
              <td className="pr-2 whitespace-nowrap">DOB:</td>
              <td>{formatDate(student.dob)}</td>
            </tr>
            <tr className="h-[10mm]">
              <td className="pl-4 pr-2 whitespace-nowrap">SR No:</td>
              <td>{student.srNo}</td>
              <td />
              <td className="pr-2 whitespace-nowrap">PEN No:</td>
              <td>{student.penNo || "N/A"}</td>
            </tr>
            <tr className="h-[10mm]">
              <td className="pl-4 pr-2 whitespace-nowrap">Address:</td>
              <td colSpan={4} className="pr-4">{student.address?.toUpperCase() || "N/A"}</td>
            </tr>
          </tbody>
        </table>

        <div className="border border-black overflow-hidden w-full" style={{ marginTop: SECTION_GAP }}>
          <table className="w-full text-[14pt] border-collapse">
            <thead>
              <tr className={`border-b border-black font-black uppercase text-[16pt] ${designNum === 2 ? 'bg-black text-white' : 'bg-gray-200'}`}>
                <th className="p-2 text-left w-[23%]">Subjects</th>
                <th className="p-2 text-center w-[16%]">T1 ({getMaxMarksPerTerm(student.gradeLevel)})</th>
                <th className="p-2 text-center w-[16%]">T2 ({getMaxMarksPerTerm(student.gradeLevel)})</th>
                <th className="p-2 text-center w-[16%]">T3 ({getMaxMarksPerTerm(student.gradeLevel)})</th>
                <th className="p-2 text-center w-[16%]">T4 ({getMaxMarksPerTerm(student.gradeLevel)})</th>
                <th className="p-2 text-center w-[13%]">Total</th>
              </tr>
            </thead>
            <tbody>
              {studentGrades.map((grade, idx) => (
                <tr key={idx} className="border-b border-black font-bold h-[8mm]">
                  <td className="border-r border-black p-2">{formatSubjectName((grade as any).subjectName, student.class)}</td>
                  <td className="border-r border-black p-2 text-center text-[13pt]">{formatMark(grade, 'term1')}</td>
                  <td className="border-r border-black p-2 text-center text-[13pt]">{formatMark(grade, 'term2')}</td>
                  <td className="border-r border-black p-2 text-center text-[13pt]">{formatMark(grade, 'term3')}</td>
                  <td className="border-r border-black p-2 text-center text-[13pt]">{formatMark(grade, 'term4')}</td>
                  <td className="p-2 text-center font-bold border-l border-black bg-gray-50 text-[14pt]">
                    {grade.term1 + grade.term2 + grade.term3 + grade.term4}
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-100 h-[8mm] border-t-2 border-black">
                <td className="border-r border-black p-2 uppercase">Total Marks</td>
                <td className="border-r border-black p-2 text-center text-[14pt]">{t1Total}</td>
                <td className="border-r border-black p-2 text-center text-[14pt]">{t2Total}</td>
                <td className="border-r border-black p-2 text-center text-[14pt]">{t3Total}</td>
                <td className="border-r border-black p-2 text-center text-[14pt]">{t4Total}</td>
                <td className="p-2 text-center border-l border-black bg-gray-200 text-[14pt]">
                  {totalObtained}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border border-black overflow-hidden w-full" style={{ marginTop: SECTION_GAP }}>
          <table className="w-full text-[14pt] border-collapse text-center">
            <thead>
              <tr className={`border-b border-black font-black uppercase text-[16pt] ${designNum === 2 ? 'bg-black text-white' : 'bg-gray-200'}`}>
                <th className="p-2 w-1/4">OBTAINED</th>
                <th className="p-2 w-1/4">PERCENTAGE</th>
                <th className="p-2 w-1/4">GRADE</th>
                <th className="p-2 w-1/4">RESULT</th>
              </tr>
            </thead>
            <tbody>
              <tr className="font-bold h-[8mm]">
                <td className="border-r border-black p-2">{totalObtained}/{totalPossible}</td>
                <td className="border-r border-black p-2">{percentage}%</td>
                <td className="border-r border-black p-2">{finalGrade}</td>
                <td className="p-2 text-green-700">PASS</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-6 w-full" style={{ marginTop: SECTION_GAP }}>
          <div className="border border-black">
            <h4 className={`border-b border-black font-black p-2 text-center uppercase text-[15pt] h-[10mm] flex items-center justify-center ${designNum === 2 ? 'bg-black text-white' : 'bg-gray-200'}`}>CO-SCHOLASTIC ACTIVITIES</h4>
            <table className="w-full border-collapse text-[13pt] uppercase">
              <tbody>
                <tr className="border-b border-black h-[8mm]">
                  <td className="p-2 font-bold border-r border-black w-[70%]">Discipline</td>
                  <td className="p-2 text-center w-[30%] text-[14pt] font-bold">A</td>
                </tr>
                <tr className="border-b border-black h-[8mm]">
                  <td className="p-2 font-bold border-r border-black w-[70%]">Art & Craft</td>
                  <td className="p-2 text-center w-[30%] text-[14pt] font-bold">A</td>
                </tr>
                <tr className="h-[8mm]">
                  <td className="p-2 font-bold border-r border-black w-[70%]">General Activity</td>
                  <td className="p-2 text-center w-[30%] text-[14pt] font-bold">A</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border border-black">
            <h4 className={`border-b border-black font-black p-2 text-center uppercase text-[15pt] h-[10mm] flex items-center justify-center ${designNum === 2 ? 'bg-black text-white' : 'bg-gray-200'}`}>ATTENDANCE RECORD</h4>
            <table className="w-full border-collapse text-[13pt] uppercase">
              <tbody>
                <tr className="border-b border-black h-[8mm]">
                  <td className="p-2 font-bold border-r border-black w-[70%]">Total Days</td>
                  <td className="p-2 text-center w-[30%] font-bold">{student.attendance?.totalDays}</td>
                </tr>
                <tr className="border-b border-black h-[8mm]">
                  <td className="p-2 font-bold border-r border-black w-[70%]">Present Days</td>
                  <td className="p-2 text-center w-[30%] font-bold">{student.attendance?.presentDays}</td>
                </tr>
                <tr className="h-[8mm]">
                  <td className="p-2 font-bold border-r border-black w-[70%]">Attendance (%)</td>
                  <td className="p-2 text-center w-[30%] font-bold">{((student.attendance?.presentDays || 0) / (student.attendance?.totalDays || 1) * 100).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg min-h-[1100px] border-[3px] border-double border-gray-800 p-8 space-y-8 text-black font-serif w-full max-w-[800px] shadow-2xl overflow-hidden relative">
        <div className="absolute inset-4 border-[0.5pt] border-black pointer-events-none" />
        <div className="border border-black">
          <div className={`border-b border-black py-2 text-center ${designNum === 2 ? 'bg-black text-white' : 'bg-gray-200'}`}>
            <h3 className="text-[16pt] font-black uppercase">Grading System</h3>
          </div>
          <table className="w-full text-center text-[14pt] border-collapse">
            <thead>
              <tr className="border-b border-black font-bold h-[10mm]">
                <th className="p-2 w-[35%] uppercase text-center">Score Range</th>
                <th className="p-2 w-[30%] uppercase text-center">Grade</th>
                <th className="p-2 w-[35%] uppercase text-center">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {[
                { r: "91 - 100", g: "A+", d: "Outstanding" },
                { r: "81 - 90", g: "A", d: "Excellent" },
                { r: "71 - 80", g: "B", d: "Very Good" },
                { r: "61 - 70", g: "C", d: "Good" },
                { r: "Below 60", g: "D", d: "Needs Improvement" }
              ].map((item, idx) => (
                <tr key={idx} className="border-b border-black h-[8mm]">
                  <td className="border-r border-black">{item.r}</td>
                  <td className="border-r border-black font-bold">{item.g}</td>
                  <td className="italic font-bold">{item.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border border-black">
          <div className="bg-gray-200 border-b border-black py-2 text-center">
            <h3 className="text-[16pt] font-black uppercase">School Rules & Regulations</h3>
          </div>
          <ul className="p-6 space-y-4 text-[14pt] list-decimal list-inside">
            <li className="font-bold">Students must maintain 75% attendance to appear in final exams.</li>
            <li className="font-bold">Punctuality and discipline are mandatory for all students.</li>
            <li className="font-bold">Parents are requested to attend Parent-Teacher Meetings regularly.</li>
            <li className="font-bold">Report card should be signed and returned within 3 days.</li>
            <li className="font-bold">Students must wear proper school uniform daily.</li>
          </ul>
        </div>
        <div className="flex justify-between items-end font-black text-[16pt] uppercase pt-20 px-4">
          <div className="border-t-2 border-black pt-2 w-48 text-center">Teacher</div>
          <div className="border-t-2 border-black pt-2 w-48 text-center">Parent</div>
          <div className="border-t-2 border-black pt-2 w-48 text-center">Principal</div>
        </div>
      </div>
    </div>
  );
}
