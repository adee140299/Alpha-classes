/**
 * Alpha Classes — Authentication & Multi-User Access Management
 * Handles Teacher/Staff accounts, Student Portal login, and session persistence.
 */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'alpha_classes_data_v1';
  const AUTH_TEACHER_KEY = 'alpha_current_teacher_session';
  const AUTH_STUDENT_KEY = 'alpha_current_student_session';

  const DEFAULT_STUDENTS = [
    { id: '101', roll: 'AC-101', name: 'Aryan Sharma', grade: 'Class 10 (SSC Board)', batch: 'Evening', parentName: 'Rajesh Sharma', phone: '9821016457', monthlyFee: 2500, joinDate: '2026-06-15', active: true },
    { id: '102', roll: 'AC-102', name: 'Sneha Patil', grade: 'Class 10 (SSC Board)', batch: 'Evening', parentName: 'Sunil Patil', phone: '9821016457', monthlyFee: 2500, joinDate: '2026-06-16', active: true },
    { id: '103', roll: 'AC-103', name: 'Rohan Gupta', grade: '11th Science', batch: 'Morning', parentName: 'Manoj Gupta', phone: '9821016457', monthlyFee: 3500, joinDate: '2026-07-01', active: true },
    { id: '104', roll: 'AC-104', name: 'Pooja Verma', grade: '12th Science (HSC Board)', batch: 'Morning', parentName: 'Anil Verma', phone: '9821016457', monthlyFee: 4000, joinDate: '2026-05-10', active: true },
    { id: '105', roll: 'AC-105', name: 'Aditya Deshmukh', grade: 'Class 9', batch: 'Evening', parentName: 'Ganesh Deshmukh', phone: '9821016457', monthlyFee: 2200, joinDate: '2026-06-20', active: true },
    { id: '106', roll: 'AC-106', name: 'Neha Khan', grade: 'Class 9', batch: 'Evening', parentName: 'Imran Khan', phone: '9821016457', monthlyFee: 2200, joinDate: '2026-06-21', active: true },
    { id: '107', roll: 'AC-107', name: 'Tanmay Joshi', grade: 'Class 8', batch: 'Afternoon', parentName: 'Sanjay Joshi', phone: '9821016457', monthlyFee: 1800, joinDate: '2026-07-10', active: true },
    { id: '108', roll: 'AC-108', name: 'Ananya Yadav', grade: '12th Science (HSC Board)', batch: 'Morning', parentName: 'Dharmendra Yadav', phone: '9821016457', monthlyFee: 4000, joinDate: '2026-05-15', active: true }
  ];

  // Default Master Admin & Teachers
  const DEFAULT_TEACHERS = [
    {
      id: 'teacher-admin',
      name: 'Pradeep Yadav',
      username: 'admin',
      password: 'admin123',
      role: 'Admin', // 'Admin' | 'Teacher'
      phone: '9821016457',
      subject: 'Director & Mathematics'
    },
    {
      id: 'teacher-faculty-1',
      name: 'Senior Science Faculty',
      username: 'teacher1',
      password: 'teacher123',
      role: 'Teacher',
      phone: '9821016457',
      subject: 'Physics & Chemistry'
    }
  ];

  const DEFAULT_ANNOUNCEMENTS = [
    {
      id: 'ann-1',
      title: 'Monthly Test Series Announced',
      date: '2026-10-25',
      content: 'Class 10 SSC and 12th Science monthly revision test will be held on upcoming Sunday at 9:00 AM.',
      author: 'Pradeep Sir'
    },
    {
      id: 'ann-2',
      title: 'Diwali Break Schedule',
      date: '2026-10-28',
      content: 'Classes will remain closed from 30th Oct to 3rd Nov for Diwali holidays. Special revision notes are uploaded.',
      author: 'Admin Office'
    }
  ];

  function getStorageData() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read storage', e);
    }
    return {};
  }

  function saveStorageData(fullData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fullData));
    } catch (e) {
      console.error('Failed to write storage', e);
    }
    // Also push updates to Google Cloud if available
    if (typeof window.AlphaFirebase !== 'undefined' && window.AlphaFirebase.isCloudReady()) {
      window.AlphaFirebase.saveToCloud(fullData, 'AuthManager');
    }
  }

  // Ensure default teachers, students, and announcements exist in storage
  function initAuthData() {
    const data = getStorageData();
    let updated = false;

    if (!data.teachers || data.teachers.length === 0) {
      data.teachers = DEFAULT_TEACHERS;
      updated = true;
    }
    if (!data.announcements || data.announcements.length === 0) {
      data.announcements = DEFAULT_ANNOUNCEMENTS;
      updated = true;
    }
    if (!data.students || data.students.length === 0) {
      data.students = DEFAULT_STUDENTS;
      updated = true;
    }
    if (updated) {
      saveStorageData(data);
    }
  }

  initAuthData();

  // Listen for real-time cloud updates
  if (typeof window !== 'undefined') {
    window.addEventListener('alpha-cloud-data', function (e) {
      if (e.detail) {
        initAuthData();
      }
    });
  }

  // Authentication API
  const AlphaAuth = {
    // --- Teacher & Staff Methods ---
    getTeachers() {
      const data = getStorageData();
      return data.teachers || DEFAULT_TEACHERS;
    },

    addTeacher(name, username, password, role = 'Teacher', subject = 'General') {
      const data = getStorageData();
      if (!data.teachers) data.teachers = DEFAULT_TEACHERS;

      // Support either separate params or an options object
      if (typeof name === 'object' && name !== null) {
        username = name.username;
        password = name.password;
        role = name.role || 'Teacher';
        subject = name.subject || 'General';
        name = name.name;
      }

      if (!username || !password || !name) {
        return { success: false, message: 'Name, username, and password are required.' };
      }

      // Check username duplicate
      const cleanU = String(username).toLowerCase().trim();
      const exists = data.teachers.some(t => (t.username || '').toLowerCase().trim() === cleanU);
      if (exists) {
        return { success: false, message: 'Username already taken by another teacher.' };
      }

      const newTeacher = {
        id: 'teacher-' + Date.now(),
        name: String(name).trim(),
        username: cleanU,
        password: String(password).trim(),
        role: role,
        subject: String(subject).trim()
      };

      data.teachers.push(newTeacher);
      saveStorageData(data);
      return { success: true, teacher: newTeacher };
    },

    deleteTeacher(teacherId) {
      const data = getStorageData();
      if (!data.teachers) return false;

      // Prevent deleting the main admin
      const target = data.teachers.find(t => t.id === teacherId);
      if (target && target.username === 'admin') {
        return { success: false, message: 'Primary Admin account cannot be deleted.' };
      }

      data.teachers = data.teachers.filter(t => t.id !== teacherId);
      saveStorageData(data);
      return { success: true };
    },

    updateTeacherPassword(username, newPassword) {
      const data = getStorageData();
      if (!data.teachers) return { success: false, message: 'No teachers found' };
      const teacher = data.teachers.find(t => t.username.toLowerCase() === username.toLowerCase().trim());
      if (!teacher) return { success: false, message: 'Teacher account not found' };
      teacher.password = newPassword.trim();
      saveStorageData(data);
      return { success: true };
    },

    loginTeacher(username, password) {
      initAuthData();
      const teachers = this.getTeachers();
      const user = teachers.find(
        t => t.username.toLowerCase() === username.toLowerCase().trim() && t.password === password.trim()
      );

      if (user) {
        const sessionUser = {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          subject: user.subject,
          loginTime: new Date().toISOString()
        };
        sessionStorage.setItem(AUTH_TEACHER_KEY, JSON.stringify(sessionUser));
        localStorage.setItem(AUTH_TEACHER_KEY, JSON.stringify(sessionUser));
        return { success: true, user: sessionUser };
      }
      return { success: false, message: 'Invalid Teacher Username or Password.' };
    },

    getCurrentTeacher() {
      try {
        const s = sessionStorage.getItem(AUTH_TEACHER_KEY) || localStorage.getItem(AUTH_TEACHER_KEY);
        if (s) return JSON.parse(s);
      } catch (e) {}
      return null;
    },

    logoutTeacher() {
      sessionStorage.removeItem(AUTH_TEACHER_KEY);
      localStorage.removeItem(AUTH_TEACHER_KEY);
    },

    // --- Student Portal Methods ---
    loginStudent(rollNo, phoneOrPassword) {
      const data = getStorageData();
      const students = data.students || [];

      const cleanRoll = rollNo.toUpperCase().trim();
      const cleanPhone = phoneOrPassword.trim().replace(/\D/g, '');

      // Student logs in with Roll No + matching phone number (or password)
      const student = students.find(s => {
        const rollMatch = s.roll && s.roll.toUpperCase().trim() === cleanRoll;
        const phoneMatch = s.phone && s.phone.replace(/\D/g, '').includes(cleanPhone);
        return rollMatch && (phoneMatch || s.password === phoneOrPassword.trim());
      });

      if (student) {
        const sessionStudent = {
          id: student.id,
          roll: student.roll,
          name: student.name,
          grade: student.grade,
          batch: student.batch,
          phone: student.phone,
          parentName: student.parentName,
          monthlyFee: student.monthlyFee,
          joinDate: student.joinDate,
          loginTime: new Date().toISOString()
        };
        sessionStorage.setItem(AUTH_STUDENT_KEY, JSON.stringify(sessionStudent));
        localStorage.setItem(AUTH_STUDENT_KEY, JSON.stringify(sessionStudent));
        return { success: true, student: sessionStudent };
      }

      return { success: false, message: 'No student found matching Roll Number and Phone Number.' };
    },

    getCurrentStudent() {
      try {
        const s = sessionStorage.getItem(AUTH_STUDENT_KEY) || localStorage.getItem(AUTH_STUDENT_KEY);
        if (s) return JSON.parse(s);
      } catch (e) {}
      return null;
    },

    logoutStudent() {
      sessionStorage.removeItem(AUTH_STUDENT_KEY);
      localStorage.removeItem(AUTH_STUDENT_KEY);
    },

    // Announcements API
    getAnnouncements() {
      const data = getStorageData();
      return data.announcements || DEFAULT_ANNOUNCEMENTS;
    },

    addAnnouncement(title, content, author = 'Pradeep Sir') {
      const data = getStorageData();
      if (!data.announcements) data.announcements = DEFAULT_ANNOUNCEMENTS;

      if (typeof title === 'object' && title !== null) {
        content = title.content;
        author = title.author || 'Pradeep Sir';
        title = title.title;
      }

      const newAnn = {
        id: 'ann-' + Date.now(),
        title: String(title || '').trim(),
        content: String(content || '').trim(),
        date: new Date().toISOString().split('T')[0],
        author: author
      };
      data.announcements.unshift(newAnn);
      saveStorageData(data);
      return { success: true, announcement: newAnn };
    },

    deleteAnnouncement(id) {
      const data = getStorageData();
      if (!data.announcements) return;
      data.announcements = data.announcements.filter(a => a.id !== id);
      saveStorageData(data);
    }
  };

  window.AlphaAuth = AlphaAuth;

})(window);
