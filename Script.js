// API Base URL
const API_BASE_URL = 'http://localhost:5500/api';

// Global state
let currentStudent = JSON.parse(localStorage.getItem('currentStudent')) || null;
let currentInstructor = JSON.parse(localStorage.getItem('currentInstructor')) || null;
let currentAdmin = JSON.parse(localStorage.getItem('currentAdmin')) || null;
let selectedCourse = null;
let allLoadedCourses = []; // Store all courses loaded from database
let allInstructors = []; // Store all instructors for dropdown

// Course data (fallback)
const courses = [
    {
        id: 'CS101',
        title: 'ISO 9001:2015 Module 1',
        description: 'Understanding the Basics of ISO Quality Management System (QMS).',
        price: 30000.00,
        duration: '1 weeks',
        instructor: 'John Smith'
    },
    {
        id: 'CS201',
        title: 'PECB Level 27001',
        description: 'Master Python, statistics, and machine learning concepts.',
        price: 60000.00,
        duration: '3 weeks',
        instructor: 'Sarah Johnson'
    },
    {
        id: 'RS301',
        title: 'Risk Management',
        description: 'Learn basic to identifing risks in your envirnoment.',
        price: 100000.00,
        duration: '6 weeks',
        instructor: 'Michael Brown'
    }
];

// DOM Elements
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link');
const registrationForm = document.getElementById('registration-form');
const loginForm = document.getElementById('login-form');
const paymentForm = document.getElementById('payment-form');
const courseGrid = document.getElementById('courses-grid');
const paymentSummary = document.getElementById('payment-summary');
const paymentMethods = document.querySelectorAll('.payment-method');
const dashboardNav = document.querySelectorAll('.dashboard-nav');
const dashboardSections = document.querySelectorAll('.dashboard-section');
const studentLogoutBtn = document.getElementById('student-logout-btn');

// Instructor elements
const instructorLoginForm = document.getElementById('instructor-login-form');
const instructorNavBtns = document.querySelectorAll('.instructor-nav-btn');
const instructorViews = document.querySelectorAll('.instructor-view');
const instructorLogoutBtn = document.getElementById('instructor-logout-btn');
const instructorLoginSection = document.getElementById('instructor-login-section');
const instructorDashboardContent = document.getElementById('instructor-dashboard-content');
const instructorNameSpan = document.getElementById('instructor-name');

// Administrator elements
const adminLoginForm = document.getElementById('admin-login-form');
const adminNavBtns = document.querySelectorAll('.admin-nav-btn');
const adminViews = document.querySelectorAll('.admin-view');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const adminLoginSection = document.getElementById('admin-login-section');
const adminDashboardContent = document.getElementById('admin-dashboard-content');
const adminNameSpan = document.getElementById('admin-name');
const courseForm = document.getElementById('course-form');
const addCourseBtn = document.getElementById('add-course-btn');
const cancelCourseBtn = document.getElementById('cancel-course-btn');
const courseFormContainer = document.getElementById('course-form-container');

