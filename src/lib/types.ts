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

import { 
  LOGO_SCHOOL_1, 
  LOGO_SCHOOL_2, 
  LOGO_SCHOOL_3,
  LOGO_SCHOOL_1_COLOR,
  LOGO_SCHOOL_2_COLOR
} from "./logos";

export interface SchoolInfo {
  code: string;
  name: string;
  tagline: string;
  address: string;
  contact: string;
  email: string;
  gradeRange: string;
  logo?: string;
  logoColor?: string;
}

export const SCHOOLS: Record<string, SchoolInfo> = {
  "1": {
    code: "1",
    name: "C.K. JUNIOR HIGH SCHOOL",
    tagline: "(A Co-Educational Hindi & English Medium School)",
    address: "Village Jabbarpur Post khera District Amroha",
    contact: "9837892812",
    email: "ckjabbarpur@gmail.com",
    gradeRange: "NUR TO 8",
    logo: LOGO_SCHOOL_1,
    logoColor: LOGO_SCHOOL_1_COLOR
  },
  "2": {
    code: "2",
    name: "C. K.   H I G H   S C H O O L",
    tagline: "(A Co-Educational Hindi & English Medium School)",
    address: "Village Jabbarpur Post khera District Amroha",
    contact: "9837892812",
    email: "ckjabbarpur@gmail.com",
    gradeRange: "9 TO 10",
    logo: LOGO_SCHOOL_2,
    logoColor: LOGO_SCHOOL_2_COLOR
  },
  "3": {
    code: "3",
    name: "M.T.Q.",
    tagline: "(A Co-Educational Hindi & English Medium Institution)",
    address: "Village Jabbarpur Post khera District Amroha",
    contact: "9837892812",
    email: "ckjabbarpur@gmail.com",
    gradeRange: "1 TO 8",
    logo: LOGO_SCHOOL_3
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

export interface SubjectDef {
  name: string;
  hasPractical: boolean;
}

export const SUBJECTS_BY_GRADE: Record<string, SubjectDef[]> = {
  'NUR': [
    { name: 'Hindi Oral', hasPractical: false },
    { name: 'Hindi Written', hasPractical: false },
    { name: 'English Oral', hasPractical: false },
    { name: 'English Written', hasPractical: false },
    { name: 'Math Oral', hasPractical: false },
    { name: 'Math Written', hasPractical: false },
    { name: 'Urdu / Poem', hasPractical: false },
    { name: 'Drawing', hasPractical: false }
  ],
  'LKG': [
    { name: 'Hindi Oral', hasPractical: false },
    { name: 'Hindi Written', hasPractical: false },
    { name: 'English Oral', hasPractical: false },
    { name: 'English Written', hasPractical: false },
    { name: 'Math Oral', hasPractical: false },
    { name: 'Math Written', hasPractical: false },
    { name: 'Urdu / Poem', hasPractical: false },
    { name: 'Drawing', hasPractical: false }
  ],
  'UKG': [
    { name: 'Hindi Oral', hasPractical: false },
    { name: 'Hindi Written', hasPractical: false },
    { name: 'English Oral', hasPractical: false },
    { name: 'English Written', hasPractical: false },
    { name: 'Math Oral', hasPractical: false },
    { name: 'Math Written', hasPractical: false },
    { name: 'Urdu / Poem', hasPractical: false },
    { name: 'Drawing', hasPractical: false }
  ],
  'PRIMARY': [
    { name: 'Hindi', hasPractical: false },
    { name: 'English', hasPractical: false },
    { name: 'Mathematics', hasPractical: false },
    { name: 'EVS', hasPractical: false },
    { name: 'Computer', hasPractical: false },
    { name: 'G.K.', hasPractical: false },
    { name: 'Urdu / Sanskrit', hasPractical: false },
    { name: 'Craft', hasPractical: false },
    { name: 'Drawing', hasPractical: false }
  ],
  'MIDDLE': [
    { name: 'Hindi', hasPractical: false },
    { name: 'English', hasPractical: false },
    { name: 'Mathematics', hasPractical: false },
    { name: 'Science', hasPractical: false },
    { name: 'Social Science', hasPractical: false },
    { name: 'Computer', hasPractical: false },
    { name: 'Urdu / Sanskrit', hasPractical: false },
    { name: 'H.Sci. / P. Kala', hasPractical: true },
    { name: 'Drawing', hasPractical: false }
  ],
  'HIGH': [
    { name: 'Hindi', hasPractical: true },
    { name: 'English', hasPractical: true },
    { name: 'Math/H.Sci.', hasPractical: true },
    { name: 'Science', hasPractical: true },
    { name: 'Social Science', hasPractical: true },
    { name: 'Drawing', hasPractical: true }
  ]
};

export function getSubjectsByGrade(gradeLevel: string): SubjectDef[] {
  const level = gradeLevel.toUpperCase();
  if (['NUR', 'LKG', 'UKG'].includes(level)) return SUBJECTS_BY_GRADE[level];
  const gradeNum = parseInt(level);
  if (gradeNum >= 1 && gradeNum <= 5) return SUBJECTS_BY_GRADE['PRIMARY'];
  if (gradeNum >= 6 && gradeNum <= 8) return SUBJECTS_BY_GRADE['MIDDLE'];
  if (gradeNum >= 9) return SUBJECTS_BY_GRADE['HIGH'];
  return SUBJECTS_BY_GRADE['PRIMARY'];
}

/**
 * Resolves a potentially generic subject name into a specific one based on the grade level and optional code.
 * Standardizes the elective logic across the application.
 */
export function resolveSubjectName(rawName: string, gradeLevel: string, optionalCode: number): string {
  const level = gradeLevel.toUpperCase();
  const sub = rawName.toLowerCase();
  const code = optionalCode || 1;

  // Cleanup potential suffixes
  let subjectName = rawName.replace(/\s*\(T\s*\+\s*P\)\s*/g, '');

  if (['NUR', 'LKG', 'UKG'].includes(level)) {
    if (sub.includes('urdu / poem')) {
      return code === 1 ? "Urdu" : "Poem";
    }
  } else {
    const gradeNum = parseInt(level);
    if (gradeNum >= 1 && gradeNum <= 5) {
      if (sub.includes('urdu / sans')) {
        return code === 1 ? "Urdu" : "Sanskrit";
      }
    } else if (gradeNum >= 6 && gradeNum <= 8) {
      if (sub.includes('urdu / sans')) {
        // Class 6-8: 1 or 2 is Urdu, 3 is Sanskrit based on existing logic in page.tsx
        return (code === 1 || code === 2) ? "Urdu" : "Sanskrit";
      }
      if (sub.includes('h.sci. / p. kala') || sub.includes('h.s.c. / p. kala')) {
        // Class 6-8: 1 or 3 is Pustak Kala, 2 is Home Science based on existing logic in page.tsx
        return (code === 1 || code === 3) ? "Pustak Kala" : "Home Science";
      }
    } else if (gradeNum >= 9) {
      if (sub.includes('math / h.s.c') || sub.includes('math/h.sci.')) {
        return "Math/H.Sci.";
      }
    }
  }

  return subjectName;
}

/**
 * Ensures the date is in Indian style (DD-MM-YYYY).
 * Handles formats like YYYY-MM-DD, MM/DD/YYYY, etc.
 */
export function formatDateToIndian(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") return "";
  
  // Try to parse the date
  let d = new Date(dateStr);
  
  // If parsing fails or is invalid, check if it's already in DD-MM-YYYY
  if (isNaN(d.getTime())) {
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      // If it looks like DD-MM-YYYY or DD/MM/YYYY
      if (parts[0].length <= 2 && parts[2].length === 4) {
        return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
      }
      // If it looks like YYYY-MM-DD
      if (parts[0].length === 4) {
        return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
      }
    }
    return dateStr; // Fallback to raw if unparseable
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`;
}

export const MOCK_STUDENTS: Student[] = [];

/**
 * Calculates student attendance automatically based on their academic performance.
 * @param percentage The overall percentage of marks (0-100).
 * @returns An object containing totalDays (fixed at 227) and presentDays (76% to 90% of total).
 */
export function calculateAttendance(percentage: number): { totalDays: number, presentDays: number } {
  const totalDays = 227;
  // Ensure percentage is between 0 and 100
  const safePerc = Math.max(0, Math.min(100, percentage));
  // Map 0-100 marks to 76-90 attendance percentage
  const attendanceRatio = (76 + (safePerc / 100 * 14)) / 100;
  const presentDays = Math.round(totalDays * attendanceRatio);
  
  return { totalDays, presentDays };
}
