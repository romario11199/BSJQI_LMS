// Sample course data
const courses = [
    {
        id:'CS101',
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
    },
    
];

// User data storage (in a real app, this would be on a server)
let users = JSON.parse(localStorage.getItem('lmsUsers')) || [];
let currentUser = JSON.parse(localStorage.getItem('lmsCurrentUser')) || null;
let selectedCourse = null;
let enrolledCourses = JSON.parse(localStorage.getItem('lmsEnrolledCourses')) || {};

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

// Initialize the application
function init() {
    // Check if user is logged in
    if (currentUser) {
        showSection('dashboard');
        updateDashboard();
    } else {
        showSection('home');
    }
    
    // Populate courses
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
    
    // Registration form
    registrationForm.addEventListener('submit', handleRegistration);
    
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Payment form
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
            if (!currentUser) {
                showSection('login');
                alert('Please login to enroll in courses');
                return;
            }
            
            const courseId = e.target.getAttribute('data-course');
            selectCourse(courseId);
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
        });
    });
}

// Update the showSection function to handle case sensitivity
function showSection(sectionId) {
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Convert to lowercase for consistency
    const normalizedSectionId = sectionId.toLowerCase();
    document.getElementById(normalizedSectionId).classList.add('active');
    
    // Update navigation
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-target').toLowerCase() === normalizedSectionId) {
            link.classList.add('active');
        }
    });
}

// Update the init function to use correct case
function init() {
    // Check if user is logged in
    if (currentUser) {
        showSection('dashboard');
        updateDashboard();
    } else {
        showSection('home'); // Make sure this is lowercase
    }
    
    // Populate courses
    renderCourses();
    
    // Set up event listeners
    setupEventListeners();
}

// Render courses in the courses section
function renderCourses() {
    courseGrid.innerHTML = '';
    
    courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.innerHTML = `
            <div class="course-image">${course.image}</div>
            <div class="course-content">
                <h3 class="course-title">${course.title}</h3>
                <p class="course-description">${course.description}</p>
                <div class="course-meta">
                    <p><strong>Duration:</strong> ${course.duration}</p>
                    <p><strong>Instructor:</strong> ${course.instructor}</p>
                </div>
                <div class="course-price">$${course.price.toFixed(2)}</div>
                <button class="enroll-btn" data-course="${course.id}">Enroll Now</button>
            </div>
        `;
        
        courseGrid.appendChild(courseCard);
    });
    
    // Add event listeners to enroll buttons
    document.querySelectorAll('#courses .enroll-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            if (!currentUser) {
                showSection('login');
                alert('Please login to enroll in courses');
                return;
            }
            
            const courseId = e.target.getAttribute('data-course');
            selectCourse(courseId);
        });
    });
}

// Handle user registration
function handleRegistration(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        fullname: formData.get('fullname'),
        email: formData.get('email'),
        password: formData.get('password'),
        phone: formData.get('phone'),
        id: Date.now().toString()
    };
    
    // Check if user already exists
    const existingUser = users.find(user => user.email === userData.email);
    if (existingUser) {
        alert('User with this email already exists');
        return;
    }
    
    // Check if passwords match
    if (formData.get('password') !== formData.get('confirm-password')) {
        alert('Passwords do not match');
        return;
    }
    
    // Add user to storage
    users.push(userData);
    localStorage.setItem('lmsUsers', JSON.stringify(users));
    
    alert('Registration successful! Please login to continue.');
    showSection('login');
    registrationForm.reset();
}

// Handle user login
function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    // Find user
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('lmsCurrentUser', JSON.stringify(currentUser));
        
        alert(`Welcome back, ${user.fullname}!`);
        showSection('dashboard');
        updateDashboard();
        loginForm.reset();
    } else {
        alert('Invalid email or password');
    }
}

// Select a course for enrollment
function selectCourse(courseId) {
    selectedCourse = courses.find(course => course.id === courseId);
    
    if (selectedCourse) {
        // Check if user is already enrolled
        if (enrolledCourses[currentUser.id] && enrolledCourses[currentUser.id].some(c => c.id === courseId)) {
            alert('You are already enrolled in this course');
            showSection('dashboard');
            return;
        }
        
        showSection('payment');
        updatePaymentSummary();
    }
}

// Update payment summary
function updatePaymentSummary() {
    if (!selectedCourse) return;
    
    paymentSummary.innerHTML = `
        <h3>Order Summary</h3>
        <p><strong>Course:</strong> ${selectedCourse.title}</p>
        <p><strong>Price:</strong> $${selectedCourse.price.toFixed(2)}</p>
        <p><strong>Total:</strong> $${selectedCourse.price.toFixed(2)}</p>
    `;
}

// Handle payment
function handlePayment(e) {
    e.preventDefault();
    
    if (!selectedCourse) {
        alert('No course selected');
        return;
    }
    
    // In a real app, this would process the payment
    alert('Payment processed successfully!');
    
    // Enroll user in the course
    if (!enrolledCourses[currentUser.id]) {
        enrolledCourses[currentUser.id] = [];
    }
    
    enrolledCourses[currentUser.id].push({
        ...selectedCourse,
        enrolledDate: new Date().toISOString(),
        progress: 0,
        completed: false
    });
    
    localStorage.setItem('lmsEnrolledCourses', JSON.stringify(enrolledCourses));
    
    // Reset and show dashboard
    selectedCourse = null;
    showSection('dashboard');
    updateDashboard();
    paymentForm.reset();
}

