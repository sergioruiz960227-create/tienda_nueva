// Respuestas estándar compartidas por los controladores

// Respuesta para errores inesperados: se registra el detalle en el servidor y al cliente solo se le informa
// que hubo un error interno (así no se filtran datos de la base de datos)
function errorServidor(res, contexto, error) {
    console.error(`Error en ${contexto}:`, error.message);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
}

module.exports = { errorServidor };