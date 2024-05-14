# Attandance Management system

This is a web-based Attendance Management System built using Node.js, Express, PostgreSQL, and EJS. The system allows for user registration, login, profile picture updates, attendance marking, and leave management.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Dependencies](#dependencies)
- [Scripts](#scripts)
- [License](#license)

## Features

- User registration with profile picture upload
- User login with role-based redirection (admin and user)
- Admin dashboard for managing users and viewing attendance records
- Attendance marking and viewing for users
- Leave application and decision management by admin
- Attendance records filtering by date range

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/attendance-management-system.git
    cd attendance-management-system
    ```

2. Install the dependencies:
    ```bash
    npm install
    ```

3. Set up your PostgreSQL database:
    - Create a database named `Attendance Management System`.
    - Update the database connection configuration in `index.js` with your PostgreSQL credentials.

4. Start the server:
    ```bash
    npm start
    ```

5. Open your browser and navigate to `http://localhost:3000`.

## Usage

- **Registration**: Navigate to `/registration` to create a new user account.
- **Login**: Navigate to `/login` to log in with your credentials.
- **Admin Dashboard**: Admin users can view and manage attendance records and leave applications.
- **User Dashboard**: Regular users can view their attendance records and apply for leave.

## Project Structure

attendance-management-system/
│
├── public/
│ └── images/
│ └── (uploaded profile pictures)
│
├── views/
│ ├── admin.ejs
│ ├── login.ejs
│ ├── registration.ejs
│ └── user.ejs
│
├── index.js
├── package.json
└── package-lock.json


## Dependencies

- [express](https://www.npmjs.com/package/express): Fast, unopinionated, minimalist web framework for Node.js
- [body-parser](https://www.npmjs.com/package/body-parser): Node.js body parsing middleware
- [pg](https://www.npmjs.com/package/pg): PostgreSQL client for Node.js
- [ejs](https://www.npmjs.com/package/ejs): Embedded JavaScript templates
- [multer](https://www.npmjs.com/package/multer): Middleware for handling `multipart/form-data`, which is primarily used for uploading files

## Scripts

- `start`: Starts the server using `node index.js`.

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.