// Initialize application
function init() {
    console.log('Initializing application...');
    
    // Check if student is logged in
    if (currentStudent) {
        showSection('dashboard');
        updateDashboard();
    } 
    // Check if instructor is logged in
    else if (currentInstructor) {
        showInstructorDashboard();
    }
    // Check if admin is logged in
    else if (currentAdmin) {
        showAdminDashboard();
    }
    // No one is logged in
    else {
        showSection('home');
    }
    
    // Load courses
    loadAndRenderCourses();
    
    // Setup event listeners
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.getAttribute('data-target');
            
            // Special handling for instructor dashboard link
            if (target === 'instructor-dashboard') {
                if (!currentInstructor) {
                    showSection('instructor-dashboard');
                    return;
                }
            }
            
            showSection(target);
        });
    });
    
    // Student registration
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistration);
    }
    
    // Student login
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Payment form
    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePayment);
    }
    
    // Payment method selection
    if (paymentMethods.length > 0) {
        paymentMethods.forEach(method => {
            method.addEventListener('click', () => {
                paymentMethods.forEach(m => m.classList.remove('selected'));
                method.classList.add('selected');
            });
        });
    }
    
    // Dashboard navigation
    if (dashboardNav.length > 0) {
        dashboardNav.forEach(nav => {
            nav.addEventListener('click', (e) => {
                e.preventDefault();
                const content = e.target.getAttribute('data-content');
                
                dashboardNav.forEach(n => n.classList.remove('active'));
                e.target.classList.add('active');
                
                dashboardSections.forEach(section => {
                    section.style.display = 'none';
                });
                
                const targetSection = document.getElementById(`dashboard-${content}`);
                if (targetSection) {
                    targetSection.style.display = 'block';
                }
                
                if (content === 'my-courses') {
                    updateDashboard();
                }
            });
        });
    }
    
    // Student logout button
    if (studentLogoutBtn) {
        studentLogoutBtn.addEventListener('click', logoutStudent);
    }
    
    // Instructor login form
    if (instructorLoginForm) {
        instructorLoginForm.addEventListener('submit', handleInstructorLogin);
    }
    
    // Instructor logout button
    if (instructorLogoutBtn) {
        instructorLogoutBtn.addEventListener('click', handleInstructorLogout);
    }
    
    // Instructor navigation buttons
    instructorNavBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const viewId = e.target.getAttribute('data-target');
            showInstructorView(viewId);
        });
    });
    
    // Administrator login form
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
    }
    
    // Administrator logout button
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', handleAdminLogout);
    }
    
    // Administrator navigation buttons
    adminNavBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const viewId = e.target.getAttribute('data-target');
            showAdminView(viewId);
        });
    });
    
    // Add course button
    if (addCourseBtn) {
        addCourseBtn.addEventListener('click', showAddCourseForm);
    }
    
    // Cancel course button
    if (cancelCourseBtn) {
        cancelCourseBtn.addEventListener('click', hideCourseForm);
    }
    
    // Course form submit
    if (courseForm) {
        courseForm.addEventListener('submit', handleCourseFormSubmit);
    }
}

// Show section
function showSection(sectionId) {
    console.log('Showing section:', sectionId);
    
    sections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
        sectionElement.classList.add('active');
        sectionElement.style.display = 'block';
    }
    
    // Update navigation
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-target') === sectionId) {
            link.classList.add('active');
        }
    });
    
    // Load courses when showing the courses section
    if (sectionId === 'courses') {
        loadAndRenderCourses();
    }
}

// ==================== INSTRUCTOR FUNCTIONS ====================

// Handle instructor login
async function handleInstructorLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email').trim();
    const password = formData.get('password').trim();
    
    try {
        const response = await fetch(`${API_BASE_URL}/instructor/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Create instructor object
            currentInstructor = {
                id: result.instructor.InstructorID,
                email: result.instructor.email,
                fullName: result.instructor.fullName,
                department: result.instructor.department
            };
            
            // Save to localStorage
            localStorage.setItem('currentInstructor', JSON.stringify(currentInstructor));
            
            // Show success and navigate to dashboard
            showInstructorDashboard();
            await loadInstructorData();
            e.target.reset();
        } else {
            alert(result.message || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed due to a server error. Please try again.');
    }
}

// Show instructor dashboard
function showInstructorDashboard() {
    if (!currentInstructor) return;
    
    if (instructorLoginSection) {
        instructorLoginSection.style.display = 'none';
    }
    
    if (instructorDashboardContent) {
        instructorDashboardContent.style.display = 'block';
    }
    
    if (instructorNameSpan) {
        instructorNameSpan.textContent = currentInstructor.fullName;
    }
    
    showSection('instructor-dashboard');
    loadInstructorData();
}

// Handle instructor logout
function handleInstructorLogout() {
    currentInstructor = null;
    localStorage.removeItem('currentInstructor');
    
    if (instructorLoginSection) {
        instructorLoginSection.style.display = 'block';
    }
    
    if (instructorDashboardContent) {
        instructorDashboardContent.style.display = 'none';
    }
    
    showSection('home');
    alert('Instructor logged out successfully.');
}

// Load instructor data
async function loadInstructorData() {
    if (!currentInstructor) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/instructor/${currentInstructor.id}/stats`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const data = result.data;
            
            // Update statistics
            document.getElementById('stat-total-courses').textContent = data.TotalCourses || 0;
            document.getElementById('stat-total-students').textContent = data.TotalStudents || 0;
            document.getElementById('stat-avg-progress').textContent = `${Math.round(data.AverageProgress || 0)}%`;
            
            // Update progress breakdown
            document.getElementById('stat-not-started').textContent = data.NotStarted || 0;
            document.getElementById('stat-in-progress').textContent = data.InProgress || 0;
            document.getElementById('stat-completed').textContent = data.Completed || 0;
            
            // Load instructor courses
            loadInstructorCourses();
        }
    } catch (error) {
        console.error('Error loading instructor data:', error);
    }
}

