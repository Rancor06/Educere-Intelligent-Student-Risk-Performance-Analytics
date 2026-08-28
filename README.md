# Educere -- Intelligent Student Risk & Performance Analytics

> A full-stack AI-powered student management and academic risk analytics
> platform built with React, Flask, MySQL, and a Decision Tree machine
> learning model.

## Overview

**Educere** is a full-stack student analytics application that combines
student management, role-based access, academic data, and
machine-learning-based risk prediction in a single web platform.

The system allows administrators to manage student records, run risk
predictions using academic and demographic inputs, review prediction
probabilities and confidence, and re-run predictions for existing
students when their circumstances change.

The application is designed as a complete
frontend-to-backend-to-database-to-ML workflow rather than as an
isolated machine-learning demonstration.

## Key Features

### Student Management

-   Create, view, update, and delete student records
-   Maintain academic and personal student information
-   Store prediction inputs alongside student records
-   Add and update student notes
-   View detailed student information

### AI-Powered Risk Prediction

-   Integrated trained Decision Tree classifier
-   Prediction classes:
    -   **Dropout**
    -   **Enrolled**
    -   **Graduate**
-   Returns:
    -   Prediction label
    -   Model confidence
    -   Class probabilities
    -   Dropout probability
-   Supports prediction for new students
-   Supports re-running predictions for existing students after updating
    their inputs

### Dashboard & Analytics

-   Student dashboard
-   Student intelligence views
-   Risk analysis
-   Reports
-   Model information and feature-importance data

### Authentication & Access Control

-   Login/logout functionality
-   Session-based authentication
-   Separate administrator and student access controls
-   Protected administrative endpoints
-   Secure production Flask session configuration

### API Integration

-   REST API architecture
-   React frontend communicates with Flask through HTTP requests
-   Backend communicates with MySQL
-   ML inference is handled server-side
-   Validation and error responses are returned through the API

### Production Security

-   Environment-variable-based configuration
-   Production `FLASK_SECRET_KEY` requirement
-   Restricted production CORS origins
-   Secure session cookies
-   Database credentials kept outside source code
-   Input validation for ML prediction requests

## System Architecture

``` text
                         USER
                           |
                           v
                +----------------------+
                | React / Vite Frontend|
                |      Vercel          |
                +----------+-----------+
                           |
                     HTTPS REST API
                           |
                           v
                +----------------------+
                |    Flask Backend     |
                |   REST API / Auth    |
                |      Render          |
                +----------+-----------+
                           |
                  +--------+--------+
                  |                 |
                  v                 v
          +---------------+ +---------------+
          |     MySQL     | |  ML Model     |
          |    Database   | | Decision Tree |
          +---------------+ +---------------+
```

## Technology Stack

  Layer                 Technology
  --------------------- ------------------------
  Frontend              React 19
  Frontend Build Tool   Vite 8
  Routing               React Router
  Backend               Python / Flask
  API                   REST / JSON
  Authentication        Flask Sessions
  Database              MySQL
  Database Driver       mysql-connector-python
  ML                    scikit-learn
  Data Processing       pandas, NumPy
  Model                 DecisionTreeClassifier
  Production Server     Gunicorn
  Frontend Hosting      Vercel
  Backend Hosting       Render
  Source Control        Git / GitHub

## Machine Learning Model

The prediction system uses a **Decision Tree Classifier** trained on the
UCI *Predict Students' Dropout and Academic Success* dataset.

The model was trained using the project's 36 feature inputs and uses:

``` text
DecisionTreeClassifier(
    max_depth=8,
    class_weight="balanced",
    random_state=42
)
```

The model predicts one of three outcomes:

``` text
Dropout
Enrolled
Graduate
```

### Prediction Output

The API returns a structure containing:

``` json
{
  "prediction": "Graduate",
  "confidence": 0.8618,
  "probabilities": {
    "Dropout": 0.1188,
    "Enrolled": 0.0193,
    "Graduate": 0.8618
  }
}
```

`confidence` represents the probability of the predicted class.

`probabilities.Dropout` represents the model's estimated probability for
the Dropout class.

The application keeps the human-readable prediction label separate from
the numerical dropout probability so that the two values are not
confused when displayed or persisted.

## Prediction Workflow

