// Sample course data (fallback if database fails)
const courses = [
    {
        id: 'CS101',
        title: 'ISO 9001:2015 Module 1',
        description: 'Understanding the Basics of ISO Quality Management System (QMS).',
        price: 30000.00,
        image: 'ISO-9001:2015',
        duration: '1 weeks',
        instructor: 'John Smith'
    },
    {
        id: 'CS201',
        title: 'PECB Level 27001',
        description: 'Master Python, statistics, and machine learning concepts.',
        price: 60000.00,
        image: 'Data Science',
        duration: '3 weeks',
        instructor: 'Sarah Johnson'
    },
    {
        id: 'RS301',
        title: 'Risk Management',
        description: 'Learn basic to identifing risks in your envirnoment.',
        price: 100000.00,
        image: 'Health and Safety',
        duration: '6 weeks',
        instructor: 'Michael Brown'
    }
];

// Student data storage
let Students = JSON.parse(localStorage.getItem('lmsStudents')) || [];
let currentStudent = JSON.parse(localStorage.getItem('currentStudent')) || null;
let selectedCourse = null;

// DOM Elements
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link');
const registrationForm = document.getElementById('registration-form');
const loginForm = document.getElementById('login-form');
const paymentForm = document.getElementById('payment-form');
const courseGrid = document.querySelector('#courses .course-grid');
const paymentSummary = document.getElementById('payment-summary');
const paymentMethods = document.querySelectorAll('.payment-method');
const enrollButtons = document.querySelectorAll('.enroll-btn');
const dashboardNav = document.querySelectorAll('.dashboard-nav');
const dashboardSections = document.querySelectorAll('.dashboard-section');

// API Base URL - FIXED PORT
const API_BASE_URL = 'http://localhost:5500/api';

// Initialize the application
function init() {
    // Test database connection
    testConnection();
    
    // Check if Student is logged in
    if (currentStudent) {
        showSection('dashboard');
        updateDashboard();
    } else {
        showSection('home');
    }
    
    // Populate courses from database
    renderCourses();
    
    // Set up event listeners
    setupEventListeners();
}

// Set up all event listeners
function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.getAttribute('data-target');
            showSection(target);
        });
    });
    
    // Registration form - USE API
    registrationForm.addEventListener('submit', handleRegistration);
    
    // Login form - USE API
    loginForm.addEventListener('submit', handleLogin);
    
    // Payment form - USE API
    paymentForm.addEventListener('submit', handlePayment);
    
    // Payment method selection
    paymentMethods.forEach(method => {
        method.addEventListener('click', () => {
            paymentMethods.forEach(m => m.classList.remove('selected'));
            method.classList.add('selected');
        });
    });
    
    // Enroll buttons on home page
    enrollButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (!currentStudent) {
                showSection('login');
                alert('Please login to enroll in courses');
                return;
            }
            
            const courseCode = e.target.getAttribute('data-course');
            selectCourse(courseCode);
        });
    });
    
    // Dashboard navigation
    dashboardNav.forEach(nav => {
        nav.addEventListener('click', (e) => {
            e.preventDefault();
            const content = e.target.getAttribute('data-content');
            
            dashboardNav.forEach(n => n.classList.remove('active'));
            e.target.classList.add('active');
            
            dashboardSections.forEach(section => {
                section.style.display = 'none';
            });
            
            document.getElementById(`dashboard-${content}`).style.display = 'block';
            
            // Refresh dashboard data when switching to my-courses
            if (content === 'my-courses') {
                updateDashboard();
            }
        });
    });
}

// Show a specific section and hide others
function showSection(sectionId) {
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Convert to lowercase for consistency
    const normalizedSectionId = sectionId.toLowerCase();
    const sectionElement = document.getElementById(normalizedSectionId);
    if (sectionElement) {
        sectionElement.classList.add('active');
    }
    
    // Update navigation
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-target').toLowerCase() === normalizedSectionId) {
            link.classList.add('active');
        }
    });
}

