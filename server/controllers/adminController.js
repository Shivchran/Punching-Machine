
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import ExcelJS from "exceljs";

// ========================================
// GET ALL ATTENDANCE
// ========================================

export const getAllAttendance = async (req, res) => {
  try {
    const records = await Attendance.find()
      .sort({ date: -1, checkIn: -1 });

    return res.status(200).json({
      success: true,
      count: records.length,
      attendance: records,
    });
  } catch (error) {
    console.error("Get attendance error:", error.message);

    return res.status(500).json({
      message: "Unable to fetch attendance records",
    });
  }
};

// ========================================
// CREATE EMPLOYEE (ADMIN ONLY)
// ========================================

export const createEmployee = async (req, res) => {
  try {
    const { name, userId, email, password } = req.body;

    // Validate fields
    if (
      typeof name !== "string" ||
      typeof userId !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !userId.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "All employee fields are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUserId = userId.trim();

    // Check duplicate employee
    const existingEmployee = await Employee.findOne({
      $or: [
        { email: normalizedEmail },
        { userId: normalizedUserId },
      ],
    });

    if (existingEmployee) {
      return res.status(409).json({
        message: "Employee ID or email already exists",
      });
    }

    // Create employee
    // Password will automatically be hashed by Employee model
    const employee = await Employee.create({
      name: name.trim(),
      userId: normalizedUserId,
      email: normalizedEmail,
      password,
      role: "employee",
    });

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee: {
        id: employee._id,
        name: employee.name,
        userId: employee.userId,
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (error) {
    console.error("Create employee error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Employee ID or email already exists",
      });
    }

    return res.status(500).json({
      message: "Unable to create employee",
    });
  }
};

// ========================================
// EXPORT ATTENDANCE EXCEL
// ========================================

export const exportAttendanceExcel = async (req, res) => {
  try {
    const records = await Attendance.find()
      .sort({ date: -1 });

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet("Attendance Report");

    worksheet.columns = [
      { header: "Employee Name", key: "employeeName", width: 25 },
      { header: "User ID", key: "userId", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Date", key: "date", width: 15 },
      { header: "Check In", key: "checkIn", width: 22 },
      { header: "Check Out", key: "checkOut", width: 22 },
      { header: "Status", key: "status", width: 15 },
    ];

    records.forEach((record) => {
      worksheet.addRow({
        employeeName: record.employeeName || "",
        userId: record.userId || "",
        email: record.employeeEmail || "",
        date: record.date
          ? new Date(record.date).toLocaleDateString("en-IN")
          : "",
        checkIn: record.checkIn
          ? new Date(record.checkIn).toLocaleString("en-IN")
          : "",
        checkOut: record.checkOut
          ? new Date(record.checkOut).toLocaleString("en-IN")
          : "",
        status: record.status || "",
      });
    });

    worksheet.getRow(1).font = { bold: true };

    worksheet.views = [
      { state: "frozen", ySplit: 1 },
    ];

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Attendance_Report.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Excel export error:", error.message);

    return res.status(500).json({
      message: "Excel export failed",
    });
  }
};