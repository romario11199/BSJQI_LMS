**Project Setup**: BSJQI_LMS

- **Purpose**: Node.js + Express app backed by Microsoft SQL Server (BSJQI_LMS).

**Prerequisites**:
- Install Node.js (v16–18 recommended). Your environment currently runs Node v24; the app should still work but some packages may warn.
- SQL Server must be reachable. This project expects either a named instance or a host+port.

**.env template** (create at project root as `.env`):
```text
DB_SERVER=DESKTOP-P6M5VIB
DB_PORT=1433          # optional — if provided, port takes precedence over named instance
DB_INSTANCE=SQLEXPRESS # optional — used only if DB_PORT is not set
DB_USER=sa
DB_PASSWORD=SpecialProject2025
DB_DATABASE=BSJQI_LMS
PORT=5500
NODE_ENV=development
```

**Run the server (recommended)**
- From project root:
```powershell
# install dependencies (use npm.cmd to avoid PowerShell script policy issues)
npm.cmd install

# start the server
node .\Server.js
```

**Common troubleshooting**
- If `npm` is blocked by PowerShell script policy, use `npm.cmd` as above, or open PowerShell as Administrator and run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`.
- If the app logs `Failed to connect` or `ENOTFOUND` for the DB server:
	- Ensure SQL Server Browser is running (for named instances) or supply `DB_PORT` with the SQL Server static port (1433).
	- Confirm the `DB_USER`/`DB_PASSWORD` by running `sqlcmd`:
		```powershell
		sqlcmd -S "DESKTOP-P6M5VIB,1433" -U sa -P "SpecialProject2025" -Q "SELECT DB_NAME()"
		```

**API test endpoints**
- Test DB connectivity:
```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:5500/api/test' -Method Get
```
- Get courses:
```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:5500/api/courses' -Method Get
```
- Login (POST JSON):
```powershell
$body = @{ email = 'student@example.com'; password = 'theirPassword' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://127.0.0.1:5500/api/login' -Method Post -ContentType 'application/json' -Body $body
```

**Notes**
- `db.js` will prefer `DB_SERVER` + `DB_PORT` when `DB_PORT` is set; otherwise it will attempt to connect using a named instance (`DB_INSTANCE`).
- For production, keep credentials out of source control and use a secure secrets store.

If you want, I can also add a small `npm` script to run the server with `nodemon` for development.
# BSJ, QI   - Learning Management System

The Quality Institute (QI), the training and capacity-building arm of the Bureau of Standards Jamaica (BSJ), delivers a wide range of standards-related, quality management, and technical training programs to stakeholders across various sectors. Currently, many aspects of the training delivery process—including course registration, scheduling, participant management, evaluation, certification, and reporting are handled through manual or semi-manual methods. These processes are time-consuming, prone to errors, and limit the Institute’s ability to scale, automate, and deliver data-driven decision-making insights.

To improve efficiency, enhance the learner’s experience, and strengthen administrative control, the QI requires a modern, integrated Training Management System (TMS). 

## Features

- **User Registration & Login**
- **Course Browsing & Selection**
- **Payment Processing** (simulated)
- **Student Dashboard**
- **Progress Tracking**
- **Responsive Design**

## File Structure