// Test database connection
async function testConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/test`);
        const result = await response.json();
        console.log('Database connection:', result);
        return result.success;
    } catch (error) {
        console.log('Server not running. Start with: node server.js');
        return false;
    }
}

// Load courses from database
async function loadCoursesFromDB() {
    try {
        const response = await fetch(`${API_BASE_URL}/courses`);
        const result = await response.json();
        
        if (result.success) {
            return result.courses;
        } else {
            console.error('Failed to load courses:', result.message);
            return [];
        }
    } catch (error) {
        console.error('Error loading courses from database:', error);
        return [];
    }
}

// Render courses in the courses section
async function renderCourses() {
    courseGrid.innerHTML = '<p>Loading courses...</p>';
    
    const dbCourses = await loadCoursesFromDB();
    
    // Use database courses if available, otherwise use sample data
    const coursesToDisplay = dbCourses.length > 0 ? dbCourses : courses;
    
    courseGrid.innerHTML = '';
    
    coursesToDisplay.forEach(course => {
        const courseCode = course.CourseCode || course.id;
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.innerHTML = `
            <div class="course-image">${course.Category || course.image}</div>
            <div class="course-content">
                <h3 class="course-title">${course.Title || course.title}</h3>
                <p class="course-description">${course.Description || course.description}</p>
                <div class="course-meta">
                    <p><strong>Course Code:</strong> ${courseCode}</p>
                    <p><strong>Duration:</strong> ${course.DurationWeeks || course.duration}</p>
                    <p><strong>Instructor:</strong> ${course.InstructorName || course.instructor}</p>
                </div>
                <div class="course-price">JMD$${(course.Price || course.price).toFixed(2)}</div>
                <button class="enroll-btn" data-course="${courseCode}">Enroll Now</button>
            </div>
        `;
        
        courseGrid.appendChild(courseCard);
    });
    
    // Add event listeners to enroll buttons
    document.querySelectorAll('#courses .enroll-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            if (!currentStudent) {
                showSection('login');
                alert('Please login to enroll in courses');
                return;
            }
            
            const courseCode = e.target.getAttribute('data-course');
            selectCourse(courseCode);
        });
    });
}

// Handle Student registration - USING API
async function handleRegistration(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const firstName = formData.get('firstname') || formData.get('fullname')?.split(' ')[0];
    const lastName = formData.get('lastname') || formData.get('fullname')?.split(' ')[1] || '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                firstName: firstName,
                lastName: lastName,
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Registration successful! Please login.');
            showSection('login');
            registrationForm.reset();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Make sure server is running.');
    }
}

// Handle Student login - USING API
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Store Student data from API response
            currentStudent = {
                id: result.Student.StudentID,
                fullName: result.Student.fullName,
                email: result.Student.email,
                registrationDate: result.Student.registrationDate
            };
            
            localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
            alert('Login successful!');
            showSection('dashboard');
            updateDashboard();
            loginForm.reset();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Make sure server is running.');
    }
}

// Select a course for enrollment
function selectCourse(courseCode) {
    // For now, we'll use the sample data to show course details
    // In a real app, you'd fetch course details from the database
    selectedCourse = courses.find(course => course.id === courseCode);
    
    if (selectedCourse) {
        showSection('payment');
        updatePaymentSummary();
    } else {
        alert('Course not found');
    }
}

// Update payment summary
function updatePaymentSummary() {
    if (!selectedCourse) return;
    
    paymentSummary.innerHTML = `
        <h3>Order Summary</h3>
        <p><strong>Course:</strong> ${selectedCourse.title}</p>
        <p><strong>Price:</strong> JMD$${selectedCourse.price.toFixed(2)}</p>
        <p><strong>Total:</strong> JMD$${selectedCourse.price.toFixed(2)}</p>
    `;
}

// Handle payment - USING API
async function handlePayment(e) {
    e.preventDefault();
    
    if (!selectedCourse || !currentStudent) {
        alert('No course selected or Student not logged in');
        return;
    }
    
    try {
        const selectedPaymentMethod = document.querySelector('.payment-method.selected');
        const paymentMethod = selectedPaymentMethod ? selectedPaymentMethod.getAttribute('data-method') : 'credit-card';
        
        const response = await fetch(`${API_BASE_URL}/enroll`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                StudentID: currentStudent.id,
                courseCode: selectedCourse.id,
                paymentMethod: paymentMethod
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Enrollment successful!');
            showSection('dashboard');
            updateDashboard(); // Refresh dashboard to show new enrollment
            paymentForm.reset();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Payment error:', error);
        alert('Enrollment failed. Make sure server is running.');
    }
}

// Load enrolled courses from database
async function loadEnrolledCourses() {
    if (!currentStudent) return [];
    
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/${currentStudent.id}`);
        const result = await response.json();
        
        if (result.success) {
            return result.enrollments;
        } else {
            console.error('Failed to load enrolled courses:', result.message);
            return [];
        }
    } catch (error) {
        console.error('Error loading enrolled courses:', error);
        return [];
    }
}

