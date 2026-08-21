CREATE DATABASE IF NOT EXISTS edutrack_db;
USE edutrack_db;

-- Student academic records — managed only by the admin
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    roll_no VARCHAR(20) UNIQUE NOT NULL,
    course VARCHAR(100),
    admission_grade DECIMAL(6,2),
    attendance_percentage DECIMAL(5,2),
    gpa DECIMAL(4,2),
    units_1st_sem_enrolled INT,
    units_1st_sem_approved INT,
    units_2nd_sem_enrolled INT,
    units_2nd_sem_approved INT,
    scholarship_holder TINYINT(1) DEFAULT 0,
    debtor TINYINT(1) DEFAULT 0,
    tuition_up_to_date TINYINT(1) DEFAULT 1,
    dropout_risk VARCHAR(20) DEFAULT 'Prediction Pending',
    risk_prediction VARCHAR(32) NULL,
    risk_confidence DECIMAL(6,4) NULL,
    risk_probabilities JSON NULL,
    prediction_inputs JSON NULL,
    risk_analyzed_at TIMESTAMP NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Login accounts for both the admin and each student
-- student_id is NULL for the admin account, and links to students.id for student accounts
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student') NOT NULL,
    student_id INT NULL,
    full_name VARCHAR(100) NULL,
    email VARCHAR(100) NULL,
    department VARCHAR(100) NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
