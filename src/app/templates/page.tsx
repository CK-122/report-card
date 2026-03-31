"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DEFAULT_TEMPLATE, Student, getMaxMarksPerTerm, MarksheetTemplate, SCHOOLS, Grade } from "@/lib/types";
import { 
  Save, 
  ArrowUpDown,
  BookOpen,
  Eye
} from "lucide-react";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DEFAULT_PREVIEW_STUDENT: Student = {
  id: 'preview',
  name: 'VIHAAN PATEL',
  studentId: 'ST-2025-XXX',
  fathersName: 'VIHAAN PATEL',
  mothersName: 'LAKSH CHOUDHARY',
  dob: '2018-10-13',
  rollNo: '1',
  srNo: '2000.0',
  penNo: 'PEN630550',
  gradeLevel: '6',
  class: '6 - A',
  schoolCode: '1',
  optionalSubjectCode: 1,
  address: 'STREET 35, LUCKNOW',
  grades: [
    { subject: 'Drawing', term1: 27, term2: 29, term3: 47, term4: 43 },
    { subject: 'Hindi Written', term1: 30, term2: 32, term3: 26, term4: 36 },
    { subject: 'Hindi Oral', term1: 50, term2: 44, term3: 39, term4: 42 },
    { subject: 'English Written', term1: 39, term2: 34, term3: 33, term4: 30 },
    { subject: 'English Oral', term1: 31, term2: 27, term3: 46, term4: 49 },
    { subject: 'Math Written', term1: 43, term2: 41, term3: 36, term4: 40 },
    { subject: 'Math Oral', term1: 30, term2: 46, term3: 39, term4: 34 },
    { subject: 'P.T.', term1: 43, term2: 32, term3: 50, term4: 39 },
    { subject: 'Urdu', term1: 44, term2: 39, term3: 47, term4: 42 }
  ],
  attendance: { totalDays: 200, presentDays: 168 }
};

