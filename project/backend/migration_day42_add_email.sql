-- Day 42 migration: add an email column to students.
-- Run this once in MySQL Workbench or the mysql CLI before testing the
-- new POST /api/students endpoint.

ALTER TABLE students ADD COLUMN email VARCHAR(150) NULL AFTER roll_no;