// Show instructor view
function showInstructorView(viewId) {
    // Update active nav button
    instructorNavBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-target') === viewId) {
            btn.classList.add('active');
        }
    });
    
    // Show selected view
    instructorViews.forEach(view => {
        view.style.display = 'none';
        if (view.id === `instructor-${viewId}`) {
            view.style.display = 'block';
        }
    });
}

// Load instructor courses
async function loadInstructorCourses() {
    if (!currentInstructor) return;
    
    try {
        const coursesList = document.getElementById('instructor-courses-list');
        if (!coursesList) return;
        
        const response = await fetch(`${API_BASE_URL}/instructor/${currentInstructor.id}/courses`);
        const result = await response.json();
        
        if (result.success && result.data) {
            coursesList.innerHTML = result.data.map(course => `
                <div class="instructor-course-card">
                    <h5>${course.CourseCode} - ${course.Title}</h5>
                    <p class="text-muted">${course.Description || ''}</p>
                    <div class="course-meta">
                        <span>Duration: ${course.DurationWeeks} weeks</span>
                        <span>Price: JMD$${(course.Price || 0).toLocaleString()}</span>
                    </div>
                    <div class="course-stats">
                        <span>Enrolled: ${course.EnrolledStudents || 0} students</span>
                        <span>Avg Progress: ${Math.round(course.AverageProgress || 0)}%</span>
                    </div>
                </div>
            `).join('');
        } else {
            coursesList.innerHTML = '<p>No courses found.</p>';
        }
    } catch (error) {
        console.error('Error loading instructor courses:', error);
        const coursesList = document.getElementById('instructor-courses-list');
        if (coursesList) {
            coursesList.innerHTML = '<p>Error loading courses.</p>';
        }
    }
}

// ==================== STUDENT FUNCTIONS ====================

