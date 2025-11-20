const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const sql = db.sql;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

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

        res.json({ success: true, courses });
    } catch (error) {
        console.error('Courses error:', error.message || error);
        res.status(500).json({ success: false, message: error.message || error });
    }
});

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, phoneNumber } = req.body;
        
        console.log('Registration attempt for:', email);
        
        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');
        const request = pool.request();
        
        // Check if email already exists
        const emailCheck = await request
            .input('Email', sql.NVarChar(255), email)
            .query('SELECT UserID FROM Users WHERE Email = @Email');
        
        if (emailCheck.recordset.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email already exists' 
            });
        }
        
        // Insert new user
        const insertResult = await request
            .input('FirstName', sql.NVarChar(100), firstName)
            .input('LastName', sql.NVarChar(100), lastName)
            .input('Email', sql.NVarChar(255), email)
            .input('PasswordHash', sql.NVarChar(255), password)
            .input('PhoneNumber', sql.NVarChar(20), phoneNumber || null)
            .query(`
                INSERT INTO Users (FirstName, LastName, Email, PasswordHash, PhoneNumber) 
                OUTPUT INSERTED.UserID
                VALUES (@FirstName, @LastName, @Email, @PasswordHash, @PhoneNumber)
            `);
        
        res.json({ 
            success: true, 
            userId: insertResult.recordset[0].UserID,
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

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Login attempt for:', email);
        
        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');
        const request = pool.request();
        
        const result = await request
            .input('Email', sql.NVarChar(255), email)
            .input('PasswordHash', sql.NVarChar(255), password)
            .query(`
                SELECT UserID, FirstName, LastName, Email, PhoneNumber, RegistrationDate 
                FROM Users 
                WHERE Email = @Email AND PasswordHash = @PasswordHash AND IsActive = 1
            `);
        
        if (result.recordset.length > 0) {
            // Update last login time
            await pool.request()
                .input('UserID', sql.Int, result.recordset[0].UserID)
                .query('UPDATE Users SET LastLogin = GETDATE() WHERE UserID = @UserID');

            const u = result.recordset[0];
            res.json({ 
                success: true, 
                user: {
                    userId: u.UserID,
                    fullName: (u.FirstName || '') + ' ' + (u.LastName || ''),
                    email: u.Email,
                    phoneNumber: u.PhoneNumber,
                    registrationDate: u.RegistrationDate
                },
                message: 'Login successful' 
            });
        } else {
            res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Enroll in course
app.post('/api/enroll', async (req, res) => {
    try {
        const { userId, courseCode, paymentMethod } = req.body;
        const pool = await poolPromise;
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
            .input('UserID', sql.Int, userId)
            .input('CourseID', sql.Int, courseId)
            .query('SELECT EnrollmentID FROM CourseEnrollments WHERE UserID = @UserID AND CourseID = @CourseID');
        
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
                .input('UserID', sql.Int, userId)
                .input('CourseID', sql.Int, courseId)
                .input('AmountPaid', sql.Decimal(10,2), coursePrice)
                .query(`
                    INSERT INTO CourseEnrollments (UserID, CourseID, AmountPaid) 
                    OUTPUT INSERTED.EnrollmentID
                    VALUES (@UserID, @CourseID, @AmountPaid)
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

// Get user dashboard data
app.get('/api/dashboard/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const pool = db.getPool();
        if (!pool) throw new Error('DB pool not initialized');
        const request = pool.request();

        const result = await request
            .input('UserID', sql.Int, userId)
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
                WHERE ce.UserID = @UserID
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