// Update dashboard with user data
function updateDashboard() {
    if (!currentUser) return;
    
    // Update profile
    document.getElementById('profile-details').innerHTML = `
        <p><strong>Name:</strong> ${currentUser.fullname}</p>
        <p><strong>Email:</strong> ${currentUser.email}</p>
        <p><strong>Phone:</strong> ${currentUser.phone || 'Not provided'}</p>
    `;
    
    // Update enrolled courses
    const enrolledList = document.querySelector('.course-list');
    enrolledList.innerHTML = '';
    
    if (enrolledCourses[currentUser.id] && enrolledCourses[currentUser.id].length > 0) {
        enrolledCourses[currentUser.id].forEach(course => {
            const courseElement = document.createElement('div');
            courseElement.className = 'enrolled-course';
            courseElement.innerHTML = `
                <h4>${course.title}</h4>
                <p>Enrolled: ${new Date(course.enrolledDate).toLocaleDateString()}</p>
                <div class="progress-bar">
                    <div class="progress" style="width: ${course.progress}%"></div>
                </div>
                <p>Progress: ${course.progress}%</p>
                <button class="access-course" data-course="${course.id}">Access Course</button>
            `;
            enrolledList.appendChild(courseElement);
        });
        
        // Add event listeners to access course buttons
        document.querySelectorAll('.access-course').forEach(button => {
            button.addEventListener('click', (e) => {
                const courseId = e.target.getAttribute('data-course');
                accessCourse(courseId);
            });
        });
    } else {
        enrolledList.innerHTML = '<p>You are not enrolled in any courses yet.</p>';
    }
    
    // Update progress
    const progressDetails = document.getElementById('progress-details');
    if (enrolledCourses[currentUser.id] && enrolledCourses[currentUser.id].length > 0) {
        let progressHTML = '';
        enrolledCourses[currentUser.id].forEach(course => {
            progressHTML += `
                <div style="margin-bottom: 15px;">
                    <p><strong>${course.title}</strong></p>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${course.progress}%"></div>
                    </div>
                    <p>${course.progress}% complete</p>
                </div>
            `;
        });
        progressDetails.innerHTML = progressHTML;
    } else {
        progressDetails.innerHTML = '<p>No progress to display. Enroll in a course to get started!</p>';
    }
}

// Access a course (simulated)
function accessCourse(courseId) {
    const course = enrolledCourses[currentUser.id].find(c => c.id === courseId);
    
    if (course) {
        alert(`Accessing course: ${course.title}\n\nThis would open the course content in a real LMS.`);
        
        // Simulate progress update
        if (course.progress < 100) {
            course.progress = Math.min(100, course.progress + 10);
            localStorage.setItem('lmsEnrolledCourses', JSON.stringify(enrolledCourses));
            updateDashboard();
        }
    }
}

// Logout function (can be added to the dashboard)
function logout() {
    currentUser = null;
    localStorage.removeItem('lmsCurrentUser');
    showSection('home');
    alert('You have been logged out successfully.');
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

//----------------------------------------------------------------

// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

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

// Update your renderCourses function to use database data
async function renderCourses() {
    courseGrid.innerHTML = '<p>Loading courses...</p>';
    
    const dbCourses = await loadCoursesFromDB();
    
    // Use database courses if available, otherwise use sample data
    const coursesToDisplay = dbCourses.length > 0 ? dbCourses : courses;
    
    courseGrid.innerHTML = '';
    
    coursesToDisplay.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.innerHTML = `
            <div class="course-image">${course.Category || course.image}</div>
            <div class="course-content">
                <h3 class="course-title">${course.Title}</h3>
                <p class="course-description">${course.Description}</p>
                <div class="course-meta">
                    <p><strong>Course Code:</strong> ${course.CourseCode}</p>
                    <p><strong>Duration:</strong> ${course.DurationWeeks} weeks</p>
                    <p><strong>Instructor:</strong> ${course.InstructorName}</p>
                </div>
                <div class="course-price">JMD$${course.Price.toFixed(2)}</div>
                <button class="enroll-btn" data-course="${course.CourseCode}">Enroll Now</button>
            </div>
        `;
        
        courseGrid.appendChild(courseCard);
    });
    
    // Add event listeners to enroll buttons
    document.querySelectorAll('#courses .enroll-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            if (!currentUser) {
                showSection('login');
                alert('Please login to enroll in courses');
                return;
            }
            
            const courseCode = e.target.getAttribute('data-course');
            selectCourse(courseCode);
        });
    });
}

// Update your existing functions to use the API
async function handleRegistration(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                firstName: formData.get('firstName') || formData.get('fullname')?.split(' ')[0],
                lastName: formData.get('lastName') || formData.get('fullname')?.split(' ')[1] || '',
                email: formData.get('email'),
                password: formData.get('password'),
                phoneNumber: formData.get('phone')
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
        alert('Registration failed. Make sure server is running.');
    }
}

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
            currentUser = result.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            alert('Login successful!');
            showSection('dashboard');
            updateDashboard();
            loginForm.reset();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        alert('Login failed. Make sure server is running.');
    }
}

// Update your init function
function init() {
    // Test database connection
    testConnection();
    
    // Check if user is logged in
    if (currentUser) {
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