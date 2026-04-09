import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { 
  getSubjectsByGrade, 
  resolveSubjectName, 
  formatDateToIndian,
  getMaxTheoryMarks,
  getMaxPracticalMarks,
  getMaxMarksPerTerm,
  calculateAttendance
} from '@/lib/types';
import { Student, Grade } from '@/lib/types';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'src', 'New folder');
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json({ error: 'Data directory not found' }, { status: 404 });
    }

    const files = fs.readdirSync(dataDir).filter(f => f.toLowerCase().endsWith('.csv'));
    let allStudents: Student[] = [];

    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const csvContent = fs.readFileSync(filePath, 'utf-8');

      const results = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => {
          return h.trim().toLowerCase()
            .replace(/[\s_]+/g, '')
            .replace(/[^a-z0-9]/g, '');
        }
      });

      const parsedStudents: Student[] = results.data.map((row: any, index: number) => {
        const grades: Grade[] = [];
        const gradeLevel = (row.gradelevel || row.gradeLevel || row.class || "1").toUpperCase();
        const defaultSubjects = getSubjectsByGrade(gradeLevel);
        const dobVal = formatDateToIndian(row.dob || row.date_of_birth || row.dateofbirth);
        
        for (let i = 1; i <= 20; i++) {
          const subNameKey = `subject${i}name`;
          let subjectNameVal = row[subNameKey];

          const tKeys = [1, 2, 3, 4].map(t => `subject${i}t${t}theory`);
          const pKeys = [1, 2, 3, 4].map(t => `subject${i}t${t}practical`);
          const hasAnyMarks = [...tKeys, ...pKeys].some(k => row[k] !== undefined && row[k] !== "");

          const optionalCode = parseInt(row.optionalcode || row.optional_code) || 1;
          
          const isValidName = (name: any) => {
            if (!name) return false;
            const str = String(name).trim();
            if (!str) return false;
            // If the name is basically just a number, it's probably malformed data (marks in name slot)
            if (!isNaN(Number(str))) return false;
            return true;
          };

          if (isValidName(subjectNameVal)) {
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

            [1, 2, 3, 4].forEach(t => {
              const theoryKey = `subject${i}t${t}theory`;
              const practicalKey = `subject${i}t${t}practical`;
              const theory = parseInt(row[theoryKey]) || 0;
              const practical = parseInt(row[practicalKey]) || 0;
              
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
          id: `${file}_${index}`,
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
          attendance: { totalDays: 0, presentDays: 0 }, // Placeholder
          coScholastic: {
            discipline: row.csdiscipline || row.cs_discipline || "A",
            pt: row.cspt || row.cs_pt || "A",
            music: row.csmusic || row.cs_music || "A",
            art: row.csart || row.cs_art || "A",
            yoga: row.csyoga || row.cs_yoga || "A"
          },
          optionalSubjectCode: parseInt(row.optionalcode || row.optional_code) || 1,
          grades: grades
        } as Student;
      });

      // Update attendance logic
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

      allStudents = [...allStudents, ...studentsWithAttendance];
    }

    return NextResponse.json(allStudents);
  } catch (error) {
    console.error('Error in students API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