``` text
Student Information
        |
        v
React Prediction Form
        |
        v
Flask Prediction API
        |
        v
Input Validation
        |
        v
Feature Ordering / Preparation
        |
        v
Decision Tree Model
        |
        +-------------------------+
        |           |             |
        v           v             v
    Prediction   Confidence   Probabilities
        |
        v
Database / Frontend
```

## Existing Student Re-Prediction

Educere supports updating the model inputs of an existing student and
generating a new prediction.

``` text
Existing Student
       |
       v
Edit Student
       |
       v
Update Prediction Inputs
       |
       v
Run ML Prediction
       |
       v
Updated Risk Result
       |
       v
Persist Result
```

This allows the student's risk assessment to change when relevant
circumstances or academic information changes.

## API Overview

### Public / General

  Endpoint            Method   Purpose
  ------------------- -------- --------------------------------
  `/`                 GET      Backend health/status response
  `/api/students`     GET      Retrieve student records
  `/api/students`     POST     Create a student
  `/login`            POST     Authenticate a user
  `/logout`           POST     End the current session
  `/api/predict`      POST     Generate an ML prediction
  `/api/model-info`   GET      Retrieve model information

### Authenticated

  --------------------------------------------------------------------------------
  Endpoint                         Method                  Purpose
  -------------------------------- ----------------------- -----------------------
  `/profile`                       GET                     Retrieve authenticated
                                                           profile

  `/profile`                       PUT                     Update authenticated
                                                           profile

  `/admin/students`                GET                     Retrieve administrative
                                                           student records

  `/admin/students/<id>`           GET                     Retrieve a specific
                                                           student

  `/admin/students`                POST                    Create a student with
                                                           prediction support

  `/admin/students/<id>`           PUT                     Update a student and
                                                           optionally re-run
                                                           prediction

  `/admin/students/<id>`           DELETE                  Delete a student

  `/admin/students/<id>/notes`     PUT                     Update student notes

  `/admin/students/<id>/predict`   POST                    Re-run prediction using
                                                           stored prediction
                                                           inputs

  `/student/dashboard`             GET                     Retrieve student
                                                           dashboard information
  --------------------------------------------------------------------------------

## Project Structure

``` text
Educere/
├── backend/
│   ├── app.py
│   ├── db.py
│   ├── ml_predictor.py
│   ├── requirements.txt
│   ├── Procfile
│   ├── schema.sql
│   ├── full_setup.sql
│   ├── seed_data.sql
│   ├── seed_students.py
│   ├── migration_day42_add_email.sql
│   ├── migration_day44_unique_email.sql
│   ├── migration_day49_student_risk_analysis.sql
│   ├── Student Management API.postman_collection.json
│   ├── .env.example
│   └── ml/
│       ├── model.py
│       ├── train_model.py
│       ├── dropout_model.pkl
│       └── __init__.py
│
├── Frontend/
│   └── innolift/
│       ├── src/
│       │   ├── components/
│       │   ├── layout/
│       │   ├── pages/
│       │   ├── App.jsx
│       │   ├── StudentForm.jsx
│       │   ├── PredictionForm.jsx
│       │   ├── QuickRiskCheck.jsx
│       │   ├── StudentRiskCard.jsx
│       │   ├── StudentDirectory.jsx
│       │   ├── apiBase.js
│       │   ├── datasetCodes.js
│       │   └── riskLabel.js
│       ├── public/
│       ├── package.json
│       ├── vite.config.js
│       ├── .env.production
│       └── index.html
│
└── README.md
```

## Local Development Setup

### Prerequisites

Install the following:

-   Python 3.x
-   Node.js and npm
-   MySQL Server
-   Git

### 1. Clone the Repository

``` bash
git clone <your-github-repository-url>
cd Educere
```

### 2. Configure the Backend

``` bash
cd backend
```

Create a local `.env` file based on `.env.example`.

Example:

``` env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=defaultdb

FLASK_SECRET_KEY=your_local_secret_key

CORS_ALLOWED_ORIGINS=http://localhost:5173

FLASK_DEBUG=1
```

Do not commit the real `.env` file.

### 3. Install Backend Dependencies

``` bash
pip install -r requirements.txt
```

### 4. Configure MySQL

Create/configure the required database and tables using the SQL files
provided in the backend directory.

