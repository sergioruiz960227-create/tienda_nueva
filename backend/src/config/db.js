// Configuración de la conexión a MySQL mediante un pool de conexiones
require('dotenv').config();
const mysql = require('mysql2/promise');

// El pool reutiliza conexiones abiertas en lugar de abrir una nueva en cada petición
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true, // los valores DECIMAL (precios, totales) llegan como números y no como texto
    dateStrings: true // las fechas llegan como texto 'AAAA-MM-DD', sin cambios por zona horaria
});

// Verifica que la base de datos responda correctamente
async function probarConexion() {
    try {
        const conexion = await pool.getConnection();
        conexion.release();
        console.log('Conexión a MySQL exitosa');
    } catch (error) {
        console.error('Error al conectar con MySQL:', error.message);
        throw error;
    }
}

module.exports = { pool, probarConexion };