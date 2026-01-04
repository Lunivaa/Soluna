import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "soluna",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection
(async () => {
  try {
    const [rows] = await db.query("SELECT 1");
    console.log("Database connected successfully");
  } catch (err) {
    console.error("Database connection failed:", err);
  }
})();
