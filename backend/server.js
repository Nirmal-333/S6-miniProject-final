import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

try {
  const connection = await db.getConnection();
  console.log('Connected to MySQL database');
  connection.release();
} catch (error) {
  console.error('Failed to connect to MySQL:', error.message);
  process.exit(1);
}

// Middleware
app.set('trust proxy', 1);
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow localhost on any port
    if (origin.startsWith('http://localhost')) return callback(null, true);
    // Allow all Vercel deployments for this project
    if (origin.includes('vercel.app')) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// Rate limiting — generous limits so normal dev usage is never blocked
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: () => process.env.NODE_ENV === 'development',
});
app.use(limiter);

// Stricter limiter for auth routes only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
  skip: () => process.env.NODE_ENV === 'development',
});

// Helper functions
function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ? OR rollNo = ?',
      [identifier, identifier]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, name, role, email, phone, rollNo, department, batch, photo, mentorId FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [result] = await db.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Users
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, name, role, email, phone, rollNo, department, batch, photo, mentorId FROM users ORDER BY name');
    res.json({ users: rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add user
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const { name, role, email, phone, password, rollNo, department, batch, mentorId } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = generateId();

    await db.execute(
      'INSERT INTO users (id, name, role, email, phone, password, rollNo, department, batch, mentorId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, role, email, phone ?? null, hashedPassword, rollNo ?? null, department ?? null, batch ?? null, mentorId ?? null]
    );

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Email or roll number already exists' });
    } else {
      res.status(500).json({ error: error.message, stack: error.stack, code: error.code });
    }
  }
});

// Update user
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const fields = Object.keys(updates).filter(key => updates[key] !== undefined);
    const values = fields.map(key => updates[key]);

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');

    await db.execute(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, id]);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sessions
app.get('/api/sessions', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT s.*, u.name as facultyName FROM sessions s JOIN users u ON s.facultyId = u.id ORDER BY s.date DESC, s.startTime DESC'
    );
    res.json({ sessions: rows });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create session
