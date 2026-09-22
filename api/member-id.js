const { google } = require("googleapis");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      found: false,
      error: "Method not allowed"
    });
  }

  try {
    const studentId = String(req.query.studentId || "").trim();

    if (!studentId) {
      return res.status(400).json({
        found: false,
        error: "Missing Student ID"
      });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
      },
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly"
      ]
    });

    const sheets = google.sheets({
      version: "v4",
      auth
    });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Members!A:AZ"
    });

    const rows = response.data.values || [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      const sheetStudentIdmemberId = String(row[0] || "").trim();
      const memberId = String(row[30] || "").trim();

      if (sheetStudentId === studentId) {
        return res.status(200).json({
          found: true,
          memberId: memberId
        });
      }
    }

    return res.status(404).json({
      found: false
    });

  } catch (error) {
    console.error("API Error:", error);

    return res.status(500).json({
      found: false,
      error: "Server error"
    });
  }
};
