
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import getTransporter from "./config/mailer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const testEmail = async () => {
  try {
    const transporter = getTransporter();

    await transporter.verify();

    console.log("SUCCESS: Gmail SMTP connected!");

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.SMTP_USER,
      subject: "Punching Machine SMTP Test",
      text: "Your Gmail SMTP configuration is working successfully.",
    });

    console.log("Test email sent:", result.messageId);
  } catch (error) {
    console.error("EMAIL TEST FAILED:", error.message);
  }
};

testEmail();