app.post('/api/sessions', authenticateToken, async (req, res) => {
  try {
    const { activityName, facultyId, department, venue, description, date, startTime, endTime, hour } = req.body;
    const id = generateId();

    await db.execute(
      'INSERT INTO sessions (id, activityName, facultyId, department, venue, description, date, startTime, endTime, hour) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, activityName, facultyId, department ?? null, venue ?? null, description ?? null, date, startTime, endTime, hour]
    );

    res.status(201).json({ message: 'Session created successfully' });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete session
app.delete('/api/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM sessions WHERE id = ?', [id]);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate OTP for session
app.post('/api/sessions/:id/generate-otp', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const otp = generateOTP();
    const expiresAt = Date.now() + 20000; // 20 seconds

    await db.execute(
      "UPDATE sessions SET status = 'active', otp = ?, otpExpiresAt = ? WHERE id = ?",
      [otp, expiresAt, id]
    );

    res.json({ otp });
  } catch (error) {
    console.error('Generate OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End session — auto-mark absent for all eligible students who didn't attend
app.post('/api/sessions/:id/end', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the session details (department + batch)
    const [sessionRows] = await db.execute('SELECT * FROM sessions WHERE id = ?', [id]);
    const session = sessionRows[0];
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Mark session as completed
    await db.execute(
      "UPDATE sessions SET status = 'completed', otp = NULL, otpExpiresAt = NULL WHERE id = ?",
      [id]
    );

    // Find all students who belong to this session's department and batch
    let studentQuery = "SELECT id FROM users WHERE role = 'student'";
    const params = [];
    if (session.department) {
      studentQuery += ' AND department = ?';
      params.push(session.department);
    }
    if (session.batch) {
      studentQuery += ' AND batch = ?';
      params.push(session.batch);
    }
    const [students] = await db.execute(studentQuery, params);

    // Find students who already have an attendance record for this session
    const [existingRows] = await db.execute(
      'SELECT studentId FROM attendance WHERE sessionId = ?',
      [id]
    );
    const attended = new Set(existingRows.map(r => r.studentId));

    // Insert absent records for students who did not mark attendance
    for (const student of students) {
      if (!attended.has(student.id)) {
        const absentId = generateId();
        await db.execute(
          "INSERT INTO attendance (id, sessionId, studentId, status, timestamp) VALUES (?, ?, ?, 'absent', ?)",
          [absentId, id, student.id, Date.now()]
        );
      }
    }

    res.json({ message: 'Session ended successfully' });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Transfer activity
app.put('/api/sessions/:id/transfer', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { newFacultyId } = req.body;

    await db.execute('UPDATE sessions SET facultyId = ? WHERE id = ?', [newFacultyId, id]);

    res.json({ message: 'Activity transferred successfully' });
  } catch (error) {
    console.error('Transfer activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark attendance
app.post('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { sessionId, code } = req.body;
    const studentId = req.user.id;

    // Check if session is active and OTP matches
    const [sessionRows] = await db.execute("SELECT * FROM sessions WHERE id = ? AND status = 'active'", [sessionId]);
    const session = sessionRows[0];

    if (!session) {
      return res.status(400).json({ error: 'Session not active' });
    }
    if (session.otp !== code || Date.now() > session.otpExpiresAt) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Check if attendance already exists
    const [existingRows] = await db.execute('SELECT id FROM attendance WHERE sessionId = ? AND studentId = ?', [sessionId, studentId]);
    const existing = existingRows[0];

    if (existing) {
      return res.status(400).json({ error: 'Attendance already marked' });
    }

    const id = generateId();
    await db.execute(
      "INSERT INTO attendance (id, sessionId, studentId, status, timestamp) VALUES (?, ?, ?, 'present', ?)",
      [id, sessionId, studentId, Date.now()]
    );

    res.json({ message: 'Attendance marked successfully' });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance
app.get('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT a.*, s.activityName, s.date, u.name as studentName FROM attendance a JOIN sessions s ON a.sessionId = s.id JOIN users u ON a.studentId = u.id ORDER BY a.timestamp DESC'
    );
    res.json({ attendance: rows });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk mark attendance
app.post('/api/attendance/bulk', authenticateToken, async (req, res) => {
  try {
    const { studentIds, sessionId, status } = req.body;

    // Delete existing attendance for these students in this session
    const placeholders = studentIds.map(() => '?').join(',');
    await db.execute(`DELETE FROM attendance WHERE sessionId = ? AND studentId IN (${placeholders})`, [sessionId, ...studentIds]);

    // Insert new attendance
    const attendances = studentIds.map(studentId => ({
      id: generateId(),
      sessionId,
      studentId,
      status,
      timestamp: Date.now()
    }));

    for (const attendance of attendances) {
      await db.execute(
        'INSERT INTO attendance (id, sessionId, studentId, status, timestamp) VALUES (?, ?, ?, ?, ?)',
        [attendance.id, attendance.sessionId, attendance.studentId, attendance.status, attendance.timestamp]
      );
    }

    res.json({ message: 'Bulk attendance marked successfully' });
  } catch (error) {
    console.error('Bulk mark attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Surveys
app.post('/api/surveys', authenticateToken, async (req, res) => {
  try {
    const { sessionId, rating, clarity, understanding, comments } = req.body;
    const studentId = req.user.id;

    // Check if survey already exists
    const [existingRows] = await db.execute('SELECT id FROM surveys WHERE sessionId = ? AND studentId = ?', [sessionId, studentId]);
    const existing = existingRows[0];

    if (existing) {
      return res.status(400).json({ error: 'Survey already submitted' });
    }

    const id = generateId();
    await db.execute(
      'INSERT INTO surveys (id, sessionId, studentId, rating, clarity, understanding, comments) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, sessionId, studentId, rating ?? null, clarity ?? null, understanding ?? null, comments ?? null]
    );

    res.status(201).json({ message: 'Survey submitted successfully' });
  } catch (error) {
    console.error('Submit survey error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get surveys
app.get('/api/surveys', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT s.*, sess.activityName, u.name as studentName FROM surveys s JOIN sessions sess ON s.sessionId = sess.id JOIN users u ON s.studentId = u.id ORDER BY s.created_at DESC'
    );
    res.json({ surveys: rows });
  } catch (error) {
    console.error('Get surveys error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave requests
app.post('/api/leaves', authenticateToken, async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, duration, remarks } = req.body;
    const userId = req.user.id;
    const id = generateId();

    await db.execute(
      'INSERT INTO leave_requests (id, userId, leaveType, fromDate, toDate, duration, remarks, appliedBy, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, leaveType, fromDate, toDate, duration, remarks ?? null, userId, Date.now()]
    );

    // Create notifications
    const [userRows] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
    const user = userRows[0];

    if (user.role === 'student' && user.mentorId) {
      const notificationId = generateId();
      await db.execute(
        'INSERT INTO notifications (id, userId, message, timestamp) VALUES (?, ?, ?, ?)',
        [notificationId, user.mentorId, `Your mentee ${user.name} has submitted a leave request.`, Date.now()]
      );
    } else if (user.role === 'faculty') {
      const [adminRows] = await db.execute("SELECT id FROM users WHERE role = 'admin'");
      const admins = adminRows;
      for (const admin of admins) {
        const notificationId = generateId();
        await db.execute(
          'INSERT INTO notifications (id, userId, message, timestamp) VALUES (?, ?, ?, ?)',
          [notificationId, admin.id, `Faculty member ${user.name} has submitted a leave request.`, Date.now()]
        );
      }
    }

    res.status(201).json({ message: 'Leave request submitted successfully' });
  } catch (error) {
    console.error('Submit leave request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get leave requests
app.get('/api/leaves', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT lr.*, u.name as userName, u.role as userRole, approver.name as approverName FROM leave_requests lr JOIN users u ON lr.userId = u.id LEFT JOIN users approver ON lr.approvedBy = approver.id ORDER BY lr.timestamp DESC'
    );
    res.json({ leaveRequests: rows });
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update leave request status
app.put('/api/leaves/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const approvedBy = req.user.id;

    await db.execute('UPDATE leave_requests SET status = ?, approvedBy = ? WHERE id = ?', [status, approvedBy, id]);

    // Notify the user
    const [requestRows] = await db.execute('SELECT userId FROM leave_requests WHERE id = ?', [id]);
    const request = requestRows[0];
    if (request) {
      const notificationId = generateId();
      await db.execute(
        'INSERT INTO notifications (id, userId, message, timestamp) VALUES (?, ?, ?, ?)',
        [notificationId, request.userId, `Your leave request has been ${status}.`, Date.now()]
      );
    }

    res.json({ message: 'Leave request updated successfully' });
  } catch (error) {
    console.error('Update leave request status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM notifications WHERE userId = ? ORDER BY timestamp DESC', [req.user.id]);
    res.json({ notifications: rows });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('UPDATE notifications SET is_read = TRUE WHERE id = ? AND userId = ?', [id, req.user.id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add notification
app.post('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { userId, message } = req.body;
    const id = generateId();

    await db.execute(
      'INSERT INTO notifications (id, userId, message, timestamp) VALUES (?, ?, ?, ?)',
      [id, userId, message, Date.now()]
    );

    res.status(201).json({ message: 'Notification created successfully' });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
