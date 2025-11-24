import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    doc, 
    getDoc, 
    setDoc, 
    collection,
    getDocs,
    addDoc,
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let userData = null;
let courses = [];

console.log('Dashboard script loading...');

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

function initDashboard() {
    console.log('Initializing dashboard...');
    
    // Check authentication
    onAuthStateChanged(auth, async (user) => {
        console.log('Auth state changed:', user ? 'Logged in' : 'Not logged in');
        if (user) {
            currentUser = user;
            await loadUserData();
            await loadCourses();
            updateDashboard();
            setupEventListeners();
        } else {
            console.log('No user, redirecting to login');
            window.location.href = 'login.html';
        }
    });
}

// Setup all event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const target = item.getAttribute('href');
                
                // Hide all sections
                document.querySelectorAll('.dashboard-section').forEach(s => {
                    s.style.display = 'none';
                });
                
                // Show target section
                const section = document.querySelector(target);
                if (section) {
                    section.style.display = 'block';
                }
                
                // Update active state
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });
    
    // Add course form
    const addCourseForm = document.getElementById('addCourseForm');
    if (addCourseForm) {
        addCourseForm.addEventListener('submit', handleAddCourse);
    }
    
    // Close modal on outside click
    const modal = document.getElementById('addCourseModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal('addCourseModal');
            }
        });
    }
    
    console.log('Event listeners set up successfully');
}

// Load user data
async function loadUserData() {
    try {
        console.log('Loading user data...');
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (userDoc.exists()) {
            userData = userDoc.data();
            console.log('User data loaded:', userData);
            
            // Update UI
            const userName = userData.name || currentUser.email;
            document.getElementById('userName').textContent = userName;
            document.getElementById('welcomeName').textContent = userName;
            
            // Set user avatar
            const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            document.getElementById('userAvatar').textContent = initials;
            
            // Populate category dropdown
            const categorySelect = document.getElementById('courseCategory');
            if (categorySelect) {
                categorySelect.innerHTML = '';
                const categories = userData.categories || ['חובה', 'בחירה', 'כללי', 'ספורט'];
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat;
                    categorySelect.appendChild(option);
                });
            }
        } else {
            console.log('User document does not exist, creating...');
            // Create default user document
            userData = {
                name: currentUser.displayName || currentUser.email,
                email: currentUser.email,
                createdAt: new Date().toISOString(),
                institution: '',
                major: '',
                totalCreditsRequired: 120,
                targetAverage: 0,
                categories: ['חובה', 'בחירה', 'כללי', 'ספורט'],
                isWriter: false
            };
            await setDoc(doc(db, 'users', currentUser.uid), userData);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showMessage('שגיאה בטעינת נתוני משתמש', 'error');
    }
}

// Load courses
async function loadCourses() {
    try {
        console.log('Loading courses...');
        const coursesRef = collection(db, 'users', currentUser.uid, 'courses');
        const snapshot = await getDocs(coursesRef);
        courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Loaded ${courses.length} courses`);
    } catch (error) {
        console.error('Error loading courses:', error);
        showMessage('שגיאה בטעינת קורסים', 'error');
    }
}

// Update dashboard
function updateDashboard() {
    console.log('Updating dashboard...');
    updateStatistics();
    updateProgressBar();
    updateCharts();
    updateCategoryStats();
    populateCoursesTable();
    populateFilters();
}

// Calculate statistics
function updateStatistics() {
    const numericCourses = courses.filter(c => c.gradeType === 'רגיל' && c.grade > 0);
    
    let totalPoints = 0;
    let totalCredits = 0;
    
    numericCourses.forEach(course => {
        totalPoints += course.grade * course.credits;
        totalCredits += course.credits;
    });
    
    const weightedAverage = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
    document.getElementById('overallAverage').textContent = weightedAverage;
    
    const allCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    document.getElementById('totalCredits').textContent = allCredits.toFixed(1);
    
    const requiredCredits = userData?.totalCreditsRequired || 120;
    const progress = Math.min(100, (allCredits / requiredCredits * 100)).toFixed(1);
    document.getElementById('degreeProgress').textContent = progress + '%';
    
    const highestGrade = numericCourses.length > 0 ? Math.max(...numericCourses.map(c => c.grade)) : 0;
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
    
    const maxSemester = courses.length > 0 ? Math.max(...courses.map(c => c.semester)) : 0;
    const currentSemester = maxSemester + 1;
    const currentYear = Math.ceil(currentSemester / 2);
    
    const yearNames = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\''];
    document.getElementById('currentSemester').textContent = currentSemester;
    document.getElementById('currentYear').textContent = yearNames[currentYear - 1] || currentYear;
}

// Update charts
function updateCharts() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }
    
    updateSemesterChart();
    updateExamTypeChart();
}

function updateSemesterChart() {
    const ctx = document.getElementById('semesterChart');
    if (!ctx) return;
    
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
    const averages = semesters.map(s => (semesterData[s].points / semesterData[s].credits).toFixed(2));
    
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
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: false, min: 60, max: 100 }
            }
        }
    });
}

function updateExamTypeChart() {
    const ctx = document.getElementById('examTypeChart');
    if (!ctx) return;
    
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
            plugins: { legend: { display: false } }
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

// Populate courses table
function populateCoursesTable() {
    const tbody = document.getElementById('coursesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (courses.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 7;
        cell.style.textAlign = 'center';
        cell.style.padding = '2rem';
        cell.textContent = 'אין קורסים עדיין. לחץ על "הוסף קורס" כדי להתחיל!';
        return;
    }
    
    courses.forEach(course => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${course.name}</td>
            <td>${course.credits}</td>
            <td>${course.gradeType === 'בינארי' ? 'עבר' : course.grade}</td>
            <td>${course.semester}</td>
            <td>${course.category}</td>
            <td>${course.examType}</td>
            <td>
                <button onclick="deleteCourse('${course.id}')" class="btn-sm" style="background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">מחק</button>
            </td>
        `;
    });
}

