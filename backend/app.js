// Punto de entrada de la API de Tienda Nueva
require('dotenv').config();
const path = require('path');
const express = require('express');
const { probarConexion } = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');

const app = express();
const puerto = process.env.PORT || 3001;

// Permite leer cuerpos de petición en formato JSON
app.use(express.json());

// Sirve las pantallas del front-end desde la misma dirección del servidor.
// Las páginas HTML no se guardan en la memoria del navegador, para que "atrás" no reabra una sesión cerrada
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
    setHeaders: (res, rutaArchivo) => {
        if (rutaArchivo.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store');
        }
    }
}));

// Ruta de comprobación: indica que la API está activa
app.get('/api/salud', (req, res) => {
    res.json({ ok: true, mensaje: 'API de Tienda Nueva activa' });
});

// Rutas de la API
app.use('/api', authRoutes);

// Respuesta para rutas de la API que no existen
app.use('/api', (req, res) => {
    res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' });
});

// Manejo de errores: por ejemplo, un JSON mal escrito en el cuerpo de la petición
app.use((error, req, res, next) => {
    const estado = error.status || 500;
    const mensaje = estado === 400 ? 'Solicitud inválida: revise el formato del JSON' : 'Error interno del servidor';
    res.status(estado).json({ ok: false, mensaje });
});

// Arranca el servidor solo si la base de datos responde
async function iniciarServidor() {
    try {
        await probarConexion();
        app.listen(puerto, () => {
            console.log(`Servidor escuchando en http://localhost:${puerto}`);
        });
    } catch (error) {
        console.error('No se pudo iniciar el servidor');
        process.exit(1);
    }
}

iniciarServidor();