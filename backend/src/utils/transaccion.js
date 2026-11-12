// Ejecución de varias operaciones de base de datos como una sola unidad: todas se guardan o ninguna
const { pool } = require('../config/db');

// Abre una transacción, ejecuta la operación recibida y la confirma; si algo falla, deshace todo
async function conTransaccion(operacion) {
    const conexion = await pool.getConnection();
    try {
        await conexion.beginTransaction();
        const resultado = await operacion(conexion);
        await conexion.commit();
        return resultado;
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
}

module.exports = { conTransaccion };