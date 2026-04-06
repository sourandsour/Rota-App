// server connection //

const express = require('express');
const mysql2 = require('mysql2');
const cors = require('cors');
const PORT = 3000; 
const app = express();
app.use(cors());
app.use(express.json());

const db = mysql2.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'soup',
    database: 'myrotaapp'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to database');
});     


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});



// API endpoints //

// log in endpoint //
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM users WHERE username = ? AND password_hash = ?';

    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        if (results.length > 0) {
            // send success + user data
            const user = results[0];
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    }); 
});