// Punto de entrada de la API de Tienda Nueva
require('dotenv').config();
const path = require('path');
const express = require('express');
const { probarConexion } = require('./src/config/db');

const app = express();
const puerto = process.env.PORT || 3001;

// Permite leer cuerpos de petición en formato JSON
app.use(express.json());

// Sirve las pantallas del front-end desde la misma dirección del servidor
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Ruta de comprobación: indica que la API está activa
app.get('/api/salud', (req, res) => {
    res.json({ ok: true, mensaje: 'API de Tienda Nueva activa' });
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