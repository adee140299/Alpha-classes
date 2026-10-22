# 🎓 Alpha Classes — Coaching Website & Teacher Management Portal

A coaching institute website and classroom management portal for **Alpha Classes** (Morarji Nagar, Mumbai).

Empowering students from **Class 1 to 10** (English & Semi-English) and **11th & 12th Science Stream** (HSC Board) with quality education led by experienced faculties with 26+ years of proven teaching excellence.

---

## 🌟 Key Features

### 1. 🌐 Public Institute Website
- **Home:** Hero section, Why Choose Us, Student & Alumni milestones, founder cards, courses overview.
- **About:** Mission, vision, core values, and faculty details.
- **Courses:** Detailed subjects and curriculum for Primary, Secondary (SSC Board), and Higher Secondary (11th & 12th Science).
- **Trainers / Faculty:** Profile of instructors and retired BMC senior educator.
- **Pricing:** Clear fee structure by grade.
- **Contact:** Location map, phone, email, and admission inquiry form.

### 2. 👩‍🏫 Teacher & Classroom Management Portal (`portal.html`)
Accessible via the **"Teacher Portal"** button in the navigation bar:

- **📊 Executive Dashboard:**
  - Active enrolled students counter.
  - Today's live attendance rate (%) & present/absent summary.
  - Monthly fees collected vs pending dues.
  - Quick list of Today's Absentees with 1-click WhatsApp parent notifications.
  - Quick list of Fee Defaulters with 1-click WhatsApp payment reminders.

- **📝 Daily Attendance Tracker:**
  - Select date and filter by Class / Grade or Batch timing (Morning, Afternoon, Evening).
  - Single-click status toggles: **Present (P)**, **Absent (A)**, **Late (L)**, **Excused (E)**.
  - Fast **"Mark All Present"** & **"Mark All Absent"** bulk actions.
  - Instant WhatsApp alert to parents: `"Dear Parent, your child [Name] was marked [Status] on [Date] at Alpha Classes."`
  - Print daily attendance sheet button.

- **📋 Monthly Attendance Register:**
  - Full matrix grid view displaying all days of any selected month (1 to 31).
  - Computes total Present days, Absent days, and attendance percentage per child.
  - Formatted for printing / exporting records.

- **💳 Fee Management & Receipt Generator:**
  - Monthly fee ledger with Paid, Partial, and Pending status pills.
  - Record payment modal (Cash, UPI / GPay / PhonePe, Bank Transfer, Cheque).
  - **Official Printable Fee Receipts** with institute letterhead, student info, receipt number, balance due, and signature line.
  - 1-click WhatsApp fee reminder with pre-filled message.

- **👨‍🎓 Student Directory:**
  - Add new student with roll number, grade, batch, parent contact, and monthly fee.
  - Edit or delete student profiles.
  - Search by name, roll number, or phone.

- **💾 Zero Data Loss & Portability:**
  - All data is saved automatically in `localStorage`.
  - Built-in **Export Backup** & **Restore Backup** (JSON) so teachers can back up or move data across laptops and mobile devices.

---

## 🚀 How to Run Locally

Double-click `index.html` or `portal.html` in your browser, or run a lightweight local server:
```bash
python3 -m http.server 8080
# then open http://localhost:8080 in your browser
```

---

## 🐙 Live GitHub Pages Hosting

To host this website live on GitHub Pages:
1. Go to your repository on GitHub: `https://github.com/adee140299/Alpha-classes`
2. Open **Settings** > **Pages**.
3. Under **Branch**, select `main` and root `/`, then click **Save**.
4. Your website will be live at:
   `https://adee140299.github.io/Alpha-classes/`
