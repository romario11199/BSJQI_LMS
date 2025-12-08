const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const sql = db.sql;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5500;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Test database connection
async function testConnection() {
    try {
        const pool = db.getPool();
        if (!pool) {
            throw new Error('DB pool not initialized');
        }
        const result = await pool.request().query('SELECT DB_NAME() as dbname, @@VERSION as version');
        console.log('Connected to SQL Server successfully!');
        console.log('Database:', result.recordset[0].dbname);
        return true;
    } catch (err) {
        console.error('SQL Server connection failed:', err.message || err);
        return false;
    }
}

// API Routes

// Test database connection
app.get('/api/test', async (req, res) => {
    try {
        const connected = await testConnection();
        if (connected) {
            res.json({ 
                success: true, 
                message: `Connected to SQL Server` 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Database connection failed' 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error: ' + (error.message || error)
        });
    }
});

// Get all courses from database
app.get('/api/courses', async (req, res) => {
    try {
        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');
        const result = await pool.request().query(
            `SELECT CourseCode, Title, Description, Price, DurationWeeks, InstructorName, Category
             FROM Courses
             WHERE IsActive = 1
             ORDER BY CourseCode`
        );

        // Map DB fields to camelCase for consistency
        const courses = result.recordset.map(r => ({
            CourseCode: r.CourseCode,
            Title: r.Title,
            Description: r.Description,
            Price: r.Price,
            DurationWeeks: r.DurationWeeks,
            InstructorName: r.InstructorName,
            Category: r.Category
        }));

        console.log(`Returning ${courses.length} active courses from database`);
        res.json({ success: true, courses });
    } catch (error) {
        console.error('Courses error:', error.message || error);
        res.status(500).json({ success: false, message: error.message || error });
    }
});

// Student registration
app.post('/api/register', async (req, res) => {
    try {
        let { firstName, lastName, email, password, fullName, fullname } = req.body;
        if (!firstName) {
            console.log('[Register] firstName missing in body, attempting fallback parse from fullName/fullname');
        }

        // Log raw body for diagnostics
        if (req.body) {
            console.log('[Register] Raw body keys:', Object.keys(req.body));
            console.log('[Register] Raw body values snapshot:', req.body);
        }

        // Fallback parsing if firstName not provided
        if ((!firstName || firstName.trim() === '') && (fullName || fullname)) {
            const raw = (fullName || fullname || '').trim();
            const parts = raw.split(/\s+/).filter(p => p.length);
            firstName = parts[0] || '';
            lastName = parts.slice(1).join(' ');
            console.log('[Register] Parsed from fullName:', { raw, firstName, lastName });
        }

        // Secondary fallback: if still empty but we have any raw full name string, use entire string as firstName
        if ((!firstName || firstName.trim() === '') && (fullName || fullname)) {
            firstName = (fullName || fullname).trim();
            lastName = '';
            console.log('[Register] Using entire fullName as firstName:', firstName);
        }

        // Final trimming
        firstName = (firstName || '').trim();
        lastName = (lastName || '').trim();
        email = (email || '').trim();
        password = (password || '').trim();

        if (!firstName) {
            console.log('[Register] Still no firstName after fallback. Raw body:', req.body);
            return res.status(400).json({ success: false, message: 'First name is required.' });
        }
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }
        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required.' });
        }

        console.log('[Register] Incoming:', { firstName, lastName, email });

        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');

        // STEP 1 â€” fresh request
        const emailCheckReq = pool.request();
        const emailCheck = await emailCheckReq
            .input('Email', sql.NVarChar(255), email)
            .query(`SELECT StudentID FROM Students WHERE Email = @Email`);

        if (emailCheck.recordset.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Hash the password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // STEP 2 â€" fresh request
        const insertReq = pool.request();
        const insertResult = await insertReq
            .input('FirstName', sql.NVarChar(100), firstName)
            .input('LastName', sql.NVarChar(100), lastName)
            .input('Email', sql.NVarChar(255), email)
            .input('PasswordHash', sql.NVarChar(255), hashedPassword)
            .query(`
                INSERT INTO Students (FirstName, LastName, Email, PasswordHash)
                OUTPUT INSERTED.StudentID AS StudentID
                VALUES (@FirstName, @LastName, @Email, @PasswordHash)
            `);

        res.json({
            success: true,
            StudentID: insertResult.recordset[0].StudentID,
            message: 'Registration successful'
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// Student login
const bcrypt = require('bcryptjs');

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('Login attempt for:', email);

        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');
        const request = pool.request();

        // Fetch student by email (do not compare password in SQL so we can handle hashing correctly)
        const result = await request
            .input('Email', sql.NVarChar(255), email)
            .query(`
                SELECT StudentID AS StudentID, FirstName, LastName, Email, RegistrationDate, PasswordHash, IsActive
                FROM dbo.Students
                WHERE Email = @Email
            `);

        if (!result.recordset || result.recordset.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const u = result.recordset[0];

        if (!u.IsActive) {
            return res.status(403).json({ success: false, message: 'Account inactive' });
        }

        const storedHash = u.PasswordHash || '';

        let passwordMatches = false;

        // If storedHash looks like a bcrypt hash, use bcrypt compare
        if (typeof storedHash === 'string' && storedHash.startsWith('$2')) {
            passwordMatches = await bcrypt.compare(password, storedHash);
        } else {
            // Fallback: compare raw values (useful for placeholder/mock hashed values)
            passwordMatches = (password === storedHash);
        }

        if (!passwordMatches) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Update last login time
        await pool.request()
            .input('StudentID', sql.Int, u.StudentID)
            .query('UPDATE dbo.Students SET LastLogin = GETDATE() WHERE StudentID = @StudentID');

        res.json({
            success: true,
                Student: {
                StudentID: u.StudentID,
                fullName: (u.FirstName || '') + ' ' + (u.LastName || ''),
                email: u.Email,
                registrationDate: u.RegistrationDate
            },
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Login error:', error.message || error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

// ==================== INSTRUCTOR AUTHENTICATION ====================

// Instructor login
app.post('/api/instructor/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('Instructor login attempt for:', email);

        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');
        const request = pool.request();

        // Fetch instructor by email
        const result = await request
            .input('Email', sql.NVarChar(255), email)
            .query(`
                SELECT InstructorID, FirstName, LastName, Email, Department, HireDate, PasswordHash, IsActive
                FROM Instructors
                WHERE Email = @Email AND IsActive = 1
            `);

        if (!result.recordset || result.recordset.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid instructor email or account inactive' 
            });
        }

        const instructor = result.recordset[0];
        const storedHash = instructor.PasswordHash || '';

        // For demo, compare directly (in production, use bcrypt.compare)
        let passwordMatches = false;
        
        // Check if it's a bcrypt hash or plain text
        if (typeof storedHash === 'string' && storedHash.startsWith('$2')) {
            // If using bcrypt hashes
            passwordMatches = await bcrypt.compare(password, storedHash);
        } else {
            // For plain text passwords (demo/testing)
            passwordMatches = (password === storedHash);
        }

        if (!passwordMatches) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid password' 
            });
        }

        // Update last login time (if you have this column)
        try {
            await pool.request()
                .input('InstructorID', sql.Int, instructor.InstructorID)
                .query(`
                    UPDATE Instructors 
                    SET LastLogin = GETDATE() 
                    WHERE InstructorID = @InstructorID
                `);
        } catch (err) {
            console.log('Note: LastLogin column might not exist:', err.message);
        }

        res.json({
            success: true,
            instructor: {
                InstructorID: instructor.InstructorID,
                fullName: `${instructor.FirstName} ${instructor.LastName}`,
                firstName: instructor.FirstName,
                lastName: instructor.LastName,
                email: instructor.Email,
                department: instructor.Department,
                hireDate: instructor.HireDate
            },
            message: 'Instructor login successful'
        });

    } catch (error) {
        console.error('Instructor login error:', error.message || error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Server error' 
        });
    }
});

