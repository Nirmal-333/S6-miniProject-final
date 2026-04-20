import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function createDatabase() {
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL (Supabase)');

    // Create tables using PostgreSQL syntax
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        "rollNo" VARCHAR(50) UNIQUE,
        department VARCHAR(100),
        batch VARCHAR(50),
        photo TEXT,
        "mentorId" VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("mentorId") REFERENCES users(id)
      )`,

      // Sessions table
      `CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        "activityName" VARCHAR(255) NOT NULL,
        "facultyId" VARCHAR(255) NOT NULL,
        department VARCHAR(100) NOT NULL,
        venue VARCHAR(255) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        "startTime" TIME NOT NULL,
        "endTime" TIME NOT NULL,
        hour INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed')),
        otp VARCHAR(6),
        "otpExpiresAt" BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("facultyId") REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Attendance table
      `CREATE TABLE IF NOT EXISTS attendance (
        id VARCHAR(255) PRIMARY KEY,
        "sessionId" VARCHAR(255) NOT NULL,
        "studentId" VARCHAR(255) NOT NULL,
        status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent')),
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("sessionId") REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY ("studentId") REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE("sessionId", "studentId")
      )`,

      // Surveys table
      `CREATE TABLE IF NOT EXISTS surveys (
        id VARCHAR(255) PRIMARY KEY,
        "sessionId" VARCHAR(255) NOT NULL,
        "studentId" VARCHAR(255) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        clarity INTEGER NOT NULL CHECK (clarity >= 1 AND clarity <= 5),
        understanding INTEGER NOT NULL CHECK (understanding >= 1 AND understanding <= 5),
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("sessionId") REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY ("studentId") REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE("sessionId", "studentId")
      )`,

      // Leave requests table
      `CREATE TABLE IF NOT EXISTS leave_requests (
        id VARCHAR(255) PRIMARY KEY,
        "userId" VARCHAR(255) NOT NULL,
        "leaveType" VARCHAR(100) NOT NULL,
        "fromDate" TIMESTAMP NOT NULL,
        "toDate" TIMESTAMP NOT NULL,
        duration VARCHAR(50) NOT NULL,
        remarks TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
        "appliedBy" VARCHAR(255) NOT NULL,
        "approvedBy" VARCHAR(255),
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY ("appliedBy") REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY ("approvedBy") REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        "userId" VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        "read" BOOLEAN DEFAULT FALSE,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      )`
    ];

    for (const table of tables) {
      await client.query(table);
    }

    console.log('Tables created successfully');

    // Hash passwords for seed data
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('password', saltRounds);

    // Insert sample data (ON CONFLICT DO NOTHING = PostgreSQL equivalent of INSERT IGNORE)
    const sampleData = [
      {
        sql: `INSERT INTO users (id, name, role, email, password, "rollNo", department, batch, "mentorId")
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT DO NOTHING`,
        params: ['1', 'Admin User', 'admin', 'admin@college.edu', hashedPassword, null, null, null, null]
      },
      {
        sql: `INSERT INTO users (id, name, role, email, password, department, "mentorId")
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT DO NOTHING`,
        params: ['2', 'Kumar', 'faculty', 'kumar@college.edu', hashedPassword, 'CSE', null]
      },
      {
        sql: `INSERT INTO users (id, name, role, email, password, "rollNo", department, batch, "mentorId")
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT DO NOTHING`,
        params: ['3', 'Student User', 'student', 'student@college.edu', hashedPassword, '22CS101', 'CSE', '2022-26', '2']
      },
      {
        sql: `INSERT INTO sessions (id, "activityName", "facultyId", department, venue, description, date, "startTime", "endTime", hour)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT DO NOTHING`,
        params: ['session1', 'Data Structures Lecture', '2', 'CSE', 'Room 101', 'Introduction to Data Structures', '2026-03-29', '09:00:00', '10:00:00', 1]
      },
      {
        sql: `INSERT INTO sessions (id, "activityName", "facultyId", department, venue, description, date, "startTime", "endTime", hour)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT DO NOTHING`,
        params: ['session2', 'Database Management', '2', 'CSE', 'Room 102', 'SQL and Database Design', '2026-03-29', '10:00:00', '11:00:00', 2]
      }
    ];

    for (const data of sampleData) {
      await client.query(data.sql, data.params);
    }

    console.log('Sample data inserted successfully');
    console.log('Database initialization completed');
    console.log('');
    console.log('Default credentials:');
    console.log('  Admin   — admin@college.edu   / password');
    console.log('  Faculty — kumar@college.edu   / password');
    console.log('  Student — student@college.edu / password');

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase();