// Load and render courses
async function loadAndRenderCourses() {
    if (!courseGrid) {
        console.error('❌ courseGrid element not found!');
        return;
    }
    
    courseGrid.innerHTML = '<p>Loading courses...</p>';
    console.log('🔄 Starting to load courses from API...');
    
    try {
        const apiUrl = `${API_BASE_URL}/courses`;
        console.log('Fetching from:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('Response status:', response.status, response.ok ? '✅' : '❌');
        
        if (response.ok) {
            const result = await response.json();
            console.log('API result:', result);
            console.log('Courses received:', result.courses);
            
            if (result.success && result.courses && result.courses.length > 0) {
                console.log(`✅ Successfully loaded ${result.courses.length} courses from database`);
                console.log('Course details:', result.courses);
                allLoadedCourses = result.courses; // Store courses globally
                renderCourses(result.courses);
                return;
            } else {
                console.warn('⚠️ API returned success:false or empty courses array');
            }
        } else {
            const errorText = await response.text();
            console.error('❌ API request failed:', response.status, errorText);
        }
    } catch (error) {
        console.error('❌ Error fetching courses:', error);
    }
    
    // Use fallback data only if API fails
    console.log('⚠️ Falling back to hardcoded course data (3 courses)');
    allLoadedCourses = courses; // Store fallback courses globally
    renderCourses(courses);
}

// Render courses
function renderCourses(coursesData) {
    console.log('📋 renderCourses called with:', coursesData);
    console.log('Number of courses to render:', coursesData ? coursesData.length : 0);
    
    if (!courseGrid) {
        console.error('❌ courseGrid not found in renderCourses!');
        return;
    }
    
    courseGrid.innerHTML = '';
    console.log('✅ Cleared courseGrid, starting to render...');
    
    coursesData.forEach((course, index) => {
        console.log(`Rendering course ${index + 1}:`, course.Title || course.title, course.CourseCode || course.id);
        
        const courseCode = course.CourseCode || course.id;
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.innerHTML = `
            <div class="course-image">${course.Category || course.image || '📚'}</div>
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
    
    console.log(`✅ Finished rendering ${coursesData.length} course cards to the DOM`);
    
    // Add event listeners to enroll buttons
    document.querySelectorAll('.enroll-btn').forEach(button => {
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

// Handle student registration
async function handleRegistration(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const fullName = formData.get('fullName').trim();
    const parts = fullName.split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    
    if (!firstName) {
        alert('Please enter your full name');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            e.target.reset();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
    }
}

// Handle student login
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
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
            e.target.reset();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

// Select course
function selectCourse(courseCode) {
    console.log('Looking for course:', courseCode);
    console.log('Available courses:', allLoadedCourses);
    
    // Try to find in database courses first (using CourseCode)
    selectedCourse = allLoadedCourses.find(course => 
        (course.CourseCode && course.CourseCode === courseCode) || 
        (course.id && course.id === courseCode)
    );
    
    if (selectedCourse) {
        console.log('Found course:', selectedCourse);
        showSection('payment');
        updatePaymentSummary();
    } else {
        console.error('Course not found with code:', courseCode);
        alert('Course not found');
    }
}

// Update payment summary
function updatePaymentSummary() {
    if (!selectedCourse || !paymentSummary) return;
    
    const courseTitle = selectedCourse.Title || selectedCourse.title;
    const coursePrice = selectedCourse.Price || selectedCourse.price;
    
    paymentSummary.innerHTML = `
        <h3>Order Summary</h3>
        <p><strong>Course:</strong> ${courseTitle}</p>
        <p><strong>Price:</strong> JMD$${coursePrice.toFixed(2)}</p>
        <p><strong>Total:</strong> JMD$${coursePrice.toFixed(2)}</p>
    `;
}

// Handle payment
async function handlePayment(e) {
    e.preventDefault();
    
    if (!selectedCourse || !currentStudent) {
        alert('No course selected or student not logged in');
        return;
    }
    
    try {
        const selectedPaymentMethod = document.querySelector('.payment-method.selected');
        const paymentMethod = selectedPaymentMethod ? 
            selectedPaymentMethod.getAttribute('data-method') : 'credit-card';
        
        const courseCode = selectedCourse.CourseCode || selectedCourse.id;
        
        const response = await fetch(`${API_BASE_URL}/enroll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                StudentID: currentStudent.StudentID || currentStudent.id,
                courseCode: courseCode,
                paymentMethod: paymentMethod
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Enrollment successful!');
            showSection('dashboard');
            updateDashboard();
            e.target.reset();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Payment error:', error);
        alert('Enrollment failed. Please try again.');
    }
}

// Update dashboard
async function updateDashboard() {
    if (!currentStudent) return;
    
    // Update profile
    const profileDetails = document.getElementById('profile-details');
    if (profileDetails) {
        profileDetails.innerHTML = `
            <p><strong>Name:</strong> ${currentStudent.fullName}</p>
            <p><strong>Email:</strong> ${currentStudent.email}</p>
            <p><strong>Member Since:</strong> ${new Date(currentStudent.registrationDate).toLocaleDateString()}</p>
        `;
    }
    
    // Load enrolled courses
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/${currentStudent.StudentID || currentStudent.id}`);
        const result = await response.json();
        
        const enrolledList = document.querySelector('.course-list');
        if (enrolledList) {
            if (result.success && result.enrollments.length > 0) {
                enrolledList.innerHTML = result.enrollments.map(course => `
                    <div class="enrolled-course">
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
                    </div>
                `).join('');
                
                // Add event listeners to Access Course buttons
                document.querySelectorAll('.access-course').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const courseCode = e.target.getAttribute('data-course');
                        console.log('Accessing course:', courseCode);
                        
                        // Update course progress
                        updateCourseProgress(courseCode);
                    });
                });
                
                // Update Progress tab
                updateProgressTab(result.enrollments);
            } else {
                enrolledList.innerHTML = '<p>You are not enrolled in any courses yet.</p>';
                
                // Clear progress tab
                const progressDetails = document.getElementById('progress-details');
                if (progressDetails) {
                    progressDetails.innerHTML = '<p>No courses enrolled yet.</p>';
                }
            }
        }
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

// Update Progress Tab
function updateProgressTab(enrollments) {
    const progressDetails = document.getElementById('progress-details');
    if (!progressDetails) return;
    
    if (!enrollments || enrollments.length === 0) {
        progressDetails.innerHTML = '<p>No courses enrolled yet.</p>';
        return;
    }
    
    // Calculate statistics
    const totalCourses = enrollments.length;
    const completedCourses = enrollments.filter(c => c.isCompleted).length;
    const inProgressCourses = enrollments.filter(c => !c.isCompleted && c.progressPercentage > 0).length;
    const notStartedCourses = enrollments.filter(c => c.progressPercentage === 0).length;
    const averageProgress = Math.round(
        enrollments.reduce((sum, c) => sum + (c.progressPercentage || 0), 0) / totalCourses
    );
    
    progressDetails.innerHTML = `
        <div class="progress-summary">
            <h4>Overall Statistics</h4>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${totalCourses}</div>
                    <div class="stat-label">Total Courses</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${completedCourses}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${inProgressCourses}</div>
                    <div class="stat-label">In Progress</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${notStartedCourses}</div>
                    <div class="stat-label">Not Started</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${averageProgress}%</div>
                    <div class="stat-label">Average Progress</div>
                </div>
            </div>
        </div>
        
        <div class="course-progress-list">
            <h4>Course Details</h4>
            ${enrollments.map(course => `
                <div class="progress-item">
                    <div class="progress-item-header">
                        <h5>${course.title}</h5>
                        <span class="progress-badge ${course.isCompleted ? 'completed' : course.progressPercentage > 0 ? 'in-progress' : 'not-started'}">
                            ${course.isCompleted ? 'Completed' : course.progressPercentage > 0 ? 'In Progress' : 'Not Started'}
                        </span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress" style="width: ${course.progressPercentage || 0}%"></div>
                        </div>
                        <span class="progress-text">${course.progressPercentage || 0}%</span>
                    </div>
                    <div class="progress-item-meta">
                        <span>Instructor: ${course.instructorName}</span>
                        <span>Enrolled: ${new Date(course.enrollmentDate).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Update course progress
async function updateCourseProgress(courseCode) {
    if (!currentStudent) {
        alert('Please login first');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/update-progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                StudentID: currentStudent.StudentID || currentStudent.id,
                courseCode: courseCode,
                progressIncrement: 10 // Increment by 10% each time
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Course progress updated to ${result.progressPercentage}%!`);
            // Refresh dashboard to show updated progress
            updateDashboard();
        } else {
            alert('Failed to update progress: ' + result.message);
        }
    } catch (error) {
        console.error('Error updating progress:', error);
        alert('Error updating course progress');
    }
}

// Student logout
function logoutStudent() {
    currentStudent = null;
    localStorage.removeItem('currentStudent');
    showSection('home');
    alert('Logged out successfully.');
}

// ==================== ADMINISTRATOR FUNCTIONS ====================

// Handle administrator login
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email').trim();
    const password = formData.get('password').trim();
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentAdmin = {
                id: result.admin.AdminID,
                email: result.admin.email,
                fullName: result.admin.fullName,
                role: result.admin.role
            };
            
            localStorage.setItem('currentAdmin', JSON.stringify(currentAdmin));
            
            showAdminDashboard();
            await loadAdminData();
            e.target.reset();
        } else {
            alert(result.message || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        alert('Login failed due to a server error. Please try again.');
    }
}

