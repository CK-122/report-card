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
    if (!dateStr || dateStr === "N/A" || dateStr.trim() === "") return "XX/XX/XXXX";
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateStr;
  };

  const SECTION_GAP = "6mm"; 

  return (
    <div className="flex flex-col gap-8 items-center py-8">
      <div className={`shadow-2xl mx-auto p-[10mm] relative overflow-hidden flex flex-col rounded-sm w-full max-w-[800px] min-h-[1100px] text-black font-serif transition-colors duration-500 ${designNum === 3 ? 'bg-[#fffbeb]' : 'bg-white'} ${designNum === 1 || designNum === 2 ? 'border-[3px] border-double border-gray-800' : 'border-none'}`}>
        {designNum === 3 && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 border-[1.5pt] border-[#1e3a8a]" />
            <div className="absolute inset-[1.2mm] border-[0.3pt] border-[#1e3a8a]" />
            <div className="absolute inset-[1.8mm] border-[0.6pt] border-[#f59e0b]" />
            <div className="absolute inset-[2.4mm] border-[0.3pt] border-[#1e3a8a]" />
          </div>
        )}
        <div className={`absolute inset-4 pointer-events-none ${designNum === 3 ? 'border-none' : 'border-[0.5pt] border-black'}`} />
        
        <div className="text-center relative pt-0 mt-[-2mm] overflow-hidden">
          {designNum === 3 && (
            <>
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.25] z-0"
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='40'%3E%3Ctext x='100' y='25' font-family='serif' font-weight='bold' font-size='10' fill='%23E0E0E0' text-anchor='middle'%3E${encodeURIComponent(schoolInfo.name.toUpperCase())}%3C/text%3E%3C/svg%3E")`,
                  backgroundSize: '70mm 15mm'
                }}
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.08] z-0">
                <img 
                  src={schoolInfo.logoColor || schoolInfo.logo} 
                  alt="Watermark" 
                  className="w-[450px] h-[450px] object-contain"
                />
              </div>
            </>
          )}
          
          <div className="relative z-10">
            { (designNum === 3 ? (schoolInfo.logoColor || schoolInfo.logo) : schoolInfo.logo) && (
              <img 
                src={designNum === 3 ? (schoolInfo.logoColor || schoolInfo.logo) : schoolInfo.logo} 
                alt="Logo" 
                className={`absolute left-4 w-[22mm] h-[22mm] object-contain ${designNum === 2 || designNum === 3 ? 'top-[15mm]' : 'top-2'}`}
              />
            )}
            <h1 className={`text-[34pt] font-black uppercase tracking-tight mb-2 leading-tight ${designNum === 2 || designNum === 3 ? '' : (student.schoolCode === "3" ? 'pl-[14mm]' : 'pl-[26mm]')} ${designNum === 2 ? 'bg-[#101010] text-white px-8 pt-3 pb-0 inline-block absolute left-1/2 -translate-x-1/2 w-[calc(100%-8mm)]' : designNum === 3 ? 'bg-[#1e3a8a] text-white px-8 pt-3 pb-0 inline-block absolute left-1/2 -translate-x-1/2 w-[calc(100%-8mm)] border-b border-[#f59e0b]' : ''}`}>
              {schoolInfo.name}
            </h1>
            <div className={`text-[15pt] font-bold space-y-1 text-center pl-[8mm] ${designNum === 2 || designNum === 3 ? 'mt-[11mm]' : 'mt-[2mm]'}`}>
              <p className="mb-0 leading-tight">{schoolInfo.tagline}</p>
              <p className="mb-0 leading-tight">{schoolInfo.address}</p>
              <p className="leading-tight pb-2 border-b border-black">Phone no : {schoolInfo.contact}  |  Email : {schoolInfo.email}</p>
            </div>
          </div>
          
          <div className="flex justify-center gap-2 mb-4 no-print mt-2">
            <Button variant={designNum === 1 ? "default" : "outline"} size="sm" onClick={() => setDesignNum(1)} className="font-bold text-[10pt]">Classic</Button>
            <Button variant={designNum === 2 ? "default" : "outline"} size="sm" onClick={() => setDesignNum(2)} className="font-bold text-[10pt]">Dark Header</Button>
            <Button variant={designNum === 3 ? "default" : "outline"} size="sm" onClick={() => setDesignNum(3)} className="font-bold text-[10pt] bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90">Colorful</Button>
          </div>

          <div className={`mt-2 border border-black py-2 relative top-[2mm] ${designNum === 2 ? 'bg-black text-white' : designNum === 3 ? 'bg-[#1e3a8a] text-white border-y border-[#f59e0b] shadow-md' : 'bg-gray-200/80'}`}>
            <h2 className="text-[20pt] font-black uppercase tracking-widest leading-none text-center">PROGRESS REPORT CARD (2025-26)</h2>
          </div>
          
          <div className="flex flex-col -mt-1">
            <h2 className={`text-center text-[16pt] font-black uppercase py-2 ${designNum === 2 ? 'bg-[#000000] text-white' : designNum === 3 ? 'bg-[#1e3a8a] text-white border border-[#f59e0b]' : 'bg-[#DCDCDC] border-y border-black'}`}>STUDENT PROFILE</h2>
            {designNum === 3 ? (
              <div className="flex flex-col gap-4 px-6 py-4 rounded-b-xl border border-t-0 bg-white shadow-md border-[#f59e0b] z-10 relative">
                <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-left">
                  <div className="space-y-1">
                    <p className="text-[11pt] font-bold uppercase text-[#1e3a8a]">Student Name</p>
                    <p className="text-[13pt] font-bold border-b border-black/10">{student.name.toUpperCase()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11pt] font-bold uppercase text-[#1e3a8a]">Class / Roll</p>
                    <p className="text-[13pt] font-bold border-b border-black/10">{student.class.toUpperCase()} / {student.rollNo.toUpperCase()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11pt] font-bold uppercase text-[#1e3a8a]">Father&apos;s Name</p>
                    <p className="text-[13pt] font-bold border-b border-black/10">{student.fathersName.toUpperCase()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11pt] font-bold uppercase text-[#1e3a8a]">D.O.B</p>
                    <p className="text-[13pt] font-bold border-b border-black/10">{formatDate(student.dob)}</p>
                  </div>
                </div>
                <div className="space-y-1 text-left">
                  <p className="text-[11pt] font-bold uppercase text-[#1e3a8a]">Address</p>
                  <p className="text-[12pt] font-bold">{student.address?.toUpperCase() || "N/A"}</p>
                </div>
              </div>
            ) : (
              <table className="w-full border-collapse border border-black text-[13pt] uppercase font-bold">
                <tbody>
                  <tr className="h-[10mm] border-b border-black">
                    <td className={`pl-4 pr-2 whitespace-nowrap w-[20%] border-r border-black/10`}>STUDENT NAME:</td>
                    <td className="w-[30%] border-r border-black">{student.name.toUpperCase()}</td>
                    <td className={`pl-4 pr-2 whitespace-nowrap w-[20%] border-r border-black/10`}>CLASS / ROLL:</td>
                    <td className="w-[30%]">{student.class.toUpperCase()} / {student.rollNo.toUpperCase()}</td>
                  </tr>
                  <tr className="h-[10mm] border-b border-black">
                    <td className={`pl-4 pr-2 whitespace-nowrap border-r border-black/10`}>FATHER'S NAME:</td>
                    <td className="border-r border-black">{student.fathersName.toUpperCase()}</td>
                    <td className={`pl-4 pr-2 whitespace-nowrap border-r border-black/10`}>DATE OF BIRTH:</td>
                    <td>{formatDate(student.dob)}</td>
                  </tr>
                  <tr className="h-[10mm]">
                    <td className={`pl-4 pr-2 whitespace-nowrap border-r border-black/10`}>MOTHER'S NAME:</td>
                    <td className="border-r border-black">{student.mothersName.toUpperCase()}</td>
                    <td className={`pl-4 pr-2 whitespace-nowrap border-r border-black/10`}>ADDRESS:</td>
                    <td>{student.address?.toUpperCase() || "N/A"}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="border border-black overflow-hidden w-full" style={{ marginTop: SECTION_GAP }}>
            <table className="w-full text-[14pt] border-collapse">
              <thead>
                <tr className={`border-b font-black uppercase text-[16pt] ${designNum === 2 ? 'bg-black text-white border-black' : designNum === 3 ? 'bg-[#1e3a8a] text-white border-[#f59e0b]' : 'bg-gray-200 border-black'}`}>
                  <th className={`p-2 text-left w-[23%] border ${designNum === 3 ? 'border-[#1e3a8a]' : 'border-black'}`}>Subjects</th>
                  <th className={`p-2 text-center w-[16%] border ${designNum === 3 ? 'border-[#1e3a8a]' : 'border-black'}`}>T1 ({getMaxMarksPerTerm(student.gradeLevel)})</th>
                  <th className={`p-2 text-center w-[16%] border ${designNum === 3 ? 'border-[#1e3a8a]' : 'border-black'}`}>T2 ({getMaxMarksPerTerm(student.gradeLevel)})</th>
                  <th className={`p-2 text-center w-[16%] border ${designNum === 3 ? 'border-[#1e3a8a]' : 'border-black'}`}>T3 ({getMaxMarksPerTerm(student.gradeLevel)})</th>
                  <th className={`p-2 text-center w-[16%] border ${designNum === 3 ? 'border-[#1e3a8a]' : 'border-black'}`}>T4 ({getMaxMarksPerTerm(student.gradeLevel)})</th>
                  <th className={`p-2 text-left w-[23%] border ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>Subjects</th>
                  <th className={`p-2 text-center w-[16%] border ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>T1 ({getMaxMarksPerTerm(student.gradeLevel)})</th>
                  <th className={`p-2 text-center w-[16%] border ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>T2 ({getMaxMarksPerTerm(student.gradeLevel)})</th>
                  <th className={`p-2 text-center w-[16%] border ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>T3 ({getMaxMarksPerTerm(student.gradeLevel)})</th>
                  <th className={`p-2 text-center w-[16%] border ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>T4 ({getMaxMarksPerTerm(student.gradeLevel)})</th>
                  <th className={`p-2 text-center w-[13%] border ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {studentGrades.map((grade, idx) => (
                  <tr key={idx} className={`border-b font-bold h-[8mm] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
                    <td className={`border-r p-2 ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{formatSubjectName((grade as any).subjectName, student.class)}</td>
                    <td className={`border-r p-2 text-center text-[13pt] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{formatMark(grade, 'term1')}</td>
                    <td className={`border-r p-2 text-center text-[13pt] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{formatMark(grade, 'term2')}</td>
                    <td className={`border-r p-2 text-center text-[13pt] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{formatMark(grade, 'term3')}</td>
                    <td className={`border-r p-2 text-center text-[13pt] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{formatMark(grade, 'term4')}</td>
                    <td className={`p-2 text-center font-bold border-l ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'} text-[14pt]`}>{grade.term1 + grade.term2 + grade.term3 + grade.term4}</td>
                  </tr>
                ))}
                <tr className={`font-bold h-[8mm] border-t-2 ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
                  <td className={`border-r p-2 uppercase ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>Total Marks</td>
                  <td className={`border-r p-2 text-center text-[14pt] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{t1Total}</td>
                  <td className={`border-r p-2 text-center text-[14pt] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{t2Total}</td>
                  <td className={`border-r p-2 text-center text-[14pt] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{t3Total}</td>
                  <td className={`border-r p-2 text-center text-[14pt] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{t4Total}</td>
                  <td className={`p-2 text-center border-l text-[14pt] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{totalObtained}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={`border overflow-hidden w-full ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`} style={{ marginTop: SECTION_GAP }}>
            <table className="w-full text-[14pt] border-collapse text-center">
              <thead>
                <tr className={`border-b border-black font-black uppercase text-[16pt] ${designNum === 2 ? 'bg-black text-white' : designNum === 3 ? 'bg-[#1e3a8a] text-white' : 'bg-gray-200'}`}>
                  <th className="p-2 w-1/4">OBTAINED</th>
                  <th className="p-2 w-1/4">PERCENTAGE</th>
                  <th className="p-2 w-1/4">GRADE</th>
                  <th className="p-2 w-1/4">RESULT</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-bold h-[8mm]">
                  <td className={`border-r p-2 ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{totalObtained}/{totalPossible}</td>
                  <td className={`border-r p-2 ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{percentage}%</td>
                  <td className={`border-r p-2 ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{finalGrade}</td>
                  <td className="p-2 text-green-700">PASS</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-6 w-full" style={{ marginTop: SECTION_GAP }}>
            <div className="border border-black">
              <h4 className={`border-b border-black font-black p-2 text-center uppercase text-[15pt] h-[10mm] flex items-center justify-center ${designNum === 2 ? 'bg-black text-white' : designNum === 3 ? 'bg-[#1e3a8a] text-white' : 'bg-gray-200'}`}>CO-SCHOLASTIC ACTIVITIES</h4>
              <table className="w-full border-collapse text-[13pt] uppercase">
                <tbody>
                  <tr className={`border-b h-[8mm] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
                    <td className={`p-2 font-bold border-r w-[70%] ${designNum === 3 ? 'text-[#1e3a8a] border-[#f59e0b]' : 'border-black'}`}>Discipline</td>
                    <td className="p-2 text-center w-[30%] text-[14pt] font-bold">A</td>
                  </tr>
                  <tr className={`border-b h-[8mm] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
                    <td className={`p-2 font-bold border-r w-[70%] ${designNum === 3 ? 'text-[#1e3a8a] border-[#f59e0b]' : 'border-black'}`}>Art & Craft</td>
                    <td className="p-2 text-center w-[30%] text-[14pt] font-bold">A</td>
                  </tr>
                  <tr className="h-[8mm]">
                    <td className={`p-2 font-bold border-r w-[70%] ${designNum === 3 ? 'text-[#1e3a8a] border-[#f59e0b]' : 'border-black'}`}>General Activity</td>
                    <td className="p-2 text-center w-[30%] text-[14pt] font-bold">A</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className={`border ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
              <h4 className={`border-b font-black p-2 text-center uppercase text-[15pt] h-[10mm] flex items-center justify-center ${designNum === 2 ? 'bg-black text-white' : designNum === 3 ? 'bg-[#1e3a8a] text-white border-[#f59e0b]' : 'bg-gray-200 border-black'}`}>ATTENDANCE RECORD</h4>
              <table className="w-full border-collapse text-[13pt] uppercase">
                <tbody>
                  <tr className={`border-b h-[8mm] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
                    <td className={`p-2 font-bold border-r w-[70%] ${designNum === 3 ? 'text-[#1e3a8a] border-[#f59e0b]' : 'border-black'}`}>Total Days</td>
                    <td className="p-2 text-center w-[30%] font-bold">{student.attendance?.totalDays}</td>
                  </tr>
                  <tr className={`border-b h-[8mm] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
                    <td className={`p-2 font-bold border-r w-[70%] ${designNum === 3 ? 'text-[#1e3a8a] border-[#f59e0b]' : 'border-black'}`}>Present Days</td>
                    <td className="p-2 text-center w-[30%] font-bold">{student.attendance?.presentDays}</td>
                  </tr>
                  <tr className="h-[8mm]">
                    <td className={`p-2 font-bold border-r w-[70%] ${designNum === 3 ? 'text-[#1e3a8a] border-[#f59e0b]' : 'border-black'}`}>Attendance (%)</td>
                    <td className="p-2 text-center w-[30%] font-bold">{((student.attendance?.presentDays || 0) / (student.attendance?.totalDays || 1) * 100).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={`shadow-2xl mx-auto p-[10mm] relative overflow-hidden flex flex-col rounded-sm w-full max-w-[800px] min-h-[1100px] text-black font-serif transition-colors duration-500 ${designNum === 3 ? 'bg-[#fffbeb]' : 'bg-white'} border-[3px] border-double border-gray-800`}>
          <div className="absolute inset-4 border-[0.5pt] border-black pointer-events-none" />
          <div className={`border ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
            <div className={`border-b py-2 text-center ${designNum === 2 ? 'bg-black text-white' : designNum === 3 ? 'bg-[#1e3a8a] text-white border-[#f59e0b]' : 'bg-gray-200 border-black'}`}>
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
                  <tr key={idx} className={`border-b h-[8mm] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
                    <td className={`border-r ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{item.r}</td>
                    <td className={`border-r font-bold ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{item.g}</td>
                    <td className="italic font-bold">{item.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`border mt-8 ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
            <div className={`border-b py-2 text-center ${designNum === 2 ? 'bg-black text-white' : designNum === 3 ? 'bg-[#1e3a8a] text-white border-[#f59e0b]' : 'bg-gray-200 border-black'}`}>
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
          <div className="flex justify-between items-end font-black text-[16pt] uppercase pt-20 px-4 mt-auto">
            <div className="border-t-2 border-black pt-2 w-48 text-center">Teacher</div>
            <div className="border-t-2 border-black pt-2 w-48 text-center">Parent</div>
            <div className="border-t-2 border-black pt-2 w-48 text-center">Principal</div>
          </div>
        </div>
      </div>
    </div>
  );
}
