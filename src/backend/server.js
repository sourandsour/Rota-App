// server connection //
const express = require('express');
const mysql2 = require('mysql2/promise');
const cors = require('cors');
const PORT = 3000; 
const app = express();
app.use(cors());
app.use(express.json());


// (NOTE) change to your password and database here //
const db = mysql2.createPool({
    host: 'localhost',
    user: 'root',
    password: 'soup',
    database: 'myrotaapp'
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


//---- API endpoints ----//

// login endpoint //
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    try {        
        const [users] = await db.query(
            'SELECT id, username, password_hash, role FROM users WHERE username = ? AND password_hash = ?',
            [username, password]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
        const user = users[0];
        
        const [employees] = await db.query(
            'SELECT id, first_name FROM employees WHERE user_id = ?',
            [user.id]
        );

        if (employees.length === 0) {
            return res.status(404).json({ success: false, message: 'Employee record not found' });
        }

        const employee = employees[0];    
        const sUser = {
            id: employee.id,      
            role: user.role,
            first_name: employee.first_name
        };
        res.json({ success: true, user: sUser });
        
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// shifts endpoint //
app.post("/api/shifts", async (req, res) => {
       const { date, shift, employee } = req.body;

  try {
    console.log("HIT SHIFT ROUTE", req.body);
    
    const [existing] = await db.query(
      "SELECT * FROM shifts WHERE shift_date = ? AND shift_type = ?",
      [date, shift]
    );

    if (existing.length > 0) {
      await db.query(
        "UPDATE shifts SET employee_id = ? WHERE shift_date = ? AND shift_type = ?",
        [employee, date, shift]
      );
    } else {
      await db.query(
        "INSERT INTO shifts (employee_id, shift_date, shift_type) VALUES (?, ?, ?)",
        [employee, date, shift]
      );
    }

    res.json({ success: true });

  } catch (err) {
    console.error("SHIFT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// employee pull endpoint //
app.get('/api/employees', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, first_name FROM employees'
    );

    res.json(rows); 
  } catch (err) {
    console.error("EMPLOYEE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// week pull endpoint//
app.get('/api/shifts', async (req, res) => {
  const { start, end, employee } = req.query;

  try {
    const [rows] = await db.query(
      `SELECT s.employee_id,
              e.first_name AS employee_name,
              DATE_FORMAT(s.shift_date, '%Y-%m-%d') AS shift_date,
              s.shift_type
         FROM shifts s
         JOIN employees e ON s.employee_id = e.id
         WHERE s.shift_date BETWEEN ? AND ?
           ${employee ? 'AND s.employee_id = ?' : ''}`,
      employee ? [start, end, employee] : [start, end]
    );

    res.json(rows);
  } catch (err) {
    console.error("FETCH SHIFTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});



// auto allocation endpoint //
app.post('/auto-allocate', async (req, res) => {
    const { start, end } = req.body;

    try {
        const [employees] = await db.query('SELECT id FROM employees');

        const [existingShifts] = await db.query(
            'SELECT employee_id, shift_date, shift_type FROM shifts WHERE shift_date BETWEEN ? AND ?',
            [start, end]
        );
        
        const [unavailableShifts] = await db.query(
            'SELECT employee_id, weekday, unavailable_shift FROM employee_availability'
        );

        const shiftTypes = ['morning', 'afternoon', 'evening'];
        const shiftsToInsert = [];
        const currentDate = new Date(start);
        const endDate = new Date(end);

        
        const unavailableMap = {};
        unavailableShifts.forEach(u => {
            if (!unavailableMap[u.employee_id]) unavailableMap[u.employee_id] = new Set();
            unavailableMap[u.employee_id].add(`${u.weekday}-${u.unavailable_shift}`);
        });
        
        const scheduledMap = {};
        existingShifts.forEach(s => {
            const dateStr = new Date(s.shift_date).toISOString().split('T')[0];
            if (!scheduledMap[dateStr]) scheduledMap[dateStr] = new Set();
            scheduledMap[dateStr].add(s.employee_id);
        });

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const weekday = currentDate.toLocaleDateString('en-US', { weekday: 'short' });

            if (!scheduledMap[dateStr]) scheduledMap[dateStr] = new Set();

            for (const shiftType of shiftTypes) {
                
                const availableEmployees = employees
                    .map(e => e.id)
                    .filter(id => {
                        const key = `${weekday}-${shiftType}`;
                        return !scheduledMap[dateStr].has(id) &&
                               (!unavailableMap[id] || !unavailableMap[id].has(key));
                    });

                if (availableEmployees.length === 0) continue;

                const empId = availableEmployees[Math.floor(Math.random() * availableEmployees.length)];
                shiftsToInsert.push([empId, dateStr, shiftType]);
                scheduledMap[dateStr].add(empId);
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        for (const [empId, date, shiftType] of shiftsToInsert) {
            await db.query(
                `INSERT INTO shifts (employee_id, shift_date, status, shift_type)
                 VALUES (?, ?, 'scheduled', ?)`,
                [empId, date, shiftType]
            );
        }

        res.json({ success: true, message: 'Auto-allocation complete!' });
    } catch (err) {
        console.error('Auto-allocation error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});



// employee availability endpoint //
app.post('/api/availability', async (req, res) => {
    const { employeeId, unavailable } = req.body; 

    if (!employeeId || !unavailable || !Array.isArray(unavailable)) {
        return res.status(400).json({ success: false, message: 'Invalid data' });
    }

    try {
        
        await db.query(
            'DELETE FROM employee_availability WHERE employee_id = ?',
            [employeeId]
        );
        
        for (const item of unavailable) {
            await db.query(
                'INSERT INTO employee_availability (employee_id, weekday, unavailable_shift) VALUES (?, ?, ?)',
                [employeeId, item.weekday, item.shift]
            );
        }

        res.json({ success: true, message: 'Unavailable shifts saved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/availability', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT employee_id, weekday, unavailable_shift FROM employee_availability'
        );
        res.json(rows); 
    } catch (err) {
        console.error('Error fetching availability:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});




// employee requests endpoint //
app.post('/api/shift-request', async (req, res) => {
    const { employeeId, shift_date, shift_type, request_type } = req.body;

    if (!employeeId || !shift_date || !shift_type || !request_type) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        await db.query(
            'INSERT INTO shift_change_requests (employee_id, shift_date, shift_type, request_type, status) VALUES (?, ?, ?, ?, ?)',
            [employeeId, shift_date, shift_type, request_type, 'pending']
        );

        res.json({ success: true, message: 'Request submitted successfully' });
    } catch (err) {
        console.error('Shift request error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


app.get('/api/shift-requests', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT r.id, r.employee_id, e.first_name, r.shift_date, r.shift_type, r.request_type, r.status
             FROM shift_change_requests r
             JOIN employees e ON r.employee_id = e.id
             WHERE r.status = 'pending'`
        );
        res.json(rows);
    } catch (err) {
        console.error('Fetch shift requests error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});



// shift request action endpoint //
app.post('/api/shift-request/:id/action', async (req, res) => {
    const { id } = req.params;
    const { action, managerId } = req.body;

    if (!['approved', 'denied'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    try {
        const [result] = await db.query(
            `UPDATE shift_change_requests
             SET status = ?, manager_id = ?
             WHERE id = ?`,
            [action, managerId, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        const [updatedRows] = await db.query(
            `SELECT id, employee_id, shift_date, shift_type, request_type, status
             FROM shift_change_requests
             WHERE id = ?`,
            [id]
        );

        res.json({ success: true, message: `Request ${action}`, updatedRequest: updatedRows[0] });
    } catch (err) {
        console.error('Error updating shift request:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


app.get('/api/employee/shift-requests/:employeeId', async (req, res) => {
    const { employeeId } = req.params;

    try {
        const [rows] = await db.query(
            `SELECT sr.id, sr.shift_date, sr.shift_type, sr.request_type, sr.status
             FROM shift_change_requests sr
             WHERE sr.employee_id = ?`,
            [employeeId]
        );

        res.json({ success: true, requests: rows });
    } catch (err) {
        console.error('Error fetching employee shift requests:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});