For a new local setup, use the appropriate schema/setup SQL file first
and then apply migrations when required.

**Do not blindly execute setup/reset SQL against an existing production
database.**

### 5. Run the Flask Backend

For local development:

``` bash
python app.py
```

The backend should then be available through the configured local Flask
port.

For production-style execution:

``` bash
gunicorn app:app --bind 0.0.0.0:$PORT
```

### 6. Configure the Frontend

``` bash
cd Frontend/innolift
npm install
```

Set the API base URL through the appropriate Vite environment
configuration.

Example:

``` env
VITE_API_BASE_URL=http://127.0.0.1:5000
```

### 7. Run the Frontend

``` bash
npm run dev
```

The Vite development server will provide the local frontend URL shown in
the terminal.

## Production Deployment

The deployed architecture uses:

``` text
React / Vite
      |
    Vercel
      |
      v
Flask REST API
      |
    Render
      |
  +---+---+
  |       |
 MySQL   ML Model
```

### Frontend

The React/Vite application can be deployed through Vercel.

Configure:

``` env
VITE_API_BASE_URL=<deployed-backend-url>
```

### Backend

The Flask backend is configured for Gunicorn:

``` bash
gunicorn app:app --bind 0.0.0.0:$PORT
```

The `Procfile` provides the production start command for supported
hosting environments.

### Production Environment Variables

The backend requires appropriate production values for:

``` env
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=

FLASK_SECRET_KEY=

CORS_ALLOWED_ORIGINS=

FLASK_DEBUG=0
```

When `FLASK_DEBUG=0`, the application requires both `FLASK_SECRET_KEY`
and `CORS_ALLOWED_ORIGINS` and refuses to start if they are missing.

## Security Considerations

Educere follows several basic production security practices:

-   Secrets are supplied through environment variables
-   Real `.env` files are excluded from source control
-   Production Flask sessions use secure cookie settings
-   CORS is restricted to configured origins
-   Administrative endpoints require authentication
-   Role-based checks distinguish administrator and student access
-   Prediction inputs are validated before model inference
-   Database credentials are kept on the backend
-   The frontend never connects directly to MySQL
-   HTTPS should be used for deployed frontend/backend communication

## Testing

The project includes a Postman collection for API testing:

``` text
backend/Student Management API.postman_collection.json
```

Recommended validation includes:

-   Frontend application loading
-   Student retrieval
-   Student creation
-   Student updates
-   ML prediction requests
-   Existing-student re-prediction
-   Authentication
-   Invalid-input handling
-   Database persistence
-   Production API communication

Frontend production build:

``` bash
npm run build
```

Linting:

``` bash
npm run lint
```

## Database

The backend includes database setup and migration resources:

``` text
schema.sql
full_setup.sql
migration_day42_add_email.sql
migration_day44_unique_email.sql
migration_day49_student_risk_analysis.sql
seed_data.sql
seed_students.py
```

These files support database initialization, schema evolution, and
development/demo data population.

When working with an existing production database, migrations should be
applied deliberately and backups should be maintained before destructive
operations.

## Deployment URLs

### Frontend

``` text
https://educere-intelligent-student-risk-pe.vercel.app/
```

### Backend

``` text
https://educere-bzoh.onrender.com
```

## Future Improvements

Potential future improvements include:

-   Automated CI/CD testing
-   More comprehensive monitoring and logging
-   Database backup automation
-   Advanced model explainability
-   More granular per-student prediction explanations
-   Model versioning and retraining workflows
-   Expanded analytics and reporting
-   Stronger production authentication mechanisms
-   Scalable managed database infrastructure
-   Automated model performance monitoring

## Project Goals

Educere was developed to demonstrate the integration of:

``` text
Frontend Development
        +
Backend API Development
        +
Database Management
        +
Machine Learning
        +
Authentication
        +
Cloud Deployment
        =
Complete Full-Stack AI Application
```

The project demonstrates how a machine-learning model can be integrated
into a practical web application rather than being used only as an
isolated notebook experiment.

## Author

**Salman Maricar**

### Project

**Educere -- Intelligent Student Risk & Performance Analytics**

Built as part of the **Innolift Ventures Full Stack AI Developer
Program**.

## License

This project was developed as an educational/internship project. Add an
appropriate open-source license if the repository is intended for public
reuse.