// Populate filters
function populateFilters() {
    const semesterFilter = document.getElementById('filterSemester');
    const categoryFilter = document.getElementById('filterCategory');
    
    if (semesterFilter && courses.length > 0) {
        const semesters = [...new Set(courses.map(c => c.semester))].sort((a, b) => a - b);
        semesterFilter.innerHTML = '<option value="">כל הסמסטרים</option>';
        semesters.forEach(s => {
            const option = document.createElement('option');
            option.value = s;
            option.textContent = `סמסטר ${s}`;
            semesterFilter.appendChild(option);
        });
    }
    
    if (categoryFilter && courses.length > 0) {
        const categories = [...new Set(courses.map(c => c.category))];
        categoryFilter.innerHTML = '<option value="">כל הקטגוריות</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryFilter.appendChild(option);
        });
    }
}

// Handle add course
async function handleAddCourse(e) {
    e.preventDefault();
    console.log('Adding course...');
    
    const courseData = {
        name: document.getElementById('courseName').value,
        credits: parseFloat(document.getElementById('courseCredits').value),
        grade: parseFloat(document.getElementById('courseGrade').value),
        semester: parseInt(document.getElementById('courseSemester').value),
        category: document.getElementById('courseCategory').value,
        examType: document.getElementById('courseExamType').value,
        gradeType: document.getElementById('courseGradeType').value
    };
    
    console.log('Course data:', courseData);
    
    try {
        await addDoc(collection(db, 'users', currentUser.uid, 'courses'), courseData);
        console.log('Course added successfully');
        
        await loadCourses();
        updateDashboard();
        closeModal('addCourseModal');
        e.target.reset();
        showMessage('הקורס נוסף בהצלחה!', 'success');
    } catch (error) {
        console.error('Error adding course:', error);
        showMessage('שגיאה בהוספת הקורס: ' + error.message, 'error');
    }
}

// Show message
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        padding: 1rem 2rem;
        border-radius: 10px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        ${type === 'success' ? 'background: #10b981; color: white;' : 'background: #ef4444; color: white;'}
    `;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

// Global functions
window.toggleTheme = () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
};

window.toggleUserMenu = () => {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
};

window.logout = async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error logging out:', error);
        showMessage('שגיאה בהתנתקות', 'error');
    }
};

window.showProfile = () => {
    showMessage('דף הפרופיל בפיתוח', 'error');
};

window.showSettings = () => {
    showMessage('דף ההגדרות בפיתוח', 'error');
};

window.showAddCourse = () => {
    console.log('Opening add course modal...');
    const modal = document.getElementById('addCourseModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        console.log('Modal opened');
    } else {
        console.error('Modal not found!');
    }
};

window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
};

window.showImportCSV = () => {
    showMessage('ייבוא CSV בפיתוח', 'error');
};

window.exportCSV = () => {
    if (courses.length === 0) {
        showMessage('אין קורסים לייצא', 'error');
        return;
    }
    
    const headers = ['שם הקורס', 'נ"ז', 'ציון', 'סמסטר', 'קטגוריה', 'מועד', 'סוג ציון'];
    const rows = courses.map(c => [c.name, c.credits, c.grade, c.semester, c.category, c.examType, c.gradeType]);
    
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

window.filterCourses = () => {
    populateCoursesTable();
};

window.sortCourses = () => {
    populateCoursesTable();
};

window.calculateWhatIf = () => {
    showMessage('מחשבון "מה אם" בפיתוח', 'error');
};

window.addFutureCourse = () => {
    showMessage('הוספת קורס עתידי בפיתוח', 'error');
};

window.calculateShield = () => {
    const shieldGrade = parseFloat(document.getElementById('shieldGrade')?.value);
    const shieldPercent = parseFloat(document.getElementById('shieldPercent')?.value);
    const examGrade = document.getElementById('examGrade')?.value;
    
    const result = document.getElementById('shieldResult');
    if (!result) return;
    
    if (!shieldGrade || !shieldPercent) {
        result.textContent = 'אנא מלא את כל השדות';
        result.classList.add('active');
        result.style.display = 'block';
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
    result.style.display = 'block';
};

window.generatePDF = () => {
    showMessage('יצירת PDF בפיתוח', 'error');
};

window.showSummary = () => {
    showMessage('סיכום אקדמי בפיתוח', 'error');
};

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('userDropdown');
    
    if (dropdown && userMenu && !userMenu.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
const icon = document.querySelector('.theme-icon');
if (icon) icon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

console.log('Dashboard script loaded successfully!');
