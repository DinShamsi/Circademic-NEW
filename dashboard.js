import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc,
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    query,
    where
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let userData = null;
let courses = [];
let editingCourseId = null; // משתנה למעקב אחר עריכה

// Make Chart available globally
window.Chart = window.Chart || {};

// Check authentication
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
        await loadCourses();
        updateDashboard();
    } else {
        window.location.href = 'login.html';
    }
});

// Load user data
async function loadUserData() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            document.getElementById('userName').textContent = userData.name;
            document.getElementById('welcomeName').textContent = userData.name;
            
            // Set user avatar
            const initials = userData.name.split(' ').map(n => n[0]).join('').toUpperCase();
            document.getElementById('userAvatar').textContent = initials;
            
            // Populate category dropdown
            const categorySelect = document.getElementById('courseCategory');
            if (categorySelect) {
                categorySelect.innerHTML = '';
                (userData.categories || ['חובה', 'בחירה', 'כללי', 'ספורט']).forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat;
                    categorySelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load courses
async function loadCourses() {
    try {
        const coursesRef = collection(db, 'users', currentUser.uid, 'courses');
        const snapshot = await getDocs(coursesRef);
        courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

// Update dashboard
function updateDashboard() {
    updateStatistics();
    updateProgressBar();
    updateCharts();
    updateCategoryStats();
    populateFilters();
    window.filterCourses(); // קריאה לסינון כדי למלא את הטבלה
}

// Calculate statistics
function updateStatistics() {
    // Filter numeric courses only
    const numericCourses = courses.filter(c => c.gradeType === 'רגיל' && c.grade > 0);
    
    // Calculate weighted average
    let totalPoints = 0;
    let totalCredits = 0;
    
    numericCourses.forEach(course => {
        totalPoints += course.grade * course.credits;
        totalCredits += course.credits;
    });
    
    const weightedAverage = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
    document.getElementById('overallAverage').textContent = weightedAverage;
    
    // Total credits (including binary courses that passed)
    // הערה: כאן אנו מניחים שציון 0 בקורס בינארי אומר "לא עבר" או שאין ציון
    const allCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    document.getElementById('totalCredits').textContent = allCredits.toFixed(1);
    
    // Degree progress
    const requiredCredits = userData?.totalCreditsRequired || 120;
    const progress = Math.min(100, (allCredits / requiredCredits * 100)).toFixed(1);
    document.getElementById('degreeProgress').textContent = progress + '%';
    
    // Highest grade
    const highestGrade = numericCourses.length > 0 
        ? Math.max(...numericCourses.map(c => c.grade)) 
        : 0;
    document.getElementById('highestGrade').textContent = highestGrade;
}

// Update progress bar
function updateProgressBar() {
    const allCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    const requiredCredits = userData?.totalCreditsRequired || 120;
    const progress = Math.min(100, (allCredits / requiredCredits * 100));
    
    document.getElementById('creditsEarned').textContent = allCredits.toFixed(1);
    document.getElementById('creditsRequired').textContent = requiredCredits;
    document.getElementById('progressFill').style.width = progress + '%';
    
    // Calculate current semester and year - תוקן הבאג של +1
    const maxSemester = courses.length > 0 
        ? Math.max(...courses.map(c => c.semester)) 
        : 1; // אם אין קורסים, אנחנו בסמסטר 1
        
    const currentSemester = maxSemester;
    const currentYear = Math.ceil(currentSemester / 2);
    
    const yearNames = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\''];
    document.getElementById('currentSemester').textContent = currentSemester;
    document.getElementById('currentYear').textContent = yearNames[currentYear - 1] || currentYear;
}

// Update charts
function updateCharts() {
    updateSemesterChart();
    updateExamTypeChart();
}

// Semester trend chart
function updateSemesterChart() {
    const ctx = document.getElementById('semesterChart');
    if (!ctx) return;
    
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded yet');
        return;
    }
    
    // Group by semester
    const semesterData = {};
    courses.forEach(course => {
        if (course.gradeType === 'רגיל' && course.grade > 0) {
            if (!semesterData[course.semester]) {
                semesterData[course.semester] = { points: 0, credits: 0 };
            }
            semesterData[course.semester].points += course.grade * course.credits;
            semesterData[course.semester].credits += course.credits;
        }
    });
    
    const semesters = Object.keys(semesterData).sort((a, b) => a - b);
    const averages = semesters.map(s => 
        (semesterData[s].points / semesterData[s].credits).toFixed(2)
    );
    
    if (window.semesterChart) window.semesterChart.destroy();
    
    window.semesterChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: semesters.map(s => `סמסטר ${s}`),
            datasets: [{
                label: 'ממוצע',
                data: averages,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 50, // שינוי קטן כדי לראות גרף יפה יותר
                    max: 100
                }
            }
        }
    });
}

