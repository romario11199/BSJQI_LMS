const sql = require('mssql');

// Load environment variables if present
require('dotenv').config();

// Build DB config preferring explicit host+port when provided, otherwise use named instance
const serverHost = process.env.DB_SERVER || process.env.DB_SERVER_HOST || 'DESKTOP-P6M5VIB';
const serverPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : null;
const instanceName = process.env.DB_INSTANCE || null;

const dbConfig = {
    server: serverHost,
    port: serverPort,
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

// If a port was not provided but an instance name exists, set options.instanceName
if (!serverPort && instanceName) {
    dbConfig.options.instanceName = instanceName;
}

// If port is explicitly provided, ensure instanceName is not set (port takes precedence)
if (serverPort && dbConfig.options.instanceName) {
    delete dbConfig.options.instanceName;
}

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
        // Log stack and config to help troubleshooting
        if (err && err.stack) console.error(err.stack);
        try {
            console.error('DB config server:', dbConfig.server, 'database:', dbConfig.database);
        } catch (e) {
            // ignore
        }
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