// Show administrator dashboard
function showAdminDashboard() {
    if (!currentAdmin) return;
    
    if (adminLoginSection) {
        adminLoginSection.style.display = 'none';
    }
    
    if (adminDashboardContent) {
        adminDashboardContent.style.display = 'block';
    }
    
    if (adminNameSpan) {
        adminNameSpan.textContent = currentAdmin.fullName;
    }
    
    showSection('admin-dashboard');
    loadAdminData();
}

// Handle administrator logout
function handleAdminLogout() {
    currentAdmin = null;
    localStorage.removeItem('currentAdmin');
    
    if (adminLoginSection) {
        adminLoginSection.style.display = 'block';
    }
    
    if (adminDashboardContent) {
        adminDashboardContent.style.display = 'none';
    }
    
    showSection('home');
    alert('Administrator logged out successfully.');
}

// Load administrator data
async function loadAdminData() {
    if (!currentAdmin) return;
    
    try {
        // Load stats
        const statsResponse = await fetch(`${API_BASE_URL}/admin/stats`);
        const statsResult = await statsResponse.json();
        
        if (statsResult.success && statsResult.data) {
            const data = statsResult.data;
            
            document.getElementById('admin-stat-courses').textContent = data.TotalCourses || 0;
            document.getElementById('admin-stat-students').textContent = data.TotalStudents || 0;
            document.getElementById('admin-stat-instructors').textContent = data.TotalInstructors || 0;
            document.getElementById('admin-stat-enrollments').textContent = data.TotalEnrollments || 0;
            document.getElementById('admin-stat-revenue').textContent = `JMD$${(data.TotalRevenue || 0).toLocaleString()}`;
        }
        
        // Load instructors for dropdown
        await loadInstructors();
        
        // Load courses
        await loadAdminCourses();
        
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

// Show administrator view
function showAdminView(viewId) {
    adminNavBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-target') === viewId) {
            btn.classList.add('active');
        }
    });
    
    adminViews.forEach(view => {
        view.style.display = 'none';
        if (view.id === `admin-${viewId}`) {
            view.style.display = 'block';
        }
    });
    
    if (viewId === 'courses') {
        loadAdminCourses();
    }
}

