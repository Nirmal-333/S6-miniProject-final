const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NzQ4NzYzNDQsImV4cCI6MTc3NDk2Mjc0NH0.5vYM0K40PJfGDX_BnG9ZcQfWOonq1a9XKk1G7B_Wwvw';
fetch('http://localhost:5000/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
  body: JSON.stringify({
    name: 'Test Student',
    email: 'test' + Date.now() + '@college.edu',
    role: 'student',
    password: 'password',
    rollNo: '23CS001' + Date.now(),
    department: '',
    batch: ''
  })
}).then(res => res.text().then(t => console.log(res.status, t))).catch(console.error);