// Get instructor dashboard stats
app.get('/api/instructor/:instructorId/stats', async (req, res) => {
    try {
        const instructorId = req.params.instructorId;
        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');

        // Get total courses taught by this instructor
        const coursesResult = await pool.request()
            .input('InstructorID', sql.Int, instructorId)
            .query(`
                SELECT COUNT(*) as TotalCourses
                FROM Courses
                WHERE InstructorID = @InstructorID AND IsActive = 1
            `);

        // Get total students enrolled in instructor's courses
        const studentsResult = await pool.request()
            .input('InstructorID', sql.Int, instructorId)
            .query(`
                SELECT COUNT(DISTINCT ce.StudentID) as TotalStudents
                FROM CourseEnrollments ce
                INNER JOIN Courses c ON ce.CourseID = c.CourseID
                WHERE c.InstructorID = @InstructorID
            `);

        // Get average progress for instructor's courses
        const progressResult = await pool.request()
            .input('InstructorID', sql.Int, instructorId)
            .query(`
                SELECT AVG(ce.ProgressPercentage) as AverageProgress
                FROM CourseEnrollments ce
                INNER JOIN Courses c ON ce.CourseID = c.CourseID
                WHERE c.InstructorID = @InstructorID
            `);

        // Get total revenue from instructor's courses
        const revenueResult = await pool.request()
            .input('InstructorID', sql.Int, instructorId)
            .query(`
                SELECT SUM(ce.AmountPaid) as TotalRevenue
                FROM CourseEnrollments ce
                INNER JOIN Courses c ON ce.CourseID = c.CourseID
                WHERE c.InstructorID = @InstructorID
            `);

        // Get progress breakdown
        const breakdownResult = await pool.request()
            .input('InstructorID', sql.Int, instructorId)
            .query(`
                SELECT 
                    SUM(CASE WHEN ce.ProgressPercentage = 0 THEN 1 ELSE 0 END) as NotStartedStudents,
                    SUM(CASE WHEN ce.ProgressPercentage > 0 AND ce.ProgressPercentage < 100 THEN 1 ELSE 0 END) as InProgressStudents,
                    SUM(CASE WHEN ce.IsCompleted = 1 THEN 1 ELSE 0 END) as CompletedStudents
                FROM CourseEnrollments ce
                INNER JOIN Courses c ON ce.CourseID = c.CourseID
                WHERE c.InstructorID = @InstructorID
            `);

        const stats = {
            TotalCourses: coursesResult.recordset[0]?.TotalCourses || 0,
            TotalStudents: studentsResult.recordset[0]?.TotalStudents || 0,
            AverageProgress: Math.round(progressResult.recordset[0]?.AverageProgress || 0),
            TotalRevenue: revenueResult.recordset[0]?.TotalRevenue || 0,
            NotStarted: breakdownResult.recordset[0]?.NotStartedStudents || 0,
            InProgress: breakdownResult.recordset[0]?.InProgressStudents || 0,
            Completed: breakdownResult.recordset[0]?.CompletedStudents || 0
        };

        res.json({ 
            success: true, 
            data: stats 
        });

    } catch (error) {
        console.error('Instructor stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Get instructor's courses
app.get('/api/instructor/:instructorId/courses', async (req, res) => {
    try {
        const instructorId = req.params.instructorId;
        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');
        const request = pool.request();

        const result = await request
            .input('InstructorID', sql.Int, instructorId)
            .query(`
                SELECT 
                    c.CourseID,
                    c.CourseCode,
                    c.Title,
                    c.Description,
                    c.Price,
                    c.DurationWeeks,
                    c.Category,
                    c.InstructorName,
                    COUNT(ce.EnrollmentID) as TotalEnrollments,
                    AVG(ce.ProgressPercentage) as AverageProgress
                FROM Courses c
                LEFT JOIN CourseEnrollments ce ON c.CourseID = ce.CourseID
                WHERE c.InstructorID = @InstructorID AND c.IsActive = 1
                GROUP BY 
                    c.CourseID, c.CourseCode, c.Title, c.Description, 
                    c.Price, c.DurationWeeks, c.Category, c.InstructorName
                ORDER BY c.CourseCode
            `);

        const courses = result.recordset.map(course => ({
            CourseID: course.CourseID,
            CourseCode: course.CourseCode,
            Title: course.Title,
            Description: course.Description,
            Price: course.Price,
            DurationWeeks: course.DurationWeeks,
            Category: course.Category,
            InstructorName: course.InstructorName,
            EnrolledStudents: course.TotalEnrollments,
            AverageProgress: Math.round(course.AverageProgress || 0)
        }));

        res.json({ 
            success: true, 
            data: courses 
        });

    } catch (error) {
        console.error('Instructor courses error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Get students in instructor's courses
app.get('/api/instructor/:instructorId/students', async (req, res) => {
    try {
        const instructorId = req.params.instructorId;
        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');
        const request = pool.request();

        const result = await request
            .input('InstructorID', sql.Int, instructorId)
            .query(`
                SELECT 
                    s.StudentID,
                    s.FirstName,
                    s.LastName,
                    s.Email,
                    s.PhoneNumber,
                    c.CourseCode,
                    c.Title as CourseTitle,
                    ce.EnrollmentDate,
                    ce.ProgressPercentage,
                    ce.IsCompleted,
                    ce.AmountPaid
                FROM CourseEnrollments ce
                INNER JOIN Students s ON ce.StudentID = s.StudentID
                INNER JOIN Courses c ON ce.CourseID = c.CourseID
                WHERE c.InstructorID = @InstructorID
                ORDER BY ce.EnrollmentDate DESC
            `);

        const students = result.recordset.map(student => ({
            StudentID: student.StudentID,
            FullName: `${student.FirstName} ${student.LastName}`,
            Email: student.Email,
            PhoneNumber: student.PhoneNumber,
            CourseCode: student.CourseCode,
            CourseTitle: student.CourseTitle,
            EnrollmentDate: student.EnrollmentDate,
            ProgressPercentage: student.ProgressPercentage,
            IsCompleted: student.IsCompleted,
            AmountPaid: student.AmountPaid
        }));

        res.json({ 
            success: true, 
            students: students 
        });

    } catch (error) {
        console.error('Instructor students error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Enroll in course
app.post('/api/enroll', async (req, res) => {
    try {
        const { StudentID, courseCode, paymentMethod } = req.body;
        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');
        const request = pool.request();
        
        // Get course details
        const courseResult = await request
            .input('CourseCode', sql.NVarChar(20), courseCode)
            .query('SELECT CourseID, Price FROM Courses WHERE CourseCode = @CourseCode AND IsActive = 1');
        
        if (courseResult.recordset.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Course not found' 
            });
        }
        
        const courseId = courseResult.recordset[0].CourseID;
        const coursePrice = courseResult.recordset[0].Price;
        
        // Check if already enrolled
        const enrollmentCheck = await request
            .input('StudentID', sql.Int, StudentID)
            .input('CourseID', sql.Int, courseId)
            .query('SELECT EnrollmentID FROM CourseEnrollments WHERE StudentID = @StudentID AND CourseID = @CourseID');
        
        if (enrollmentCheck.recordset.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Already enrolled in this course'
            });
        }
        
        // Start transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            const transactionRequest = new sql.Request(transaction);
            
            // Create enrollment
            const enrollmentResult = await transactionRequest
                .input('StudentID', sql.Int, StudentID)
                .input('CourseID', sql.Int, courseId)
                .input('AmountPaid', sql.Decimal(10,2), coursePrice)
                .query(`
                    INSERT INTO CourseEnrollments (StudentID, CourseID, AmountPaid) 
                    OUTPUT INSERTED.EnrollmentID
                    VALUES (@StudentID, @CourseID, @AmountPaid)
                `);
            
            const enrollmentId = enrollmentResult.recordset[0].EnrollmentID;
            
            // Record payment
            await transactionRequest
                .input('EnrollmentID', sql.Int, enrollmentId)
                .input('Amount', sql.Decimal(10,2), coursePrice)
                .input('PaymentMethod', sql.NVarChar(50), paymentMethod)
                .query(`
                    INSERT INTO Payments (EnrollmentID, Amount, PaymentMethod, Status) 
                    VALUES (@EnrollmentID, @Amount, @PaymentMethod, 'completed')
                `);
            
            await transaction.commit();
            
            res.json({ 
                success: true, 
                enrollmentId: enrollmentId,
                message: 'Enrollment successful' 
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Get Student dashboard data - FIXED Student ID REFERENCE
app.get('/api/dashboard/:StudentID', async (req, res) => {
    try {
        const StudentID = req.params.StudentID;
        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');
        const request = pool.request();

        const result = await request
            .input('StudentID', sql.Int, StudentID)
            .query(`
                SELECT 
                    ce.EnrollmentID,
                    c.CourseCode,
                    c.Title,
                    c.InstructorName,
                    ce.EnrollmentDate,
                    ce.ProgressPercentage,
                    ce.IsCompleted,
                    p.PaymentDate,
                    ce.AmountPaid
                FROM CourseEnrollments ce
                INNER JOIN Courses c ON ce.CourseID = c.CourseID
                LEFT JOIN Payments p ON ce.EnrollmentID = p.EnrollmentID
                WHERE ce.StudentID = @StudentID
                ORDER BY ce.EnrollmentDate DESC
            `);

        const enrollments = result.recordset.map(r => ({
            enrollmentId: r.EnrollmentID,
            courseCode: r.CourseCode,
            title: r.Title,
            instructorName: r.InstructorName,
            enrollmentDate: r.EnrollmentDate,
            progressPercentage: r.ProgressPercentage,
            isCompleted: !!r.IsCompleted,
            paymentDate: r.PaymentDate,
            amountPaid: r.AmountPaid
        }));

        res.json({ success: true, enrollments });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Update course progress
app.post('/api/update-progress', async (req, res) => {
    try {
        const { StudentID, courseCode, progressIncrement } = req.body;
        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');
        
        // Get course ID
        const courseResult = await pool.request()
            .input('CourseCode', sql.NVarChar(20), courseCode)
            .query('SELECT CourseID FROM Courses WHERE CourseCode = @CourseCode');
        
        if (courseResult.recordset.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Course not found' 
            });
        }
        
        const courseId = courseResult.recordset[0].CourseID;
        const increment = progressIncrement || 10; // Default 10% increment
        
        // Update progress
        await pool.request()
            .input('StudentID', sql.Int, StudentID)
            .input('CourseID', sql.Int, courseId)
            .input('Increment', sql.Int, increment)
            .query(`
                UPDATE CourseEnrollments
                SET ProgressPercentage = CASE 
                    WHEN ProgressPercentage + @Increment >= 100 THEN 100
                    ELSE ProgressPercentage + @Increment
                END,
                IsCompleted = CASE 
                    WHEN ProgressPercentage + @Increment >= 100 THEN 1
                    ELSE IsCompleted
                END,
                CompletionDate = CASE 
                    WHEN ProgressPercentage + @Increment >= 100 AND CompletionDate IS NULL THEN GETDATE()
                    ELSE CompletionDate
                END
                WHERE StudentID = @StudentID AND CourseID = @CourseID
            `);
        // Get updated values
        const selectResult = await pool.request()
            .input('StudentID', sql.Int, StudentID)
            .input('CourseID', sql.Int, courseId)
            .query(`
                SELECT ProgressPercentage, IsCompleted
                FROM CourseEnrollments
                WHERE StudentID = @StudentID AND CourseID = @CourseID
            `);
        
        if (selectResult.recordset.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Enrollment not found' 
            });
        }
        
        const updatedProgress = selectResult.recordset[0];
        
        res.json({ 
            success: true, 
            progressPercentage: updatedProgress.ProgressPercentage,
            isCompleted: !!updatedProgress.IsCompleted,
            message: 'Progress updated successfully' 
        });
        
    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(port, async () => {
    console.log(` Server running at http://127.0.0.1:${port}`);
    console.log(` Test connection: http://localhost:${port}/api/test`);
    console.log(` Website: http://127.0.0.1:${port}`);
    console.log(` SQL Server: ${db.dbConfig ? db.dbConfig.server : 'unknown'}`);
    console.log(` Database: ${db.dbConfig ? db.dbConfig.database : 'unknown'}`);

    // Initialize DB pool but don't crash server if DB is unavailable
    const pool = await db.initDb();
    if (!pool) {
        console.warn('Warning: Database pool not initialized. API DB routes will fail until DB is reachable.');
    } else {
        console.log('Database pool initialized.');
    }

    // Test database connection on startup (will return false if pool not initialized)
    await testConnection();
});

// Debug: return Students table schema (columns and data types)
app.get('/api/debug/students-schema', async (req, res) => {
    try {
        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');

        const result = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Students'
            ORDER BY ORDINAL_POSITION
        `);

        res.json({ success: true, columns: result.recordset });
    } catch (err) {
        console.error('Debug schema error:', err.message || err);
        res.status(500).json({ success: false, message: err.message || err });
    }
});

// Debug: fetch instructor record by email
app.get('/api/debug/instructor', async (req, res) => {
    try {
        const email = (req.query.email || '').trim();
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email query parameter is required' });
        }
        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');
        const result = await pool.request()
            .input('Email', sql.NVarChar(255), email)
            .query(`SELECT TOP 1 InstructorID, FirstName, LastName, Email, PasswordHash, IsActive FROM dbo.Instructors WHERE Email = @Email`);
        res.json({ success: true, record: result.recordset[0] || null });
    } catch (err) {
        console.error('Debug instructor error:', err.message || err);
        res.status(500).json({ success: false, message: err.message || err });
    }
});

// Debug: fetch ALL courses (including inactive) to see what's in the database
app.get('/api/debug/all-courses', async (req, res) => {
    try {
        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');
        const result = await pool.request().query(`
            SELECT CourseID, CourseCode, Title, Description, Price, DurationWeeks, InstructorName, Category, IsActive
            FROM Courses
            ORDER BY CourseCode
        `);
        res.json({ 
            success: true, 
            totalCourses: result.recordset.length,
            activeCourses: result.recordset.filter(c => c.IsActive).length,
            inactiveCourses: result.recordset.filter(c => !c.IsActive).length,
            courses: result.recordset 
        });
    } catch (err) {
        console.error('Debug all courses error:', err.message || err);
        res.status(500).json({ success: false, message: err.message || err });
    }
});

