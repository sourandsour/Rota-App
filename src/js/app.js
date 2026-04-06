fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        username: 'john_doe',
        password: 'john_pass123'
    })
})
.then(response => response.json())
.then(data => {
    console.log(data);
})
.catch(error => {
    console.error('Error:', error);
});


// login form handling //

document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
    .then(response => response.json())

    .then(data => {
    if (data.success) {
        // Hide login screen
        document.getElementById('login-screen').style.display = 'none';

        // Check role and display the correct dashboard
        if (data.user.role === 'manager') {
            document.getElementById('manager-dashboard').style.display = 'block';
        } else if (data.user.role === 'employee') {
            document.getElementById('employee-dashboard').style.display = 'block';
        }
    } else {
        alert('Login failed: ' + (data.message || 'Invalid credentials'));
    }
})
.catch(error => {
    console.error('Error:', error);
});
});