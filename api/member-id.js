const { google } = require("googleapis");

function normalize(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      found: false,
      error: "Method not allowed"
    });
  }

  try {
    const studentId = normalize(req.query.studentId || "");

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
      range: "'Members'!A:AZ"
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      return res.status(404).json({
        found: false,
        error: "Database is empty"
      });
    }

    // 第一行是表头
    const headers = rows[0];

    // 自动寻找 Student ID / Matric Number 的表头
    const studentIdColumn = headers.findIndex(header =>
      normalize(header).includes("matricnumber")
    );

    // 自动寻找 MEMBER ID 的表头
    const memberIdColumn = headers.findIndex(header =>
      normalize(header) === "memberid"
    );

    // 找不到 Student ID 表头
    if (studentIdColumn === -1) {
      return res.status(500).json({
        found: false,
        error: "Student ID column not found"
      });
    }

    // 找不到 MEMBER ID 表头
    if (memberIdColumn === -1) {
      return res.status(500).json({
        found: false,
        error: "MEMBER ID column not found"
      });
    }

    // 从第二行开始寻找 Student ID
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      const sheetStudentId = normalize(row[studentIdColumn]);
      const memberId = String(row[memberIdColumn] || "").trim();

      if (sheetStudentId === studentId && memberId) {
        return res.status(200).json({
          found: true,
          memberId: memberId
        });
      }
    }

    return res.status(404).json({
      found: false,
      error: "Student ID not found"
    });

  } catch (error) {
    console.error("API Error:", error);

    return res.status(500).json({
      found: false,
      error: error.message
    });
  }
};
