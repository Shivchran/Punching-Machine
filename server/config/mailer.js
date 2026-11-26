
import { google } from "googleapis";

let gmailClient;

const getGmailClient = () => {
  if (gmailClient) return gmailClient;

  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN,
  } = process.env;

  if (
    !GOOGLE_CLIENT_ID ||
    !GOOGLE_CLIENT_SECRET ||
    !GOOGLE_REFRESH_TOKEN
  ) {
    throw new Error("Gmail API OAuth environment variables are missing.");
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: GOOGLE_REFRESH_TOKEN,
  });

  gmailClient = google.gmail({
    version: "v1",
    auth: oauth2Client,
  });

  return gmailClient;
};

const getTransporter = () => {
  return {
    async sendMail({ from, to, subject, text }) {
      if (!to || !subject || !text) {
        throw new Error("Email recipient, subject and text are required.");
      }

      const sender = from || process.env.EMAIL_FROM;

      if (!sender) {
        throw new Error("EMAIL_FROM is missing.");
      }

      const message = [
        `From: ${sender}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: 8bit",
        "",
        text,
      ].join("\r\n");

      const raw = Buffer.from(message, "utf8").toString("base64url");

      const gmail = getGmailClient();

      const result = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw },
      });

      return {
        messageId: result.data.id,
      };
    },
  };
};

export default getTransporter;