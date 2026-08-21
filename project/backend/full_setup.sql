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
USE edutrack_db;
-- Admin account
INSERT INTO users (username, password_hash, role, student_id, full_name, email, department) VALUES ('admin', 'scrypt:32768:8:1$ShulrYgrek6XJ1M8$63c0a36d6f69ae761e0ab7d6d35e1fa8b549598c92228a084318e2749e52d461ce666bc41132969e2f21ca134e9ec346f40752b56c38ce4ece26ee9cff9bdd11', 'admin', NULL, 'Ms. Rao', 'rao@crescent.edu', 'Computer Science');

-- Students (sampled from the real UCI dropout dataset)
INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Kavya Rao', 'STU-20261001', 'Management (evening)', 120.0, 70.0, 5.4, 5, 5, 5, 2, 0, 0, 0, 'At risk');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261001', 'scrypt:32768:8:1$0PMf42iOsoAnogwX$c228755d94b96778f7e4ea3f0cf79538c0069d596956102c4271fc88395312b6ac903f9e62efc8d64603467ee8c5cd466bee37948cda83b2d599f8abf6b38ed2', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Diya Verma', 'STU-20261002', 'Social Service', 116.5, 75.0, 5.6, 6, 5, 6, 4, 1, 0, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261002', 'scrypt:32768:8:1$Jja3QeJoZ1S3eeJE$9aaa4af76df2f5af871767f93d6438a1987191ff12cd25e9c0aeb8e08c5e25bedf99af31ed1046253e719c80ace538725b591797d7fe744a5c27f7f91b130324', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Shreya Verma', 'STU-20261003', 'Informatics Engineering', 95.1, 0.0, 0.0, 5, 0, 5, 0, 0, 0, 0, 'At risk');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261003', 'scrypt:32768:8:1$dJAhCI59QaFThlO0$8fe391226396d4b62ab4b75ae499bae477110b013d4d60bf8a951b276c7b64420d5632c2282e204ef42eca95235e7d031da74d861f9a3fc349b3b62f83fbda0e', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Nisha Nair', 'STU-20261004', 'Social Service (evening)', 120.5, 100.0, 7.25, 6, 6, 6, 6, 0, 0, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261004', 'scrypt:32768:8:1$SgypaGA7Vq0AwJNq$c58351f2b9c6815a7cf9b0371b56fe2ffb2380fad73dc6fefc16edc30e9e7a5bfa51f97483afa63a2c1fe907477bfefcbd5deae124a8fbb4a4ac88329486abeb', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Divya Pillai', 'STU-20261005', 'Nursing', 120.0, 0.0, 0.0, 7, 0, 7, 0, 0, 1, 0, 'At risk');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261005', 'scrypt:32768:8:1$m3FJJRVVOp1HGSO5$fe8b4d839e8f2c3406893b3bdaa77eb24950aeb28bf11be6a636675e44294f8fa59a2c05d18c8c8d64f2c4914c015de6f622d8d0887cc57007b74df7b8f1a1c3', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Tanvi Singh', 'STU-20261006', 'Basic Education', 154.1, 100.0, 6.48, 6, 6, 6, 6, 1, 1, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261006', 'scrypt:32768:8:1$uz6y9yOuNnQ8C31h$be2ede4f370bc394c0a253b2d739e702c70c56d962b6ec982771108b437e8f942a0d153a786dd553bd7227d8db7724297d72952e68ce6515752426b1d23c98bc', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Anjali Kapoor', 'STU-20261007', 'Management', 114.5, 100.0, 6.55, 5, 5, 5, 5, 0, 0, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261007', 'scrypt:32768:8:1$bUfXMITbpQTN3ih7$f6de3a7177f39a794abc852addff42be1d7b1515d51c24690b65d70cc41bfd55c0cab2beafca515614f0a01d48ca1ee592a9ff1671e98c8936609de040bbe3b4', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Kritika Rao', 'STU-20261008', 'Veterinary Nursing', 110.3, 90.0, 6.28, 5, 4, 5, 5, 0, 0, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261008', 'scrypt:32768:8:1$K0FaSJEgt72IZntJ$5428c813db503961c709747a73d89816f6feda0dfb41644f0bd6b9184dd98da3d691fc6dc8bfa770b0a9c713d365200a60ffe28963843680377b4495f841395e', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Kavya Bose', 'STU-20261009', 'Social Service', 140.0, 96.0, 6.52, 14, 13, 11, 11, 0, 0, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261009', 'scrypt:32768:8:1$wH7zXkqxEevR57R6$73001f6d7567b85ecb4df01eb10470ebe8f22598a06490502e732bc9daf9f03552f33bb07b1cc99df488941d4c18f3bf2beff7dde735eb506cacd6b6f92c341b', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Arjun Krishnan', 'STU-20261010', 'Tourism', 137.0, 91.7, 5.44, 6, 6, 6, 5, 1, 0, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261010', 'scrypt:32768:8:1$WfkanfEYMVrsm3rR$fa22fc2d499f2d92536a693a59d1d972db7a6ebb912ac50e751c7f1e46712f337117722e7526f0d0077530e522da1ed0d2c74841957cb7f8c58a9176cc5dc37e', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Yash Verma', 'STU-20261011', 'Management', 117.9, 95.0, 6.32, 10, 9, 10, 10, 1, 0, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261011', 'scrypt:32768:8:1$mcReZQFK1bCIR6qx$32f24b3b5c4479c4b8acbd7ae225e8e417fcaab82df2ed5481334a081e9355fd09de34b16745261eeac4185bbc1da369b4490017052c30fea0ec76f925703bd7', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Siddharth Varma', 'STU-20261012', 'Management (evening)', 100.0, 100.0, 6.23, 9, 9, 7, 7, 0, 0, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261012', 'scrypt:32768:8:1$5sdMV9T6X85xTnnv$20b98835b2ed142f3a56960f09a283c63a776f6e6c2523fa88f168d95282a16bfa71b589e6ef16282a8cbffdbb00d56acddb3a20a11a6d27e0cb04b9c007d163', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Manish Menon', 'STU-20261013', 'Management', 138.7, 0.0, 0.0, 5, 0, 5, 0, 0, 0, 1, 'At risk');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261013', 'scrypt:32768:8:1$KYZtXyiN8ZX1tpn9$521c817ae41f999b45583db6e3957573887e026212216b2a7a1570791b0b0d8ceef968ff13226595aa0b8ebc93ce0438e1ed631001bb1480ffe2e8500a2a43b0', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Meera Kulkarni', 'STU-20261014', 'Social Service', 145.6, 100.0, 6.88, 6, 6, 6, 6, 1, 0, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261014', 'scrypt:32768:8:1$Da2uGg25qdcxDNd9$80336939122d299b1a2d1557d18dbfaa1700f5626978255307156a3778bc9d61b89efbc2bb33b4dd749e72dbfb37b73dbf90edd8ae6485a038844ec87e399948', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Suresh Das', 'STU-20261015', 'Social Service', 124.2, 66.7, 5.66, 6, 4, 6, 4, 1, 0, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261015', 'scrypt:32768:8:1$IHq9eG10cOV2lzrv$a992506e67b23505bfbddea2ec2cb4c805b2963d881165be8ed3d1c7ec52d3e25930c7a9a114f74414cca22bcfc4ad444ab21c84f6087503d40277bbf1d2fbe8', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Kavya Kulkarni', 'STU-20261016', 'Social Service (evening)', 100.0, 8.3, 2.5, 6, 1, 6, 0, 0, 0, 1, 'At risk');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261016', 'scrypt:32768:8:1$EKci8UyUSCxk1lum$31872a60141d62b8b8b306dbebff48e3ef2757ddcacf6c91303bac1478046a8d8018ca916acdd5d71d000269c6fcb7603f1e9e0d77b86e75a6d13d5dcf93eeb9', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Shreya Kapoor', 'STU-20261017', 'Advertising and Marketing Management', 137.9, 70.0, 6.19, 5, 3, 5, 4, 0, 0, 0, 'At risk');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261017', 'scrypt:32768:8:1$LlZpAqZwHpR7lcgF$6e8c60cb801fcc7af00dd919975767c521621c796f54952078c23d9d04461ad1a6961c1dc6677b471d1fe3a66c24b004bc43f3b569b3df503ecea35ee639a0f2', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Aditya Nair', 'STU-20261018', 'Journalism and Communication', 146.5, 100.0, 6.73, 6, 6, 6, 6, 1, 0, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261018', 'scrypt:32768:8:1$3WvgLUE3FUQaJWMM$666c93aece9a1133cec5cdbcfd05df5566eb41587a5d174a5e0c254f9fe83c7b5ca448255a04d5a78aa1dd810a18817dfdbbbbf1ca74416db23ad57d443a7023', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Karan Verma', 'STU-20261019', 'Management (evening)', 130.0, 0.0, 0.0, 5, 0, 5, 0, 0, 0, 1, 'At risk');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261019', 'scrypt:32768:8:1$gXP6Wjk2VSn5Q8Gi$dc820e9d9ec94c9872d423346a49df104497dfb524cf2faebd190b25ffd599475c956b5054c8a2738a8910729589a7ebf266aabcf20c314c89ab5d7f857af058', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Priya Verma', 'STU-20261020', 'Basic Education', 113.9, 100.0, 6.17, 6, 6, 6, 6, 1, 0, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261020', 'scrypt:32768:8:1$TgYe0Oy4YS2432JE$9dc8532d733d4690d82c2a416b7247866d8440038736c507fa5496155ed468f3882b6b1e427a0afd6a3bf4e2b5ac9eac8fd320ef5516ffd7c6e3a7ed11a7355a', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Neha Varma', 'STU-20261021', 'Communication Design', 136.6, 66.7, 5.6, 6, 5, 6, 3, 0, 0, 1, 'Watch');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261021', 'scrypt:32768:8:1$BPIvf9wRPqraQm0x$402175079a2b6322f391062d20f04f2f2d7aca61abbdb7308fe8ce250807d6279457479148d4e326968a49a4d37452868694d98c1b927304f7a7fef2fe1949d1', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Riya Nair', 'STU-20261022', 'Equinculture', 159.3, 100.0, 7.63, 5, 5, 5, 5, 0, 0, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261022', 'scrypt:32768:8:1$tuRHPiFtpOO4oDyc$b133e0b51e2038a60469b7f78c1cda6bab857c04ab4f26903a7d7e1c21f736005271ce847fed1226abef5a0bd4333638bb5ed400083c562ddb19b008f3795b7e', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Nisha Sharma', 'STU-20261023', 'Management', 132.3, 100.0, 6.4, 5, 5, 5, 5, 1, 0, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261023', 'scrypt:32768:8:1$yLlEmudLDdcAsAGs$b6bf65257b681c47489d41deea4f811dd1cf770c0ef8d87a9bfe8aab6b9a488aad2238f4f686269b2d449acd4701f28420b0357675b878cfb8180d6f3ceb4c07', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Anjali Kulkarni', 'STU-20261024', 'Veterinary Nursing', 120.0, 36.8, 5.79, 10, 4, 9, 3, 0, 0, 1, 'At risk');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261024', 'scrypt:32768:8:1$2Eek91tEIormLKSD$d9cd9e9a10b1f5876c5ff57fbdaeab64024ff23c271acf56b7f3149537d7074678a8761fcec3d99d9dff8e2719713e8028fb23c1a5c2bb4306343fa0a904c54f', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Priya Singh', 'STU-20261025', 'Advertising and Marketing Management', 111.3, 70.0, 5.58, 5, 3, 5, 4, 0, 0, 1, 'Watch');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261025', 'scrypt:32768:8:1$hzR4nzr4OgQtPUc4$4980ba36f6865d0805b2a2a3d42d81ff748f94574422581ff553ff45e3112df6625dcbb8bb11d1997b3982c46931afe3f225c19f5eaeae9bf5b62d2427b70c98', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Kritika Bose', 'STU-20261026', 'Social Service (evening)', 139.0, 100.0, 6.65, 6, 6, 6, 6, 0, 0, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261026', 'scrypt:32768:8:1$tw33newC4FacjIfo$ae64caccf3517e873fd49ebdafab83f247edf31685adca9540a42ef2462668e60ce5e94cdc2bab54fffe0805d9de307c6fcdeb9c5387cf332d2380d94729074b', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Rohan Gupta', 'STU-20261027', 'Basic Education', 120.3, 0.0, 0.0, 7, 0, 6, 0, 0, 0, 1, 'At risk');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261027', 'scrypt:32768:8:1$VkwNuedcy8s1Om1B$c76599ac662e4b7460eb44e25d707f69f2b97dec36f53706727aa320ec16bf4287da4499a7f49583aa542daefddd01a5450e9733295e53ef465bfed478e83abd', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Nikhil Pillai', 'STU-20261028', 'Management', 140.0, 70.0, 5.44, 5, 3, 5, 4, 0, 1, 1, 'On track');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261028', 'scrypt:32768:8:1$7ypnwY0ZWCsdDsrQ$37f112095ecef8313e97a153de51b778545539bc5aecbc301f8ef384ab6b4ec227caa3f06f587436abad87940d94697db02f794e2f1adbc4657e06a80df74701', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Rohan Pillai', 'STU-20261029', 'Veterinary Nursing', 110.0, 0.0, 0.0, 6, 0, 6, 0, 0, 0, 1, 'At risk');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261029', 'scrypt:32768:8:1$LYQBCeRBFh0ohTMy$798914673fdfbaca79b025e510b75829765c39a8633d1b6740882971f66f091c974d2f539b152e44334f7468199747570210215018460998ca8260bfee96d5f7', 'student', LAST_INSERT_ID());

INSERT INTO students (name, roll_no, course, admission_grade, attendance_percentage, gpa, units_1st_sem_enrolled, units_1st_sem_approved, units_2nd_sem_enrolled, units_2nd_sem_approved, scholarship_holder, debtor, tuition_up_to_date, dropout_risk) VALUES ('Divya Gupta', 'STU-20261030', 'Oral Hygiene', 126.6, 50.0, 6.48, 7, 5, 7, 2, 0, 0, 1, 'Watch');
INSERT INTO users (username, password_hash, role, student_id) VALUES ('stu-20261030', 'scrypt:32768:8:1$ejYlfCLlQg6MQare$25e0bd5e3848d1b5a843284e6f90c77f3d5e280ef52d943e2e1915ba1a45eb6d4962101aa4778d27eeaa7dc0f8f273113ab38d479919b215ce323a36868be311', 'student', LAST_INSERT_ID());

