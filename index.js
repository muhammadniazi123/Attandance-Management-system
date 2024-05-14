import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import multer from "multer";

const app = express();
const port = 3000;
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Attendance Management System",
  password: "niazi123",
  port: 5432,
});

db.connect();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/public", express.static("public"));

let users = [];

function date() {
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, "0");
  var mm = String(today.getMonth() + 1).padStart(2, "0");
  var yyyy = today.getFullYear();
  today = mm + "/" + dd + "/" + yyyy;
  return today;
}
// configuration for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// Routes
app.get("/", async (req, res) => {
  res.redirect("/login");
});

app.get("/login", async (req, res) => {
  const query = "SELECT * FROM users";
  const data = await db.query(query);
  users = data.rows;
  res.render("login.ejs", { users });
});

app.get("/registration", async (req, res) => {
  res.render("registration.ejs", { error: null });
});

// POST route for registration and file upload
app.post("/register", upload.single("file"), (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const profileImg = req.file
    ? `/public/images/${req.file.originalname}`
    : "/public/images/default pic 1.jpg";
  db.query(
    "INSERT INTO users (username, password, profile_img) VALUES ($1, $2, $3)",
    [username, password, profileImg],
    (err) => {
      if (err) {
        console.error("Error registering user:", err);
        return res.render("registration.ejs", {
          error: "Failed to register. Please try again.",
        });
      }
      res.redirect("/login");
    }
  );
});

// POST route for updating profile picture
app.post("/updateProfilePic", upload.single("profilePic"), async (req, res) => {
  const profileImg = req.file
    ? `/public/images/${req.file.originalname}`
    : "/public/images/default pic 1.jpg";
  const username = req.query.username;
  try {
    await db.query("UPDATE users SET profile_img = $1 WHERE username = $2", [
      profileImg,
      username,
    ]);
    res.json({ profile_img: profileImg });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res
      .status(500)
      .json({ error: "Failed to update profile picture. Please try again." });
  }
});

// POST route for login
app.post("/login", async (req, res) => {
  const query = "SELECT * FROM users";
  const data = await db.query(query);
  const users = data.rows;
  const username = req.body.username;
  const password = req.body.password;
  for (let i = 0; i < users.length; i++) {
    if (username === users[i].username && password === users[i].password) {
      if (username === "admin") {
        return res.redirect(`/admin?username=${username}`);
      } else {
        return res.redirect(`/user?username=${username}`);
      }
    }
  }
  return res.redirect("/login?error=auth");
});
// Get route for admin account
app.get("/admin", async (req, res) => {
    try {
      const username = req.query.username;
      const currentdate = date();
      const error = req.query.error || null;
      const userData = await db.query("SELECT * FROM users WHERE username = $1", [
        username,
      ]);
      const response = await db.query("SELECT * FROM leave_applications ");
      
      // Retrieve the searched attendance records from query parameters
      const searchrecord = JSON.parse(req.query.attendanceRecords || "[]");
      const fromDate = req.query.fromDate || '';
      const toDate = req.query.toDate || '';
      
      // Fetching attendance record of all employees
      const employeenames = await db.query(
        "SELECT username FROM users WHERE user_type = $1;",
        ["employee"]
      );
      const employeenamesList = employeenames.rows.map((user) => user.username);
      const placeholders = employeenamesList.map((_, index) => `$${index + 1}`).join(", ");
  
      // Query the attendance records
      const attendanceRecordresponse = await db.query(
        `SELECT 
          username, 
          COUNT(DISTINCT attendance_date) AS total_days_worked, 
          SUM(CASE WHEN leave_status THEN 1 ELSE 0 END) AS total_leave,
          SUM(CASE WHEN absent_status THEN 1 ELSE 0 END) AS total_absent
      FROM 
          attendance 
      WHERE 
          username IN (${placeholders}) 
      GROUP BY 
          username`,
        employeenamesList
      );
      const attendanceRecords = attendanceRecordresponse.rows;
      // Calculate grades for each employee
      const gradeRecords = attendanceRecords.map((record) => {
        const totalDaysWorked = record.total_present + record.total_leave;
        let grade = "";
        if (totalDaysWorked >= 25) {
          grade = "A";
        } else if (totalDaysWorked >= 20) {
          grade = "B";
        } else if (totalDaysWorked >= 15) {
          grade = "C";
        } else {
          grade = "D";
        }
        return { ...record, grade };
      });
      res.render("admin.ejs", {currentdate,user: userData.rows[0],appliedleaves: response.rows,attendanceRecords: gradeRecords,searchrecord, error, fromDate, toDate});
    } catch (error) {
      console.error("Error rendering admin page:", error);
      res.status(500).send("Internal server error");
    }
  });
// Get route for user account
app.get("/user", async (req, res) => {
  const username = req.query.username;
  const userData = await db.query("SELECT * FROM users WHERE username = $1", [
    username,
  ]);
  const response = await db.query(
    "SELECT * FROM attendance WHERE username = $1",
    [username]
  );
  const error = req.query.error ? decodeURIComponent(req.query.error) : null;
  const userAttendance = response.rows;
  let totals = {
    attendance: 0,
    leave: 0,
    absent: 0,
  };
  response.rows.forEach((record) => {
    if (record.attendance_status) {
      totals.attendance++;
    } else if (record.leave_status) {
      totals.leave++;
    } else if (record.absent_status) {
      totals.absent++;
    }
  });
  const currentdate = date();
  res.render("user.ejs", {
    currentdate,
    user: userData.rows[0],
    totals,
    userAttendance,
    error,
  });
});

