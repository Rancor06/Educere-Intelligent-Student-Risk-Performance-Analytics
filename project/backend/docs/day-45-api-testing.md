# Day 45 — API Testing with Postman

Testing the Day 41–44 Student Management API (`React → Flask → MySQL`)
independently in Postman, covering the happy path, invalid input, duplicate
data, and invalid requests.

Collection: `Student Management API.postman_collection.json` (imported into
Postman, base URL `http://127.0.0.1:5000`).

## Expected status codes

| Scenario | Expected Status | Why |
|---|---|---|
| Successful GET | 200 | Request succeeded, resource returned |
| Successful POST | 201 | New resource (student) created |
| Invalid input (validation failure) | 400 | Client sent a bad request — server can't process as-is |
| Duplicate email | 500 | MySQL `UNIQUE` constraint (errno 1062) violation caught and reported as a database-save failure |
| Invalid endpoint | 404 | Route doesn't exist |
| Unsupported method | 405 | Route exists, method isn't allowed on it |
| Server/DB error | 500 | Unexpected failure on the server side |

## Test cases

| # | Test | Endpoint | Method | Request Body | Expected Result | Actual Result | Status Code | Test Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Get all students | `/api/students` | GET | — | JSON array of students from MySQL | | 200 | |
| 2 | Create valid student | `/api/students` | POST | `{"name":"Test Student","email":"test@example.com","course":"Computer Science"}` | Student created, JSON response with new id; row exists in MySQL | | 201 | |
| 3 | Empty name | `/api/students` | POST | `{"name":"","email":"test2@example.com","course":"IT"}` | Rejected — validation error | | 400 | |
| 4 | Missing email | `/api/students` | POST | `{"name":"Test Student","course":"IT"}` | Rejected — validation error | | 400 | |
| 5 | Missing course | `/api/students` | POST | `{"name":"Test Student","email":"test3@example.com"}` | Rejected — validation error | | 400 | |
| 6 | Empty JSON body | `/api/students` | POST | `{}` | Rejected — validation error | | 400 | |
| 7 | No request body | `/api/students` | POST | *(none)* | Rejected — validation error, no crash | | 400 | |
| 8 | Duplicate email | `/api/students` | POST | `{"name":"Another Student","email":"test@example.com","course":"IT"}` (email from test 2) | Rejected, no duplicate row created | | 500 | |
| 9 | Invalid endpoint | `/api/student` | GET | — | JSON 404, not HTML | | 404 | |
| 10 | Unsupported method | `/api/students` | DELETE | — | JSON 405, not HTML | | 405 | |

*(Fill in "Actual Result" and "Test Status" (Pass/Fail) after running each
request in Postman. Add "Status Code" only if it differs from Expected.)*

## MySQL verification

After test #2 (valid POST), confirm the row actually exists:

```sql
SELECT * FROM students WHERE email = 'test@example.com';
```

After test #8 (duplicate email), confirm **no second row** was inserted:

```sql
SELECT COUNT(*) FROM students WHERE email = 'test@example.com';
-- should return 1, not 2
```

## Postman screenshots

*(Insert screenshots of requests 1, 2, 3–7 combined, 8, 9, and 10 here.)*

## Consistency check — Postman vs React app

| Action | Postman result | React app result | Consistent? |
|---|---|---|---|
| GET /api/students | 200, JSON array | Student directory renders the same list | |
| POST /api/students (valid) | 201, student created | Form submits, new student appears in directory | |

## Notes

- Duplicate-email protection relies on the `email` column's `UNIQUE`
  constraint (added in `migration_day44_unique_email.sql`) plus the
  `errno == 1062` check in `create_student()` — the API layer doesn't
  duplicate that validation, it lets MySQL be the source of truth and
  translates the DB error into a clean message.
- `404`/`405` previously returned Flask's default HTML error pages; added
  `@app.errorhandler` handlers for `404`, `405`, and `500` so every response
  from this API — success or failure — is JSON.
