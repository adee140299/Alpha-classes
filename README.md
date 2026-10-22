# 🎓 Alpha Classes — Coaching Website, Teacher Management & Student Portal

A modern, comprehensive coaching institute website, teacher management portal, and student/parent dashboard for **Alpha Classes** (Morarji Nagar, Mumbai).

Empowering students from **Class 1 to 10** (English, Hindi & Semi-English Mediums) and **11th & 12th Science Stream** (HSC Board) with quality education led by veteran educators with 26+ years of proven teaching excellence.

---

## 🌟 Architecture & Key Features

### 1. 🌐 Public Institute Website (`index.html`, `About.html`, `Courses.html`, etc.)
- **Modern Design & Typography:** Google Fonts (*Plus Jakarta Sans* & *Outfit*), dynamic badges, smooth animations, and glassmorphism navbar.
- **Comprehensive Pages:** Home, About, Courses, Faculty / Mentors, Transparent Fee Structure, and Location Contact with Google Maps.
- **Direct Portal Shortcuts:** Direct buttons for both `[🎓 Student Portal]` and `[👨‍🏫 Teacher Login]`.

---

### 2. 🔐 Dual-Access Login System (`login.html`)
Secure, role-based authentication powered by `auth.js`:
- **👨‍🏫 Teacher & Staff Access:**
  - Protected entry ensuring unauthorized users cannot access the classroom management system.
  - Multi-user support with custom permissions: Master Admin & Staff Teachers.
  - **Demo Teacher Login:** Username: `admin` | Password: `admin123` (1-click autofill provided).
  - **Faculty Login:** Username: `teacher1` | Password: `teacher123`.

- **🎓 Student & Parent Portal Access:**
  - Secure login using Roll Number + Registered Phone Number.
  - **Demo Student Login:** Roll Number: `AC-101` | Phone: `9821016457` (1-click autofill provided).

---

### 3. 🎓 Student & Parent Portal (`student-portal.html`)
Personalized student dashboard providing transparency for students and parents:
- **📊 Real-Time Attendance Statistics:** Circular percentage gauge (`%`), status appraisal (Excellent / Regular / Needs Attention), and total Present / Absent / Late class count.
- **📅 Recent Attendance Log:** Live timeline of recent attendance entries.
- **💳 Live Fee Tracking & Verified Receipts:**
  - Current billing month status (Paid / Pending) and monthly fee amount.
  - **Printable Fee Receipt Modal:** Students can view and print official institute fee receipts with verified receipt numbers.
- **⏰ Class Timetable & Routine:** Weekly schedule breakdown for morning and evening batches.
- **📢 Notice Board:** Official announcements and exam notices posted by teachers.
- **💬 Direct WhatsApp Contact:** Instant 1-click WhatsApp messaging to Sir/Director.

---

### 4. 👩‍🏫 Teacher & Classroom Management Portal (`portal.html`)
Enterprise-grade management portal for teachers and administrators:
- **📊 Executive Dashboard:** Active student counters, today's attendance rate, monthly revenue collected vs pending dues, and quick-action absentee alerts.
- **📝 Daily Attendance Tracker:** 1-tap toggles (Present, Absent, Late, Excused), bulk marking, and instant WhatsApp parent notifications.
- **📋 Monthly Attendance Matrix:** Full 31-day attendance register grid with auto-computed percentages, printable format.
- **💳 Fee Management & Receipt Generator:** Ledger with payment tracking (Cash, UPI, GPay, Bank, Cheque) and official printable fee receipts.
- **👨‍🎓 Student Directory:** Add, edit, and filter students across grades and batches.
- **👥 Staff & Teacher Management:** Admin can add new teacher logins, assign subjects/roles, and revoke access.
- **📢 Notice Board Publisher:** Post notices and exam updates directly visible inside the Student Portal.
- **💾 Backup & Portability:** One-click JSON backup export and restore ensuring 100% data safety.

---

## 🔑 Demo Credentials

| Portal | Username / Roll No. | Password / Phone | Role |
| :--- | :--- | :--- | :--- |
| **Teacher Admin** | `admin` | `admin123` | Master Admin (Pradeep Yadav) |
| **Faculty Staff** | `teacher1` | `teacher123` | Science Teacher |
| **Student / Parent** | `AC-101` | `9821016457` | Class 10 (Aryan Sharma) |
| **Student / Parent** | `AC-102` | `9821016457` | Class 10 (Sneha Patil) |
| **Student / Parent** | `AC-103` | `9821016457` | 11th Science (Rohan Gupta) |

*(Note: In `login.html`, click "Demo Admin" or "Demo Student" to automatically populate credentials in one click).*

---

## 🚀 How to Run Locally

Double-click `index.html` in any web browser, or launch a local server:
```bash
cd Alpha-classes
python3 -m http.server 8080
# Open http://localhost:8080 in your browser
```

---

## 🐙 Live Deployment (GitHub Pages)

To host this website live on GitHub Pages:
1. Go to your repository on GitHub: `https://github.com/adee140299/Alpha-classes`
2. Navigate to **Settings** > **Pages**.
3. Under **Build and deployment** > **Branch**, select `main` and root `/`, then click **Save**.
4. The live website will be available at:
   `https://adee140299.github.io/Alpha-classes/`