// POST route for marking attendance
app.post("/markAttendance", async (req, res) => {
  const { user_name, attendancestatus } = req.body;
  if (
    !user_name ||
    (attendancestatus !== "present" && attendancestatus !== "absent")
  ) {
    return res
      .status(400)
      .json({ error: "Username or attendance status missing or invalid." });
  }
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  const existingRecord = await db.query(
    "SELECT * FROM attendance WHERE username = $1 AND attendance_date = $2",
    [user_name, currentDate]
  );
  if (existingRecord.rows.length > 0) {
    return res
      .status(400)
      .json({ error: "Attendance already marked for today." });
  } else {
    if (attendancestatus === "present") {
      await db.query(
        "INSERT INTO attendance (username, attendance_date, attendance_status) VALUES ($1, $2, $3)",
        [user_name, currentDate, true]
      );
    } else {
      await db.query(
        "INSERT INTO attendance (username, attendance_date, absent_status) VALUES ($1, $2, $3)",
        [user_name, currentDate, true]
      );
    }
    res.redirect(`/user?username=${user_name}`);
  }
});

// POST route for Applying for leave
app.post("/applyForLeave", async (req, res) => {
  const { user_name, Applydate } = req.body;
  const existingRecord = await db.query(
    "SELECT * FROM leave_applications WHERE username = $1 AND date_applied = $2",
    [user_name, Applydate]
  );
  if (existingRecord.rows.length > 0) {
    return res.status(400).json({ error: "Already Applied for leave." });
  } else {
    await db.query(
      "INSERT INTO leave_applications (username, date_applied) VALUES ($1, $2)",
      [user_name, Applydate]
    );
  }
  res.sendStatus(200);
});

// POST route for Decision for leave
app.post("/Leave_decision", async (req, res) => {
  try {
    const decision = req.body.decision;
    const leaveId = req.body.leaveId;
    const leaveDetails = await db.query(
      "SELECT * FROM leave_applications WHERE id = $1",
      [leaveId]
    );
    if (!leaveDetails.rows[0]) {
      return res.status(404).json({ error: "Leave application not found." });
    }
    const { username, date_applied } = leaveDetails.rows[0];
    if (decision === "accept") {
      await db.query("DELETE FROM leave_applications WHERE id = $1", [leaveId]);
      const existingRecord = await db.query(
        "SELECT * FROM attendance WHERE username = $1 AND attendance_date = $2",
        [username, date_applied]
      );
      console.log(username, date_applied);
      if (existingRecord.rows.length > 0) {
        return res.redirect(
          `/admin?username=admin&error=Attandance%20was%20already%20marked%20leave%20not%20marked`
        );
      } else {
        await db.query(
          "INSERT INTO attendance (username, attendance_date, leave_status) VALUES ($1, $2, $3)",
          [username, date_applied, true]
        );
        res.redirect(`/admin?username=admin`);
      }
    } else if (decision === "deny") {
      await db.query("DELETE FROM leave_applications WHERE id = $1", [leaveId]);
      const existingRecord = await db.query(
        "SELECT * FROM attendance WHERE username = $1 AND attendance_date = $2",
        [username, date_applied]
      );
      if (existingRecord.rows.length > 0) {
        return res.redirect(
          `/admin?username=admin&error=Attandance%20was%20already%20marked%20leave%20not%20marked`
        );
      } else {
        await db.query(
          "INSERT INTO attendance (username, attendance_date, absent_status) VALUES ($1, $2, $3)",
          [username, date_applied, true]
        );
        res.redirect(`/admin?username=admin`);
      }
    }
  } catch (error) {
    console.error("Error handling leave decision:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

  app.post('/Attendance_record', async (req, res) => {
    try {
        const { fromDate, toDate } = req.body;
        const attendanceRecords = await db.query(
            `SELECT * FROM attendance WHERE attendance_date BETWEEN $1 AND $2`,
            [fromDate, toDate]
        );
        res.json({ attendanceRecords: attendanceRecords.rows });
    } catch (error) {
        console.error("Error fetching attendance records:", error);
        res.status(500).json({ error: "Failed to fetch attendance records. Please try again." });
    }
});

app.post("/addAttendance", async (req, res) => {
  try {
      const { Date, username, present, absent, leave } = req.body;
      if (!Date || !username || !(present === "Yes" || absent === "Yes" || leave === "Yes")) {
          return res.status(400).json({ error: "Invalid data provided." });
      }
      const isPresent = present === "Yes";
      const isAbsent = absent === "Yes";
      const isLeave = leave === "Yes";
      await db.query(
          "INSERT INTO attendance (attendance_date, username, attendance_status, absent_status, leave_status) VALUES ($1, $2, $3, $4, $5)",
          [Date, username, isPresent, isAbsent, isLeave]
      );
      res.status(200).json({ message: "Attendance added successfully." });
  } catch (error) {
      console.error("Error adding attendance:", error);
      res.status(500).json({ error: "Failed to add attendance. Please try again." });
  }
});

app.post("/deleteAttendance", async (req, res) => {
  try {
    const { Date, username } = req.body;
    console.log(req.body);
    if (!Date || !username) {
      return res.status(400).json({ error: "Invalid data provided." });
    }
    
    // Check if there is an attendance record for the specified date and username
    const existingRecord = await db.query(
      "SELECT * FROM attendance WHERE attendance_date = $1 AND username = $2",
      [Date, username]
    );

    if (existingRecord.rows.length === 0) {
      // If no attendance record found, send an error response
      return res.status(404).json({ error: "Attendance record not found for the specified date and username." });
    }

    // Delete the attendance record for the specified date and username
    await db.query(
      "DELETE FROM attendance WHERE attendance_date = $1 AND username = $2",
      [Date, username]
    );

    res.status(200).json({ message: "Attendance deleted successfully." });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    res.status(500).json({ error: "Failed to delete attendance. Please try again." });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