// Update dashboard with Student data FROM DATABASE
async function updateDashboard() {
    if (!currentStudent) return;
    
    // Update profile
    document.getElementById('profile-details').innerHTML = `
        <p><strong>Name:</strong> ${currentStudent.fullName}</p>
        <p><strong>Email:</strong> ${currentStudent.email}</p>
        <p><strong>Member Since:</strong> ${new Date(currentStudent.registrationDate).toLocaleDateString()}</p>
    `;
    
    // Load enrolled courses FROM DATABASE
    const enrolledCourses = await loadEnrolledCourses();
    
    // Update enrolled courses
    const enrolledList = document.querySelector('.course-list');
    enrolledList.innerHTML = '';
    
    if (enrolledCourses.length > 0) {
        enrolledCourses.forEach(course => {
            const courseElement = document.createElement('div');
            courseElement.className = 'enrolled-course';
            courseElement.innerHTML = `
                <h4>${course.title} (${course.courseCode})</h4>
                <p><strong>Instructor:</strong> ${course.instructorName}</p>
                <p><strong>Enrolled:</strong> ${new Date(course.enrollmentDate).toLocaleDateString()}</p>
                <p><strong>Amount Paid:</strong> JMD$${course.amountPaid.toFixed(2)}</p>
                <div class="progress-bar">
                    <div class="progress" style="width: ${course.progressPercentage || 0}%"></div>
                </div>
                <p><strong>Progress:</strong> ${course.progressPercentage || 0}%</p>
                <p><strong>Status:</strong> ${course.isCompleted ? 'Completed' : 'In Progress'}</p>
                <button class="access-course" data-course="${course.courseCode}">Access Course</button>
            `;
            enrolledList.appendChild(courseElement);
        });
        
        // Add event listeners to access course buttons
        document.querySelectorAll('.access-course').forEach(button => {
            button.addEventListener('click', (e) => {
                const courseCode = e.target.getAttribute('data-course');
                accessCourse(courseCode);
            });
        });
    } else {
        enrolledList.innerHTML = '<p>You are not enrolled in any courses yet.</p>';
    }
    
    // Update progress section
    const progressDetails = document.getElementById('progress-details');
    if (enrolledCourses.length > 0) {
        let progressHTML = '<h4>Your Learning Progress</h4>';
        enrolledCourses.forEach(course => {
            progressHTML += `
                <div style="margin-bottom: 20px; padding: 10px; border-left: 4px solid #3498db;">
                    <p><strong>${course.title}</strong></p>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${course.progressPercentage || 0}%"></div>
                    </div>
                    <p>${course.progressPercentage || 0}% complete</p>
                    <p><small>Enrolled: ${new Date(course.enrollmentDate).toLocaleDateString()}</small></p>
                </div>
            `;
        });
        progressDetails.innerHTML = progressHTML;
    } else {
        progressDetails.innerHTML = '<p>No progress to display. Enroll in a course to get started!</p>';
    }
}

// Access a course (simulated)
function accessCourse(courseCode) {
    alert(`Accessing course: ${courseCode}\n\nThis would open the course content in a real LMS.`);
    
    // In a real app, you would:
    // 1. Update progress in the database
    // 2. Redirect to course content
    // 3. Track Student activity
}

// Logout function
function logout() {
    currentStudent = null;
    localStorage.removeItem('currentStudent');
    showSection('home');
    alert('You have been logged out successfully.');
}

// Add logout button to dashboard (you can add this button to your HTML)
function addLogoutButton() {
    const dashboardHeader = document.querySelector('#dashboard .section-title');
    if (dashboardHeader && !document.getElementById('logout-btn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logout-btn';
        logoutBtn.textContent = 'Logout';
        logoutBtn.style.marginLeft = '20px';
        logoutBtn.style.padding = '5px 15px';
        logoutBtn.style.background = '#e74c3c';
        logoutBtn.addEventListener('click', logout);
        dashboardHeader.appendChild(logoutBtn);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    init();
    addLogoutButton();
});