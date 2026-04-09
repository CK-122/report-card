"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DEFAULT_TEMPLATE, Student, getMaxMarksPerTerm, getMaxTheoryMarks, getMaxPracticalMarks, MarksheetTemplate, SCHOOLS, Grade } from "@/lib/types";
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
  gradeLevel: '6',
  class: '6 - A',
  schoolCode: '1',
  optionalSubjectCode: 1,
  address: 'STREET 35, LUCKNOW',
  grades: [
    { subject: 'Hindi Written', term1: 30, term2: 32, term3: 26, term4: 36 },
    { subject: 'Hindi Oral', term1: 50, term2: 44, term3: 39, term4: 42 },
    { subject: 'English Written', term1: 39, term2: 34, term3: 33, term4: 30 },
    { subject: 'English Oral', term1: 31, term2: 27, term3: 46, term4: 49 },
    { subject: 'Math Written', term1: 43, term2: 41, term3: 36, term4: 40 },
    { subject: 'Math Oral', term1: 30, term2: 46, term3: 39, term4: 34 },
    { subject: 'Urdu', term1: 44, term2: 39, term3: 47, term4: 42 },
    { subject: 'Drawing', term1: 27, term2: 29, term3: 47, term4: 43 },
    { subject: 'P.T.', term1: 43, term2: 32, term3: 50, term4: 39 }
  ],
  attendance: { totalDays: 227, presentDays: 192 }
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
    if (!dateStr || dateStr === "N/A" || dateStr.trim() === "") return "XX/XX/XXXX";
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
                className={`shadow-[0_0_50px_rgba(0,0,0,0.1)] relative text-black origin-top scale-[0.5] flex-shrink-0 transition-colors duration-500 ${designNum === 3 ? 'bg-[#fffbeb]' : 'bg-white'}`}
                style={{ 
                  width: `${PAGE_WIDTH_MM}mm`, 
                  height: `${PAGE_HEIGHT_MM}mm`,
                  fontFamily: "'Times New Roman', serif"
                }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{ margin: `${MARGIN_MM}mm` }}>
                  <div className="w-full h-full border-[1.2pt] border-black">
                    <div className={`m-[1.5mm] w-[calc(100%-3mm)] h-[calc(100%-3mm)] border-black ${designNum === 3 ? 'border-none' : 'border-[0.3pt]'}`} />
                    {designNum === 3 && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 border-[1.5pt] border-[#1e3a8a]" />
                        <div className="absolute inset-[1.2mm] border-[0.3pt] border-[#1e3a8a]" />
                        <div className="absolute inset-[1.8mm] border-[0.6pt] border-[#f59e0b]" />
                        <div className="absolute inset-[2.4mm] border-[0.3pt] border-[#1e3a8a]" />
                        <div className="absolute top-[-1mm] left-[-1mm] w-3 h-3 bg-[#1e3a8a] border border-[#f59e0b]/30" />
                        <div className="absolute top-[-1mm] right-[-1mm] w-3 h-3 bg-[#1e3a8a] border border-[#f59e0b]/30" />
                        <div className="absolute bottom-[-1mm] left-[-1mm] w-3 h-3 bg-[#1e3a8a] border border-[#f59e0b]/30" />
                        <div className="absolute bottom-[-1mm] right-[-1mm] w-3 h-3 bg-[#1e3a8a] border border-[#f59e0b]/30" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-full w-full relative" style={{ paddingTop: `${template.offsets.headerY - 1}mm` }}>
                  {activePage === 'front' ? (
                    <div className="p-8 pt-0 flex flex-col h-full mt-0 relative overflow-hidden">
                      {designNum === 3 && (
                        <>
                          <div 
                            className="absolute inset-0 pointer-events-none opacity-[0.25] z-0"
                            style={{ 
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='40'%3E%3Ctext x='100' y='25' font-family='serif' font-weight='bold' font-size='10' fill='%23E0E0E0' text-anchor='middle'%3E${encodeURIComponent(schoolInfo.name.toUpperCase())}%3C/text%3E%3C/svg%3E")`,
                              backgroundSize: '70mm 15mm'
                            }}
                          />
                          <div 
                            className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.08]"
                            style={{ zIndex: 0 }}
                          >
                            <img 
                              src={schoolInfo.logoColor || schoolInfo.logo} 
                              alt="Watermark" 
                              className="w-[100mm] h-[100mm] object-contain"
                            />
                          </div>
                        </>
                      )}
                      
                      <div className="text-center relative pb-2 pt-0 mt-[-2mm] z-10">
                        { (designNum === 3 ? (schoolInfo.logoColor || schoolInfo.logo) : schoolInfo.logo) && (
                          <img 
                            src={designNum === 3 ? (schoolInfo.logoColor || schoolInfo.logo) : schoolInfo.logo} 
                            alt="Logo" 
                            className={`absolute left-4 w-[22mm] h-[22mm] object-contain ${designNum === 2 || designNum === 3 ? 'top-[15mm]' : 'top-2'}`}
                          />
                        )}
                        <h1 
                          className={`text-[36pt] font-black uppercase tracking-tight mb-2 leading-tight ${designNum === 2 || designNum === 3 ? '' : (previewStudent.schoolCode === "3" ? 'pl-[14mm]' : 'pl-[26mm]')} ${designNum === 2 ? 'bg-[#101010] text-white px-8 pt-3 pb-0 inline-block absolute left-1/2 -translate-x-1/2 w-[calc(100%-8mm)]' : designNum === 3 ? 'bg-[#1e3a8a] text-white px-8 pt-3 pb-0 inline-block absolute left-1/2 -translate-x-1/2 w-[calc(100%-8mm)] border-b border-[#f59e0b]' : ''}`}
                        >
                          {schoolInfo.name}
                        </h1>
                        <div className={`text-[15pt] font-bold space-y-1 text-center pl-[8mm] ${designNum === 2 || designNum === 3 ? 'mt-[11mm]' : 'mt-[2mm]'}`}>
                          <p className="mb-0 leading-tight">{schoolInfo.tagline}</p>
                          <p className="mb-0 leading-tight">{schoolInfo.address}</p>
                          <p className="leading-tight pb-2 border-b border-black">Phone no : {schoolInfo.contact}  |  Email : {schoolInfo.email}</p>
                        </div>
                        <div className="flex justify-center gap-2 mb-2 no-print relative" style={{ zIndex: 50 }}>
                          <Button variant={designNum === 1 ? "default" : "outline"} size="sm" onClick={() => setDesignNum(1)} className="h-6 px-3 text-[8pt] font-bold">Classic</Button>
                          <Button variant={designNum === 2 ? "default" : "outline"} size="sm" onClick={() => setDesignNum(2)} className="h-6 px-3 text-[8pt] font-bold">Dark Header</Button>
                          <Button variant={designNum === 3 ? "default" : "outline"} size="sm" onClick={() => setDesignNum(3)} className="h-6 px-3 text-[8pt] font-bold bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90">Colorful</Button>
                        </div>
                        
                        <div className={`mt-1 border border-black py-1 relative top-[1mm] ${designNum === 2 ? 'bg-black text-white' : designNum === 3 ? 'bg-[#1e3a8a] text-white border-y border-[#f59e0b]' : '/80 shadow-sm'}`}>
                          <h2 className="text-[18pt] font-black uppercase tracking-widest leading-none text-center">PROGRESS REPORT CARD (2025-26)</h2>
                        </div>
                      </div>

                      <div className="flex flex-col -mt-1">
                        <h2 className={`text-center text-[16pt] font-black uppercase py-2 ${designNum === 2 ? 'bg-[#000000] text-white' : designNum === 3 ? 'bg-[#1e3a8a] text-white border border-[#f59e0b]' : 'bg-[#DCDCDC] border-y border-black'}`}>STUDENT PROFILE</h2>
                        {designNum === 3 ? (
                          <div className={`flex flex-col gap-4 px-6 py-4 rounded-b-xl border border-t-0 z-10 bg-white shadow-md border-[#f59e0b] relative`}>
                            <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-left">
                              <div className="space-y-1">
                                <p className="text-[11pt] font-bold uppercase text-[#1e3a8a]">Student Name</p>
                                <p className="text-[13pt] font-bold border-b border-black/10">Adnan Ali</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11pt] font-bold uppercase text-[#1e3a8a]">Class / Roll</p>
                                <p className="text-[13pt] font-bold border-b border-black/10">9th / 21</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11pt] font-bold uppercase text-[#1e3a8a]">Father&apos;s Name</p>
                                <p className="text-[13pt] font-bold border-b border-black/10">Mr. Munne</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11pt] font-bold uppercase text-[#1e3a8a]">D.O.B</p>
                                <p className="text-[13pt] font-bold border-b border-black/10">01/01/2008</p>
                              </div>
                            </div>
                            <div className="space-y-1 text-left">
                              <p className="text-[11pt] font-bold uppercase text-[#1e3a8a]">Address</p>
                              <p className="text-[12pt] font-bold">Jabbarpur, Amroha, Uttar Pradesh</p>
                            </div>
                          </div>
                        ) : (
                          <table className="w-full text-[12pt] border-collapse border border-black uppercase">
                            <tbody className="font-bold">
                              <tr className="h-[10mm] border-b border-black">
                                <td className={`pl-4 pr-2 whitespace-nowrap w-[20%] border-r border-black/10`}>STUDENT NAME:</td>
                                <td className="w-[30%] border-r border-black">ADNAN ALI</td>
                                <td className={`pl-4 pr-2 whitespace-nowrap w-[20%] border-r border-black/10`}>CLASS / ROLL:</td>
                                <td className="w-[30%]">9TH / 21</td>
                              </tr>
                              <tr className="h-[10mm] border-b border-black">
                                <td className={`pl-4 pr-2 whitespace-nowrap border-r border-black/10`}>FATHER'S NAME:</td>
                                <td className="border-r border-black">MR. MUNNE</td>
                                <td className={`pl-4 pr-2 whitespace-nowrap border-r border-black/10`}>D.O.B:</td>
                                <td>01/01/2008</td>
                              </tr>
                              <tr className="h-[10mm]">
                                <td className={`pl-4 pr-2 whitespace-nowrap border-r border-black/10`}>MOTHER'S NAME:</td>
                                <td className="border-r border-black">REHANA BEGUM</td>
                                <td className={`pl-4 pr-2 whitespace-nowrap border-r border-black/10`}>ADDRESS:</td>
                                <td>JABBARPUR, AMROHA</td>
                              </tr>
                            </tbody>
                          </table>
                        )}
                      </div>

                      <div className={`border overflow-hidden w-full ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`} style={{ marginTop: SECTION_GAP }}>
                        <table className="w-full text-[14pt] border-collapse">
                          <thead>
                            <tr className={`border-b font-black uppercase text-[16pt] h-[10mm] ${designNum === 2 ? 'bg-black text-white border-black' : designNum === 3 ? 'bg-[#1e3a8a] text-white border-[#f59e0b]' : 'bg-gray-200 border-black'}`}>
                              <th className={`p-2 text-left w-[23%] border-r ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>Subjects</th>
                              <th className={`p-2 text-center w-[16%] border-r ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>T1 ({getMaxMarksPerTerm(previewStudent.gradeLevel)})</th>
                              <th className={`p-2 text-center w-[16%] border-r ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>T2 ({getMaxMarksPerTerm(previewStudent.gradeLevel)})</th>
                              <th className={`p-2 text-center w-[16%] border-r ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>T3 ({getMaxMarksPerTerm(previewStudent.gradeLevel)})</th>
                              <th className={`p-2 text-center w-[16%] border-r ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>T4 ({getMaxMarksPerTerm(previewStudent.gradeLevel)})</th>
                              <th className={`p-2 text-center w-[13%] ${designNum === 3 ? 'text-[#1e3a8a]' : ''}`}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewStudent.grades.map((grade, idx) => (
                              <tr key={idx} className={`border-b font-bold h-[8mm] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
                                <td className={`border-r p-2 font-bold ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>{formatSubjectName(cleanSubjectName(grade.subject), previewStudent.class)}</td>
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
                            <tr className={`border-b font-black uppercase text-[16pt] h-[10mm] ${designNum === 2 ? 'bg-black text-white border-black' : designNum === 3 ? 'bg-[#1e3a8a] text-white border-[#f59e0b]' : ''}`}>
                              <th className="p-2 w-[25%] font-black uppercase text-center">OBTAINED</th>
                              <th className="p-2 w-[25%] font-black uppercase text-center">PERCENTAGE</th>
                              <th className="p-2 w-[25%] font-black uppercase text-center">GRADE</th>
                              <th className="p-2 w-[25%] font-black uppercase text-center">RESULT</th>
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
                        <div className={`border ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
                          <h4 className={`border-b font-black p-2 text-center uppercase text-[15pt] h-[10mm] flex items-center justify-center ${designNum === 2 ? 'bg-black text-white border-black' : designNum === 3 ? 'bg-[#1e3a8a] text-white border-[#f59e0b]' : ''}`}>CO-SCHOLASTIC ACTIVITIES</h4>
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
                          <h4 className={`border-b font-black p-2 text-center uppercase text-[15pt] h-[10mm] flex items-center justify-center ${designNum === 2 ? 'bg-black text-white border-black' : designNum === 3 ? 'bg-[#1e3a8a] text-white border-[#f59e0b]' : ''}`}>ATTENDANCE RECORD</h4>
                          <table className="w-full border-collapse text-[13pt] uppercase">
                            <tbody>
                              <tr className={`border-b h-[8mm] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
                                <td className={`p-2 font-bold border-r w-[70%] ${designNum === 3 ? 'text-[#1e3a8a] border-[#f59e0b]' : 'border-black'}`}>Total Days</td>
                                <td className="p-2 text-center w-[30%] font-bold">{previewStudent.attendance?.totalDays}</td>
                              </tr>
                              <tr className={`border-b h-[8mm] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
                                <td className={`p-2 font-bold border-r w-[70%] ${designNum === 3 ? 'text-[#1e3a8a] border-[#f59e0b]' : 'border-black'}`}>Present Days</td>
                                <td className="p-2 text-center w-[30%] font-bold">{previewStudent.attendance?.presentDays}</td>
                              </tr>
                              <tr className="h-[8mm]">
                                <td className={`p-2 font-bold border-r w-[70%] ${designNum === 3 ? 'text-[#1e3a8a] border-[#f59e0b]' : 'border-black'}`}>Attendance (%)</td>
                                <td className="p-2 text-center w-[30%] font-bold">{((previewStudent.attendance?.presentDays || 0) / (previewStudent.attendance?.totalDays || 1) * 100).toFixed(1)}%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full relative flex flex-col p-8 pt-10 space-y-8">
                      <div className={`border ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
                        <div className={`border-b py-2 text-center ${designNum === 2 ? 'bg-black text-white border-black' : designNum === 3 ? 'bg-[#1e3a8a] text-white border-[#f59e0b]' : 'bg-gray-200'}`}>
                          <h3 className="text-[16pt] font-black uppercase">Grading System</h3>
                        </div>
                        <table className="w-full text-center text-[14pt] border-collapse">
                          <thead>
                            <tr className={`border-b font-bold h-[10mm] ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
                              <th className={`p-2 w-[35%] uppercase text-center border-r ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>Score Range</th>
                              <th className={`p-2 w-[30%] uppercase text-center border-r ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>Grade</th>
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
                      <div className={`border ${designNum === 3 ? 'border-[#f59e0b]' : 'border-black'}`}>
                        <div className={`border-b py-2 text-center ${designNum === 2 ? 'bg-black text-white border-black' : designNum === 3 ? 'bg-[#1e3a8a] text-white border-[#f59e0b]' : 'bg-gray-200 border-black'}`}>
                          <h3 className="text-[16pt] font-black uppercase">Assessment Scheme & School Rules</h3>
                        </div>
                        <ul className="p-6 space-y-4 text-[14pt] list-decimal list-inside font-bold">
                          <li className="font-bold">
                            {getMaxPracticalMarks(previewStudent.gradeLevel) > 0 
                              ? `Assessment structure: Theory (${getMaxTheoryMarks(previewStudent.gradeLevel)}) + Practical (${getMaxPracticalMarks(previewStudent.gradeLevel)}) = ${getMaxMarksPerTerm(previewStudent.gradeLevel)} marks per term.`
                              : `Each subject carries a maximum of ${getMaxMarksPerTerm(previewStudent.gradeLevel)} marks per term (Total ${getMaxMarksPerTerm(previewStudent.gradeLevel) * 4} Marks).`
                            }
                          </li>
                          <li className="font-bold">Students must maintain 75% attendance to appear in final exams.</li>
                          <li className="font-bold">Punctuality and discipline are mandatory for all students.</li>
                          <li className="font-bold">Parents are requested to attend Parent-Teacher Meetings regularly.</li>
                          <li className="font-bold">Report card should be signed and returned within 3 days.</li>
                          <li className="font-bold">Students must wear proper school uniform daily.</li>
                        </ul>
                      </div>
                      <div className="absolute w-[calc(100%-64px)] flex justify-between items-end font-black text-[16pt] uppercase" style={{ bottom: `2mm`, left: '32px' }}>
                        <div className="border-t-2 border-black pt-2 w-48 text-center text-[14pt]">Teacher's Signature</div>
                        <div className="border-t-2 border-black pt-2 w-48 text-center text-[14pt]">Parent's Signature</div>
                        <div className="border-t-2 border-black pt-2 w-48 text-center text-[14pt]">Principal's Signature</div>
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
