-- Run once against existing edutrack_db installations before deploying the
-- connected student-intelligence workflow.
USE edutrack_db;

ALTER TABLE students
    ADD COLUMN risk_prediction VARCHAR(32) NULL AFTER dropout_risk,
    ADD COLUMN risk_confidence DECIMAL(6,4) NULL AFTER risk_prediction,
    ADD COLUMN risk_probabilities JSON NULL AFTER risk_confidence,
    ADD COLUMN prediction_inputs JSON NULL AFTER risk_probabilities,
    ADD COLUMN risk_analyzed_at TIMESTAMP NULL AFTER prediction_inputs;