export default function TemplateEditor() {
  const [template, setTemplate] = useState<MarksheetTemplate>(DEFAULT_TEMPLATE);
  const { toast } = useToast();
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
  const [previewStudent] = useState<Student>(DEFAULT_PREVIEW_STUDENT);
  const [designNum, setDesignNum] = useState(1);
  const [activePage, setActivePage] = useState<"front" | "back">("front");

  useEffect(() => {
    const saved = localStorage.getItem('marksheet_template');
    if (saved) {
      try {
        setTemplate(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const updateOffset = (key: keyof typeof template.offsets, value: number) => {
    setTemplate({
      ...template,
      offsets: {
        ...template.offsets,
        [key]: value
      }
    });
  };

  const handleSave = () => {
    localStorage.setItem('marksheet_template', JSON.stringify(template));
    toast({
      title: "Settings Saved",
      description: "Institutional layout has been finalized."
    });
  };

  const formatMark = (grade: Grade, term: 'term1' | 'term2' | 'term3' | 'term4') => {
    if (grade.details?.[term] && grade.details[term]!.practical > 0) {
      const { theory, practical } = grade.details[term]!;
      return `${theory}(T) + ${practical} (P)`;
    }
    return grade[term].toString();
  };

  const cleanSubjectName = (name: string) => {
    return name.replace(/\s*\(T\s*\+\s*P\)\s*/g, '');
  };

  const schoolInfo = SCHOOLS[previewStudent.schoolCode] || SCHOOLS["1"];
  const termMax = getMaxMarksPerTerm(previewStudent.gradeLevel);
  const totalMaxPerSubject = termMax * 4;
  const totalObtained = previewStudent.grades.reduce((sum, g) => 
    sum + g.term1 + g.term2 + g.term3 + g.term4, 0
  );
  const totalPossible = previewStudent.grades.length * totalMaxPerSubject;
  const percentage = parseFloat(((totalObtained / totalPossible) * 100).toFixed(2));
  
  const finalGrade = percentage >= 91 ? "A+" : 
                   percentage >= 81 ? "A" : 
                   percentage >= 71 ? "B" : 
                   percentage >= 61 ? "C" : "D";

  const t1Total = previewStudent.grades.reduce((sum, g) => sum + g.term1, 0);
  const t2Total = previewStudent.grades.reduce((sum, g) => sum + g.term2, 0);
  const t3Total = previewStudent.grades.reduce((sum, g) => sum + g.term3, 0);
  const t4Total = previewStudent.grades.reduce((sum, g) => sum + g.term4, 0);

  const PAGE_WIDTH_MM = 210;
  const PAGE_HEIGHT_MM = 297;
  const MARGIN_MM = 4;
  const SECTION_GAP = "6mm"; 

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline text-primary">Layout Architect</h2>
            <p className="text-muted-foreground mt-1">Finalize vector positions for high-resolution output.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg" onClick={handleSave}>
            <Save className="size-4" />
            Lock Layout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <ArrowUpDown className="size-4 text-primary" /> Global Offsets (mm)
                </CardTitle>
                <CardDescription className="text-[10px]">Tweak alignment to prevent overlap.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold uppercase">Header Buffer</Label>
                    <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded">{template.offsets.headerY}mm</span>
                  </div>
                  <Slider value={[template.offsets.headerY]} max={50} step={1} onValueChange={(v) => updateOffset('headerY', v[0])} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between bg-white p-2 rounded-t-lg border-b">
              <Tabs value={activePage} onValueChange={(v) => setActivePage(v as any)} className="w-full">
                <TabsList className="grid grid-cols-2 w-[300px] h-8 p-1">
                  <TabsTrigger value="front" className="text-[10px] font-bold uppercase">
                    <BookOpen className="size-3 mr-2" /> Page 1 (Front)
                  </TabsTrigger>
                  <TabsTrigger value="back" className="text-[10px] font-bold uppercase">
                    <Eye className="size-3 mr-2" /> Page 2 (Back)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="bg-muted p-12 rounded-b-lg border-x border-b flex justify-center overflow-auto max-h-[85vh]">
              <div 
                className="bg-white shadow-[0_0_50px_rgba(0,0,0,0.1)] relative text-black origin-top scale-[0.5] flex-shrink-0"
                style={{ 
                  width: `${PAGE_WIDTH_MM}mm`, 
                  height: `${PAGE_HEIGHT_MM}mm`,
                  fontFamily: "'Times New Roman', serif"
                }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{ margin: `${MARGIN_MM}mm` }}>
                  <div className="w-full h-full border-[1.2pt] border-black">
                    <div className="m-[1.5mm] w-[calc(100%-3mm)] h-[calc(100%-3mm)] border-[0.3pt] border-black" />
                  </div>
                </div>

                <div className="h-full w-full relative" style={{ paddingTop: `${template.offsets.headerY - 1}mm` }}>
                  {activePage === 'front' ? (
                    <div className="p-8 pt-0 flex flex-col h-full mt-0">
                      <div className="text-center relative pb-2 pt-0 mt-[-3mm]">
                        <h1 
                          className={`text-[34pt] font-black uppercase tracking-tight mb-2 leading-tight ${designNum === 2 ? '' : (previewStudent.schoolCode === "3" ? 'pl-[14mm]' : 'pl-[26mm]')} ${designNum === 2 ? 'bg-[#101010] text-white px-8 pt-3 pb-0 inline-block absolute left-1/2 -translate-x-1/2 w-[calc(100%-8mm)]' : ''}`}
                        >
                          {schoolInfo.name}
                        </h1>
                        <div className={`text-[15pt] italic font-bold space-y-1 text-center pl-[8mm] ${designNum === 2 ? 'mt-[10mm]' : 'mt-[2mm]'}`}>
                          <p className="mb-0 leading-tight">{schoolInfo.tagline}</p>
                          <p className="mb-0 leading-tight">{schoolInfo.address}</p>
                          <p className="leading-tight pb-2 border-b border-black">Phone no : {schoolInfo.contact}  |  Email : {schoolInfo.email}</p>
                        </div>
                        <div className="flex justify-center gap-2 mb-2 no-print relative" style={{ zIndex: 50 }}>
                          <Button 
                            variant={designNum === 1 ? "default" : "outline"} 
                            size="sm" 
                            onClick={() => setDesignNum(1)}
                            className="h-6 px-3 text-[8pt] font-bold"
                          >
                            Classic
                          </Button>
                          <Button 
                            variant={designNum === 2 ? "default" : "outline"} 
                            size="sm" 
                            onClick={() => setDesignNum(2)}
                            className="h-6 px-3 text-[8pt] font-bold"
                          >
                            Dark Header
                          </Button>
                        </div>
                        
                        <div className={`mt-1 border border-black py-1 relative top-[1mm] ${designNum === 2 ? 'bg-black text-white' : 'bg-gray-200/80 shadow-sm'}`}>
                          <h2 className="text-[18pt] font-black uppercase tracking-widest leading-none text-center">PROGRESS REPORT CARD (2025-26)</h2>
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
                              <td className="w-[30%]">{previewStudent.name}</td>
                              <td className="w-[5%]" />
                              <td className="pr-2 whitespace-nowrap w-[15%]">Class:</td>
                              <td className="w-[30%]">{previewStudent.class}</td>
                            </tr>
                            <tr className="h-[10mm]">
                              <td className="pl-4 pr-2 whitespace-nowrap">Father Name:</td>
                              <td>{previewStudent.fathersName}</td>
                              <td />
                              <td className="pr-2 whitespace-nowrap">Roll No:</td>
                              <td>{previewStudent.rollNo}</td>
                            </tr>
                            <tr className="h-[10mm]">
                              <td className="pl-4 pr-2 whitespace-nowrap">Mother Name:</td>
                              <td>{previewStudent.mothersName}</td>
                              <td />
                              <td className="pr-2 whitespace-nowrap">DOB:</td>
                              <td>{formatDate(previewStudent.dob)}</td>
                            </tr>
                            <tr className="h-[10mm]">
                              <td className="pl-4 pr-2 whitespace-nowrap">SR No:</td>
                              <td>{previewStudent.srNo}</td>
                              <td />
                              <td className="pr-2 whitespace-nowrap">PEN No:</td>
                              <td>{previewStudent.penNo || "N/A"}</td>
                            </tr>
                            <tr className="h-[10mm]">
                              <td className="pl-4 pr-2 whitespace-nowrap">Address:</td>
                              <td colSpan={4} className="pr-4">{previewStudent.address?.toUpperCase() || "N/A"}</td>
                            </tr>
                          </tbody>
                        </table>

                      <div className="w-full border border-black overflow-hidden" style={{ marginTop: SECTION_GAP }}>
                        <table className="w-full text-[14pt] border-collapse">
                          <thead>
                            <tr className={`border-b border-black font-black uppercase text-[16pt] h-[10mm] ${designNum === 2 ? 'bg-black text-white' : 'bg-gray-200'}`}>
                              <th className="p-2 text-left w-[23%]">Subjects</th>
                              <th className="p-2 text-center w-[16%]">T1 ({getMaxMarksPerTerm(previewStudent.gradeLevel)})</th>
                              <th className="p-2 text-center w-[16%]">T2 ({getMaxMarksPerTerm(previewStudent.gradeLevel)})</th>
                              <th className="p-2 text-center w-[16%]">T3 ({getMaxMarksPerTerm(previewStudent.gradeLevel)})</th>
                              <th className="p-2 text-center w-[16%]">T4 ({getMaxMarksPerTerm(previewStudent.gradeLevel)})</th>
                              <th className="p-2 text-center w-[13%]">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewStudent.grades.map((grade, idx) => (
                              <tr key={idx} className="border-b border-black h-[8mm] font-bold">
                                <td className="border-r border-black p-2 font-bold">{formatSubjectName(cleanSubjectName(grade.subject), previewStudent.class)}</td>
                                <td className="border-r border-black p-2 text-center text-[13pt]">{formatMark(grade, 'term1')}</td>
                                <td className="border-r border-black p-2 text-center text-[13pt]">{formatMark(grade, 'term2')}</td>
                                <td className="border-r border-black p-2 text-center text-[13pt]">{formatMark(grade, 'term3')}</td>
                                <td className="border-r border-black p-2 text-center text-[13pt]">{formatMark(grade, 'term4')}</td>
                                <td className="p-2 text-center font-bold border-l border-black bg-gray-50 text-[14pt]">{grade.term1 + grade.term2 + grade.term3 + grade.term4}</td>
                              </tr>
                            ))}
                            <tr className="font-bold bg-gray-100 h-[8mm] border-t-2 border-black">
                              <td className="border-r border-black p-2 uppercase">Total Marks</td>
                              <td className="border-r border-black p-2 text-center text-[14pt]">{t1Total}</td>
                              <td className="border-r border-black p-2 text-center text-[14pt]">{t2Total}</td>
                              <td className="border-r border-black p-2 text-center text-[14pt]">{t3Total}</td>
                              <td className="border-r border-black p-2 text-center text-[14pt]">{t4Total}</td>
                              <td className="p-2 text-center border-l border-black bg-gray-200 text-[14pt]">{totalObtained}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="border border-black overflow-hidden w-full" style={{ marginTop: SECTION_GAP }}>
                        <table className="w-full text-[14pt] border-collapse text-center">
                          <thead>
                            <tr className={`border-b border-black font-black uppercase text-[16pt] h-[10mm] ${designNum === 2 ? 'bg-black text-white' : 'bg-gray-200'}`}>
                              <th className="p-2 w-[25%] font-black uppercase text-center">OBTAINED</th>
                              <th className="p-2 w-[25%] font-black uppercase text-center">PERCENTAGE</th>
                              <th className="p-2 w-[25%] font-black uppercase text-center">GRADE</th>
                              <th className="p-2 w-[25%] font-black uppercase text-center">RESULT</th>
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
                                <td className="p-2 text-center w-[30%] font-bold">{previewStudent.attendance?.totalDays}</td>
                              </tr>
                              <tr className="border-b border-black h-[8mm]">
                                <td className="p-2 font-bold border-r border-black w-[70%]">Present Days</td>
                                <td className="p-2 text-center w-[30%] font-bold">{previewStudent.attendance?.presentDays}</td>
                              </tr>
                              <tr className="h-[8mm]">
                                <td className="p-2 font-bold border-r border-black w-[70%]">Attendance (%)</td>
                                <td className="p-2 text-center w-[30%] font-bold">{((previewStudent.attendance?.presentDays || 0) / (previewStudent.attendance?.totalDays || 1) * 100).toFixed(1)}%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full relative flex flex-col p-8 pt-10 space-y-8">
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
                        <div className={`border-b border-black py-2 text-center ${designNum === 2 ? 'bg-black text-white' : 'bg-gray-200'}`}>
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
                      <div className="absolute w-[calc(100%-64px)] flex justify-between items-end font-black text-[16pt] uppercase" style={{ bottom: `7mm`, left: '32px' }}>
                        <div className="border-t-2 border-black pt-2 w-48 text-center">Teacher</div>
                        <div className="border-t-2 border-black pt-2 w-48 text-center">Parent</div>
                        <div className="border-t-2 border-black pt-2 w-48 text-center">Principal</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