// Load instructors for dropdown
async function loadInstructors() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/instructors`);
        const result = await response.json();
        
        if (result.success && result.data) {
            allInstructors = result.data;
            
            const instructorSelect = document.getElementById('course-instructor');
            if (instructorSelect) {
                instructorSelect.innerHTML = '<option value="">Select Instructor</option>' +
                    result.data.map(i => `<option value="${i.InstructorID}">${i.FullName} - ${i.Department || 'N/A'}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading instructors:', error);
    }
}

// Load admin courses
async function loadAdminCourses() {
    if (!currentAdmin) return;
    
    try {
        const coursesList = document.getElementById('admin-courses-list');
        if (!coursesList) return;
        
        const response = await fetch(`${API_BASE_URL}/admin/courses`);
        const result = await response.json();
        
        if (result.success && result.data) {
            coursesList.innerHTML = `
                <table class="courses-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Title</th>
                            <th>Instructor</th>
                            <th>Price</th>
                            <th>Duration</th>
                            <th>Enrollments</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.data.map(course => `
                            <tr class="${!course.IsActive ? 'inactive-course' : ''}">
                                <td>${course.CourseCode}</td>
                                <td>${course.Title}</td>
                                <td>${course.InstructorName}</td>
                                <td>JMD$${(course.Price || 0).toLocaleString()}</td>
                                <td>${course.DurationWeeks} weeks</td>
                                <td>${course.TotalEnrollments || 0}</td>
                                <td>
                                    <span class="status-badge ${course.IsActive ? 'active' : 'inactive'}">
                                        ${course.IsActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn-small edit-course-btn" data-course-id="${course.CourseID}">Edit</button>
                                    ${course.IsActive ? 
                                        `<button class="btn-small btn-danger delete-course-btn" data-course-id="${course.CourseID}">Delete</button>` :
                                        `<span class="text-muted">Deleted</span>`
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            // Add event listeners to edit and delete buttons
            document.querySelectorAll('.edit-course-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const courseId = e.target.getAttribute('data-course-id');
                    editCourse(courseId, result.data);
                });
            });
            
            document.querySelectorAll('.delete-course-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const courseId = e.target.getAttribute('data-course-id');
                    deleteCourse(courseId);
                });
            });
        } else {
            coursesList.innerHTML = '<p>No courses found.</p>';
        }
    } catch (error) {
        console.error('Error loading admin courses:', error);
    }
}

