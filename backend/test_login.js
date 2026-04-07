const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: 'd:/S6-Miniproject/backend/.env' });

async function test() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'attendance_system'
  });
  
  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', ['admin@college.edu']);
  console.log('User found:', rows.length > 0);
  
  if (rows.length > 0) {
    console.log('Role:', rows[0].role);
    const match = await bcrypt.compare('password', rows[0].password);
    console.log('Password valid:', match);
  }
  db.end();
}

test().catch(console.error);
