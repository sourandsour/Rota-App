CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) UNIQUE NOT NULL,     
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('employee', 'manager') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  
);

CREATE TABLE employees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    manager_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX idx_employees_manager_id ON employees(manager_id);

CREATE TABLE shifts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    role VARCHAR(100),
    status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);



CREATE TABLE employee_availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    weekday ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun') NOT NULL,
    unavailable_shift ENUM('morning','afternoon','evening') NOT NULL,
    UNIQUE KEY unique_employee_day_shift (employee_id, weekday, unavailable_shift),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);


CREATE TABLE shift_change_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    shift_date DATE NOT NULL,
    shift_type ENUM('morning','afternoon','evening') NOT NULL,
    request_type ENUM('swap','time-off') NOT NULL, 
    status ENUM('pending','approved','denied') DEFAULT 'pending',
    manager_id INT DEFAULT NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL
);



INSERT INTO users (username, password_hash, role)
VALUES
('manager1', 'pass1', 'manager'),
('john_doe', 'pass1', 'employee'),
('emma_smith', 'emma_secure1', 'employee');


INSERT INTO employees (user_id, first_name, last_name, email, phone, manager_id)
VALUES
((SELECT id FROM users WHERE username='manager1'), 'Manager', 'One', 'manager1@example.com', '1234567890', NULL),
((SELECT id FROM users WHERE username='john_doe'), 'John', 'Doe', 'john_doe@example.com', '1112223333', NULL),
((SELECT id FROM users WHERE username='emma_smith'), 'Emma', 'Smith', 'emma_smith@example.com', '4445556666', NULL);