// Show add course form
function showAddCourseForm() {
    if (courseFormContainer) {
        courseFormContainer.style.display = 'block';
        document.getElementById('course-form-title').textContent = 'Add New Course';
        courseForm.reset();
        document.getElementById('course-id').value = '';
        document.getElementById('course-code').disabled = false;
    }
}

// Hide course form
function hideCourseForm() {
    if (courseFormContainer) {
        courseFormContainer.style.display = 'none';
        courseForm.reset();
    }
}

// Handle course form submit
async function handleCourseFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const courseId = formData.get('courseId');
    
    const courseData = {
        courseCode: formData.get('courseCode'),
        title: formData.get('title'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        durationWeeks: parseInt(formData.get('durationWeeks')),
        instructorId: parseInt(formData.get('instructorId')),
        category: formData.get('category')
    };
    
    try {
        let response;
        if (courseId) {
            // Update existing course
            response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(courseData)
            });
        } else {
            // Create new course
            response = await fetch(`${API_BASE_URL}/admin/courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(courseData)
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            alert(courseId ? 'Course updated successfully!' : 'Course created successfully!');
            hideCourseForm();
            await loadAdminCourses();
            await loadAndRenderCourses(); // Refresh public course list
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Course form error:', error);
        alert('Failed to save course. Please try again.');
    }
}

// Edit course
function editCourse(courseId, coursesData) {
    const course = coursesData.find(c => c.CourseID == courseId);
    if (!course) return;
    
    if (courseFormContainer) {
        courseFormContainer.style.display = 'block';
        document.getElementById('course-form-title').textContent = 'Edit Course';
        
        document.getElementById('course-id').value = course.CourseID;
        document.getElementById('course-code').value = course.CourseCode;
        document.getElementById('course-code').disabled = true; // Don't allow changing course code
        document.getElementById('course-title').value = course.Title;
        document.getElementById('course-description').value = course.Description || '';
        document.getElementById('course-price').value = course.Price;
        document.getElementById('course-duration').value = course.DurationWeeks;
        document.getElementById('course-instructor').value = course.InstructorID;
        document.getElementById('course-category').value = course.Category || '';
        
        // Scroll to form
        courseFormContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

// Delete course
async function deleteCourse(courseId) {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Course deleted successfully!');
            await loadAdminCourses();
            await loadAndRenderCourses(); // Refresh public course list
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Delete course error:', error);
        alert('Failed to delete course. Please try again.');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);