export interface Grade {
  subject: string;
  term1: number;
  term2: number;
  term3: number;
  term4: number;
  details?: {
    term1?: { theory: number; practical: number };
    term2?: { theory: number; practical: number };
    term3?: { theory: number; practical: number };
    term4?: { theory: number; practical: number };
  };
}

export interface Student {
  id: string;
  name: string;
  studentId?: string;
  email?: string;
  fathersName: string;
  mothersName: string;
  dob: string;
  rollNo: string;
  srNo: string;
  penNo: string;
  gradeLevel: string;
  class: string;
  schoolCode: string;
  optionalSubjectCode?: number;
  grades: Grade[];
  aiComment?: string;
  additionalContext?: string;
  address?: string;
  attendance?: {
    totalDays: number;
    presentDays: number;
  };
  coScholastic?: {
    discipline?: string;
    pt?: string;
    music?: string;
    art?: string;
    yoga?: string;
  };
}

export interface SchoolInfo {
  code: string;
  name: string;
  tagline: string;
  address: string;
  contact: string;
  email: string;
  gradeRange: string;
}

export const SCHOOLS: Record<string, SchoolInfo> = {
  "1": {
    code: "1",
    name: "C.K. JUNIOR HIGH SCHOOL",
    tagline: "(A Co-Educational Hindi & English Medium School)",
    address: "Village Jabbarpur Post khera District Amroha",
    contact: "9837892812",
    email: "ckjabbarpur@gmail.com",
    gradeRange: "NUR TO 8"
  },
  "2": {
    code: "2",
    name: "C. K.   H I G H   S C H O O L",
    tagline: "(A Co-Educational Hindi & English Medium School)",
    address: "Village Jabbarpur Post khera District Amroha",
    contact: "9837892812",
    email: "ckhighschool@gmail.com",
    gradeRange: "9 TO 10"
  },
  "3": {
    code: "3",
    name: "M.T.Q.",
    tagline: "(A Co-Educational Hindi & English Medium School)",
    address: "Village Jabbarpur Post khera District Amroha",
    contact: "9837892812",
    email: "mtqschool@gmail.com",
    gradeRange: "1 TO 8"
  }
};

export interface MarksheetTemplate {
  name: string;
  schoolName: string;
  schoolAddress: string;
  schoolContact: string;
  schoolEmail: string;
  rubricDescription: string;
  sections: Array<{ id: string; title: string; isVisible: boolean }>;
  offsets: {
    headerY: number;
    infoY: number;
    tableY: number;
    summaryY: number;
    signY: number;
  };
}

export const DEFAULT_TEMPLATE: MarksheetTemplate = {
  name: "Standard Report Card",
  schoolName: "C.K. JUNIOR HIGH SCHOOL",
  schoolAddress: "Village Jabbarpur Post khera District Amroha",
  schoolContact: "9837892812",
  schoolEmail: "ckjabbarpur@gmail.com",
  rubricDescription: "Standard academic assessment based on 4-term progress.",
  sections: [
    { id: 'sec-1', title: 'Header & Branding', isVisible: true },
    { id: 'sec-2', title: 'Student Info', isVisible: true },
    { id: 'sec-3', title: 'Grades Table', isVisible: true },
    { id: 'sec-4', title: 'Result Summary', isVisible: true },
    { id: 'sec-6', title: 'Signatures', isVisible: true }
  ],
  offsets: {
    headerY: 5, 
    infoY: 60,
    tableY: 30,
    summaryY: 35,
    signY: 12
  }
};

export function getMaxMarksPerTerm(gradeLevel: string): number {
  const level = gradeLevel.toUpperCase();
  if (['NUR', 'LKG', 'UKG'].includes(level)) return 50;
  const gradeNum = parseInt(level);
  if (!isNaN(gradeNum)) {
    return gradeNum >= 9 ? 100 : 50;
  }
  return 50;
}

export function getMaxTheoryMarks(gradeLevel: string): number {
  const level = gradeLevel.toUpperCase();
  if (['NUR', 'LKG', 'UKG'].includes(level)) return 50;
  const gradeNum = parseInt(level);
  if (gradeNum >= 6 && gradeNum <= 8) return 40;
  if (gradeNum >= 9) return 70;
  return 50;
}

export function getMaxPracticalMarks(gradeLevel: string): number {
  const level = gradeLevel.toUpperCase();
  const gradeNum = parseInt(level);
  if (gradeNum >= 6 && gradeNum <= 8) return 10;
  if (gradeNum >= 9) return 30;
  return 0;
}

export const MOCK_STUDENTS: Student[] = [];
