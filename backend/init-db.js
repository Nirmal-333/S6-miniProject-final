import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function createDatabase() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Create tables
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role ENUM('student', 'faculty', 'admin') NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        rollNo VARCHAR(50) UNIQUE,
        department VARCHAR(100),
        batch VARCHAR(50),
        photo TEXT,
        mentorId VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (mentorId) REFERENCES users(id)
      )`,

      `CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        activityName VARCHAR(255) NOT NULL,
        facultyId VARCHAR(255) NOT NULL,
        department VARCHAR(100) NOT NULL,
        venue VARCHAR(255) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        startTime TIME NOT NULL,
        endTime TIME NOT NULL,
        hour INTEGER NOT NULL,
        status ENUM('scheduled', 'active', 'completed') DEFAULT 'scheduled',
        otp VARCHAR(6),
        otpExpiresAt BIGINT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (facultyId) REFERENCES users(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS attendance (
        id VARCHAR(255) PRIMARY KEY,
        sessionId VARCHAR(255) NOT NULL,
        studentId VARCHAR(255) NOT NULL,
        status ENUM('present', 'absent') NOT NULL,
        timestamp BIGINT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(sessionId, studentId)
      )`,

      `CREATE TABLE IF NOT EXISTS surveys (
        id VARCHAR(255) PRIMARY KEY,
        sessionId VARCHAR(255) NOT NULL,
        studentId VARCHAR(255) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        clarity INTEGER NOT NULL CHECK (clarity >= 1 AND clarity <= 5),
        understanding INTEGER NOT NULL CHECK (understanding >= 1 AND understanding <= 5),
        comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(sessionId, studentId)
      )`,

      `CREATE TABLE IF NOT EXISTS leave_requests (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        leaveType VARCHAR(100) NOT NULL,
        fromDate DATETIME NOT NULL,
        toDate DATETIME NOT NULL,
        duration VARCHAR(50) NOT NULL,
        remarks TEXT,
        status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
        appliedBy VARCHAR(255) NOT NULL,
        approvedBy VARCHAR(255),
        timestamp BIGINT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (appliedBy) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        \`read\` BOOLEAN DEFAULT FALSE,
        timestamp BIGINT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )`
    ];

    for (const table of tables) {
      await connection.execute(table);
    }

    console.log('Tables created successfully');

    // Hash passwords
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('password', saltRounds);

    // Insert sample data
    const sampleData = [
      {
        sql: `INSERT IGNORE INTO users (id, name, role, email, password, rollNo, department, batch, mentorId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: ['1', 'Admin User', 'admin', 'admin@college.edu', hashedPassword, null, null, null, null]
      },
      {
        sql: `INSERT IGNORE INTO users (id, name, role, email, password, department, mentorId) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        params: ['2', 'Kumar', 'faculty', 'kumar@college.edu', hashedPassword, 'CSE', null]
      },
      {
        sql: `INSERT IGNORE INTO users (id, name, role, email, password, rollNo, department, batch, mentorId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: ['3', 'Student User', 'student', 'student@college.edu', hashedPassword, '22CS101', 'CSE', '2022-26', '2']
      },
      {
        sql: `INSERT IGNORE INTO sessions (id, activityName, facultyId, department, venue, description, date, startTime, endTime, hour) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: ['session1', 'Data Structures Lecture', '2', 'CSE', 'Room 101', 'Introduction to Data Structures', '2026-03-29', '09:00:00', '10:00:00', 1]
      },
      {
        sql: `INSERT IGNORE INTO sessions (id, activityName, facultyId, department, venue, description, date, startTime, endTime, hour) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: ['session2', 'Database Management', '2', 'CSE', 'Room 102', 'SQL and Database Design', '2026-03-29', '10:00:00', '11:00:00', 2]
      }
    ];

    for (const data of sampleData) {
      await connection.execute(data.sql, data.params);
    }

    console.log('Sample data inserted successfully');

    console.log('Database initialization completed');

  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createDatabase();
