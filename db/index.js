const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '20021005',
    database: process.env.DB_NAME || 'foodshare',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

db.promiseQuery = async (sql, params = []) => {
    const [rows] = await db.promise().query(sql, params);
    return rows;
};

module.exports = db;
