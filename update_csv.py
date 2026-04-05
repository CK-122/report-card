import csv
import os

folder = r"c:\Users\Adnan\Desktop\REPORTCARD\Student_Data_Internal\Studnet data≡ƒöæ"

subjects_map = {
    "NUR": ["Hindi Oral", "Hindi Written", "English Oral", "English Written", "Math Oral", "Math Written", "Urdu / Poem", "Drawing"],
    "LKG": ["Hindi Oral", "Hindi Written", "English Oral", "English Written", "Math Oral", "Math Written", "Urdu / Poem", "Drawing"],
    "UKG": ["Hindi Oral", "Hindi Written", "English Oral", "English Written", "Math Oral", "Math Written", "Urdu / Poem", "Drawing"],
    "PRIMARY": ["Hindi", "English", "Mathematics", "EVS", "Computer", "G.K.", "Urdu / Sanskrit", "Craft", "Drawing"],
    "MIDDLE": ["Hindi", "English", "Mathematics", "Science", "Social Science", "Computer", "Urdu / Sanskrit", "H.Sci. / P. Kala", "Drawing"]
}

files_to_process = {
    "1.csv": "PRIMARY",
    "2.csv": "PRIMARY",
    "3.csv": "PRIMARY",
    "4.csv": "PRIMARY",
    "5.csv": "PRIMARY",
    "7.csv": "MIDDLE",
    "8.csv": "MIDDLE",
    "LKG.csv": "LKG",
    "Nur.csv": "NUR"
}

for filename, grade_type in files_to_process.items():
    filepath = os.path.join(folder, filename)
    if not os.path.exists(filepath):
        print(f"Skipping {filename}, not found.")
        continue
    
    with open(filepath, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        rows = list(reader)
    
    subjects = subjects_map[grade_type]
    for row in rows:
        for i, sub_name in enumerate(subjects):
            col_name = f"subject{i+1}_name"
            if col_name in headers:
                row[col_name] = sub_name
    
    with open(filepath, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Updated {filename}")