// Exam type distribution chart
function updateExamTypeChart() {
    const ctx = document.getElementById('examTypeChart');
    if (!ctx) return;
    
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded yet');
        return;
    }
    
    const examTypes = {};
    courses.forEach(course => {
        examTypes[course.examType] = (examTypes[course.examType] || 0) + 1;
    });
    
    if (window.examTypeChart) window.examTypeChart.destroy();
    
    window.examTypeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(examTypes),
            datasets: [{
                label: 'מספר קורסים',
                data: Object.values(examTypes),
                backgroundColor: ['#6366f1', '#8b5cf6']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Update category statistics
function updateCategoryStats() {
    const categoryGrid = document.getElementById('categoryGrid');
    if (!categoryGrid) return;
    
    const categories = {};
    courses.forEach(course => {
        if (course.gradeType === 'רגיל' && course.grade > 0) {
            if (!categories[course.category]) {
                categories[course.category] = { points: 0, credits: 0, count: 0 };
            }
            categories[course.category].points += course.grade * course.credits;
            categories[course.category].credits += course.credits;
            categories[course.category].count += 1;
        }
    });
    
    categoryGrid.innerHTML = '';
    Object.entries(categories).forEach(([cat, data]) => {
        const average = (data.points / data.credits).toFixed(2);
        const div = document.createElement('div');
        div.className = 'category-item';
        div.innerHTML = `
            <h4>${cat}</h4>
            <div class="category-average">${average}</div>
            <div class="category-details">
                ${data.count} קורסים | ${data.credits.toFixed(1)} נ"ז
            </div>
        `;
        categoryGrid.appendChild(div);
    });
}

// Populate courses table - תוקן לקבלת נתונים מסוננים
function populateCoursesTable(coursesData = courses) {
    const tbody = document.getElementById('coursesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    coursesData.forEach(course => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${course.name}</td>
            <td>${course.credits}</td>
            <td>${course.gradeType === 'בינארי' ? 'עבר' : course.grade}</td>
            <td>${course.semester}</td>
            <td>${course.category}</td>
            <td>${course.examType}</td>
            <td>
                <button onclick="editCourse('${course.id}')" class="btn-sm btn-secondary">ערוך</button>
                <button onclick="deleteCourse('${course.id}')" class="btn-sm" style="background: #ef4444; color: white;">מחק</button>
            </td>
        `;
    });
}

// Populate filters
function populateFilters() {
    const semesterFilter = document.getElementById('filterSemester');
    const categoryFilter = document.getElementById('filterCategory');
    
    if (semesterFilter) {
        // שמירת הבחירה הנוכחית
        const currentVal = semesterFilter.value;
        const semesters = [...new Set(courses.map(c => c.semester))].sort((a, b) => a - b);
        semesterFilter.innerHTML = '<option value="">כל הסמסטרים</option>';
        semesters.forEach(s => {
            const option = document.createElement('option');
            option.value = s;
            option.textContent = `סמסטר ${s}`;
            semesterFilter.appendChild(option);
        });
        semesterFilter.value = currentVal; // שחזור בחירה
    }
    
    if (categoryFilter) {
        const currentVal = categoryFilter.value;
        const categories = [...new Set(courses.map(c => c.category))];
        categoryFilter.innerHTML = '<option value="">כל הקטגוריות</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryFilter.appendChild(option);
        });
        categoryFilter.value = currentVal;
    }
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.getAttribute('href');
        if (target.startsWith('#')) {
            document.querySelectorAll('.dashboard-section').forEach(s => s.style.display = 'none');
            document.querySelector(target)?.style.display = 'block';
            
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        }
    });
});

// Theme toggle
window.toggleTheme = () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const icon = document.querySelector('.theme-icon');
    icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
};

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
const icon = document.querySelector('.theme-icon');
if (icon) icon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

// User menu toggle
window.toggleUserMenu = () => {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('active');
};

// Logout
window.logout = async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error logging out:', error);
    }
};

// Add course modal
window.showAddCourse = () => {
    const modal = document.getElementById('addCourseModal');
    modal.classList.add('active');
};

window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        
        // איפוס אם זה מודאל הוספת קורס
        if (modalId === 'addCourseModal') {
            document.getElementById('addCourseForm').reset();
            editingCourseId = null;
            document.querySelector('#addCourseModal h2').textContent = 'הוסף קורס חדש';
            document.querySelector('#addCourseForm button[type="submit"]').textContent = 'שמור קורס';
        }
    }
};

// Add/Edit course form handler - תוקן לתמוך בעריכה
const addCourseForm = document.getElementById('addCourseForm');
if (addCourseForm) {
    addCourseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const courseData = {
            name: document.getElementById('courseName').value,
            credits: parseFloat(document.getElementById('courseCredits').value),
            grade: parseFloat(document.getElementById('courseGrade').value),
            semester: parseInt(document.getElementById('courseSemester').value),
            category: document.getElementById('courseCategory').value,
            examType: document.getElementById('courseExamType').value,
            gradeType: document.getElementById('courseGradeType').value
        };
        
        try {
            if (editingCourseId) {
                // מצב עריכה
                await updateDoc(doc(db, 'users', currentUser.uid, 'courses', editingCourseId), courseData);
                showMessage('הקורס עודכן בהצלחה!', 'success');
            } else {
                // מצב הוספה
                await addDoc(collection(db, 'users', currentUser.uid, 'courses'), courseData);
                showMessage('הקורס נוסף בהצלחה!', 'success');
            }
            
            await loadCourses();
            updateDashboard();
            closeModal('addCourseModal');
            // Form is reset in closeModal
        } catch (error) {
            console.error('Error saving course:', error);
            showMessage('שגיאה בשמירת הקורס', 'error');
        }
    });
}

// Export CSV
window.exportCSV = () => {
    if (courses.length === 0) {
        showMessage('אין קורסים לייצא', 'error');
        return;
    }
    
    const headers = ['שם הקורס', 'נ"ז', 'ציון', 'סמסטר', 'קטגוריה', 'מועד', 'סוג ציון'];
    const rows = courses.map(c => [
        c.name,
        c.credits,
        c.grade,
        c.semester,
        c.category,
        c.examType,
        c.gradeType
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.join(',') + '\n';
    });
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'courses.csv';
    link.click();
    showMessage('הקובץ יוצא בהצלחה!', 'success');
};

// Shield calculator
window.calculateShield = () => {
    const shieldGrade = parseFloat(document.getElementById('shieldGrade')?.value);
    const shieldPercent = parseFloat(document.getElementById('shieldPercent')?.value);
    const examGrade = document.getElementById('examGrade')?.value;
    
    const result = document.getElementById('shieldResult');
    if (!result) return;
    
    if (!shieldGrade || !shieldPercent) {
        result.textContent = 'אנא מלא את כל השדות';
        result.classList.add('active');
        return;
    }
    
    if (examGrade) {
        const examPercent = 100 - shieldPercent;
        const finalGrade = (shieldGrade * shieldPercent / 100) + (parseFloat(examGrade) * examPercent / 100);
        result.innerHTML = `<h4>הציון הסופי שלך: ${finalGrade.toFixed(2)}</h4>`;
    } else {
        const examPercent = 100 - shieldPercent;
        const requiredGrade = ((55 - (shieldGrade * shieldPercent / 100)) * 100) / examPercent;
        result.innerHTML = `<h4>כדי לקבל ציון עובר (55), עליך לקבל ${requiredGrade.toFixed(2)} בבחינה</h4>`;
    }
    
    result.classList.add('active');
};

// Edit Course Function - פונקציה חדשה
window.editCourse = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    // 1. Fill form
    document.getElementById('courseName').value = course.name;
    document.getElementById('courseCredits').value = course.credits;
    document.getElementById('courseGrade').value = course.grade;
    document.getElementById('courseSemester').value = course.semester;
    document.getElementById('courseCategory').value = course.category;
    document.getElementById('courseExamType').value = course.examType;
    document.getElementById('courseGradeType').value = course.gradeType;

    // 2. Change UI to Edit Mode
    const modalTitle = document.querySelector('#addCourseModal h2');
    const submitBtn = document.querySelector('#addCourseForm button[type="submit"]');
    
    if(modalTitle) modalTitle.textContent = 'ערוך קורס';
    if(submitBtn) submitBtn.textContent = 'עדכן קורס';

    // 3. Set state
    editingCourseId = courseId;
    window.showAddCourse();
};

window.deleteCourse = async (courseId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק קורס זה?')) return;
    
    try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'courses', courseId));
        showMessage('הקורס נמחק בהצלחה!', 'success');
        await loadCourses();
        updateDashboard();
    } catch (error) {
        console.error('Error deleting course:', error);
        showMessage('שגיאה במחיקת הקורס', 'error');
    }
};

// Filter & Sort Functions - מומשו מחדש
window.filterCourses = () => {
    const searchTerm = document.getElementById('searchCourses')?.value.toLowerCase() || '';
    const semesterFilter = document.getElementById('filterSemester')?.value || '';
    const categoryFilter = document.getElementById('filterCategory')?.value || '';
    const sortBy = document.getElementById('sortBy')?.value || 'name';

    // 1. Filter
    let filtered = courses.filter(course => {
        const matchesSearch = course.name.toLowerCase().includes(searchTerm);
        const matchesSemester = semesterFilter === '' || course.semester.toString() === semesterFilter;
        const matchesCategory = categoryFilter === '' || course.category === categoryFilter;
        return matchesSearch && matchesSemester && matchesCategory;
    });

    // 2. Sort
    filtered.sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'grade') return b.grade - a.grade;
        if (sortBy === 'credits') return b.credits - a.credits;
        if (sortBy === 'semester') return a.semester - b.semester;
        return 0;
    });

    // 3. Populate
    populateCoursesTable(filtered);
};

window.sortCourses = () => {
    window.filterCourses();
};

// Placeholders for unfinished features
window.calculateWhatIf = () => {
    alert('מחשבון "מה אם" בפיתוח');
};

window.addFutureCourse = () => {
    alert('הוספת קורס עתידי בפיתוח');
};

window.generatePDF = () => {
    alert('יצירת PDF בפיתוח');
};

window.showSummary = () => {
    alert('סיכום אקדמי בפיתוח');
};

// Show message
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        padding: 1rem 2rem;
        border-radius: 10px;
        font-weight: 600;
        z-index: 10001; /* Z-Index גבוה */
        ${type === 'success' ? 'background: #10b981; color: white;' : 'background: #ef4444; color: white;'}
    `;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('userDropdown');
    
    if (dropdown && userMenu && !userMenu.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

console.log('Dashboard.js loaded successfully!');
