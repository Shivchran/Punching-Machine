
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    employeeName: {
      type: String,
      required: true,
    },

    employeeEmail: {
      type: String,
      required: true,
    },

    userId: {
      type: String,
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    checkIn: {
      type: Date,
      default: null,
    },

    checkOut: {
      type: Date,
      default: null,
    },

    checkInLocation: {
      latitude: Number,
      longitude: Number,
      distanceMeters: Number,
    },

    checkOutLocation: {
      latitude: Number,
      longitude: Number,
      distanceMeters: Number,
    },

    status: {
      type: String,
      enum: ["Present", "Absent", "Half Day"],
      default: "Present",
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;