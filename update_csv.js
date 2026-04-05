const fs = require('fs');
const path = require('path');

const folder = "c:\\Users\\Adnan\\Desktop\\REPORTCARD\\Student_Data_Internal\\Studnet data≡ƒöæ";

const subjectsMap = {
    "NUR": ["Hindi Oral", "Hindi Written", "English Oral", "English Written", "Math Oral", "Math Written", "Urdu / Poem", "Drawing"],
    "LKG": ["Hindi Oral", "Hindi Written", "English Oral", "English Written", "Math Oral", "Math Written", "Urdu / Poem", "Drawing"],
    "UKG": ["Hindi Oral", "Hindi Written", "English Oral", "English Written", "Math Oral", "Math Written", "Urdu / Poem", "Drawing"],
    "PRIMARY": ["Hindi", "English", "Mathematics", "EVS", "Computer", "G.K.", "Urdu / Sanskrit", "Craft", "Drawing"],
    "MIDDLE": ["Hindi", "English", "Mathematics", "Science", "Social Science", "Computer", "Urdu / Sanskrit", "H.Sci. / P. Kala", "Drawing"]
};

const filesToProcess = {
    "1.csv": "PRIMARY",
    "2.csv": "PRIMARY",
    "3.csv": "PRIMARY",
    "4.csv": "PRIMARY",
    "5.csv": "PRIMARY",
    "7.csv": "MIDDLE",
    "8.csv": "MIDDLE",
    "LKG.csv": "LKG",
    "Nur.csv": "NUR"
};

Object.entries(filesToProcess).forEach(([filename, gradeType]) => {
    const filePath = path.join(folder, filename);
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${filename}, not found.`);
        return;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    if (lines.length === 0) return;
    
    const headers = lines[0].split(',');
    const subjects = subjectsMap[gradeType];
    
    const updatedLines = lines.map((line, index) => {
        if (index === 0) return line; // Header
        if (line.trim() === '') return line;
        
        const cols = line.split(',');
        subjects.forEach((subName, i) => {
            const colName = `subject${i+1}_name`;
            const colIdx = headers.indexOf(colName);
            if (colIdx !== -1) {
                cols[colIdx] = `"${subName}"`;
            }
        });
        return cols.join(',');
    });
    
    fs.writeFileSync(filePath, updatedLines.join('\n'), 'utf-8');
    console.log(`Updated ${filename}`);
});
