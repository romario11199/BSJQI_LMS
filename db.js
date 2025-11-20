const sql = require('mssql');

// Load environment variables if present
require('dotenv').config();

const dbConfig = {
    server: process.env.DB_SERVER || 'DESKTOP-P6M5VIB\\SQLEXPRESS',
    database: process.env.DB_DATABASE || 'BSJQI_LMS',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'SpecialProject2025',
    options: {
        trustServerCertificate: true,
        encrypt: false,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let _pool = null;

async function initDb() {
    if (_pool) return _pool;
    try {
        const pool = await new sql.ConnectionPool(dbConfig).connect();
        console.log('Connected to SQL Server pool.');
        _pool = pool;
        return _pool;
    } catch (err) {
        console.error('SQL Pool Connection Error:', err.message || err);
        // Do not throw to allow server to start — return null so callers can handle
        _pool = null;
        return null;
    }
}

function getPool() {
    return _pool;
}

module.exports = {
    sql,
    initDb,
    getPool,
    dbConfig
};
