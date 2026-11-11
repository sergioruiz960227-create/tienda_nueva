# Tienda Nueva

Sistema de gestión para una tienda: ventas, inventario, clientes, créditos, usuarios y reportes.

Proyecto formativo del programa Análisis y Desarrollo de Software (SENA).
Aprendiz: Sergio Andrés Ruiz Sanabria.

## Estado actual

- **Front-end:** 14 pantallas (HTML, CSS y JavaScript).
- **API (Node.js, Express y MySQL):** autenticación, gestión de usuarios y gestión de clientes,
  ya conectadas con las pantallas de Login, Registro de usuario, Usuarios, Clientes y Registrar Cliente.
- Los demás módulos se conectan por etapas. Mientras tanto, sus pantallas muestran datos de ejemplo.

## Tecnologías

Node.js, Express, MySQL / MariaDB (XAMPP), mysql2, bcryptjs, jsonwebtoken y dotenv.

## Estructura del proyecto

```
backend/
  app.js                 Punto de entrada del servidor
  src/
    config/db.js         Conexión a MySQL (pool de conexiones)
    controllers/         Lógica de cada módulo
    middlewares/         Verificación del token y del rol
    routes/              Rutas de la API
    utils/               Validaciones y respuestas compartidas
  .env.example           Plantilla de configuración
basededatos/             Scripts SQL (estructura y datos iniciales)
docs/                    Documentación (modelo conceptual y lógico)
frontend/                Pantallas del sistema
  js/api.js              Sesión y comunicación con la API
```

## Instalación y ejecución

1. **Requisitos:** Node.js y XAMPP (MySQL).
2. **Base de datos:** encender MySQL y Apache en XAMPP, abrir phpMyAdmin, ir a **Importar** y cargar,
   en este orden, `basededatos/01_estructura.sql` y `basededatos/02_datos_iniciales.sql`.
3. **Configuración:** dentro de `backend/`, crear un archivo `.env` con el contenido de `.env.example`
   y reemplazar `JWT_SECRET` por una frase larga y secreta.
4. **Dependencias y arranque** (desde la carpeta `backend/`):
   ```
   npm install
   npm run dev
   ```
5. **Abrir el sistema** en `http://localhost:3001`. El mismo servidor entrega las pantallas,
   por lo que no se debe abrir con Live Server.

## Usuarios de prueba

| Usuario     | Contraseña    | Rol           |
|-------------|---------------|---------------|
| `admin`     | `Admin1234`   | Administrador |
| `vendedor1` | `Vendedor123` | Vendedor      |

Son credenciales de demostración; en un entorno real se deben cambiar.

## Servicios disponibles

Las respuestas son JSON con el formato `{ "ok": true, "mensaje": "..." }`. Los listados devuelven
además `total` y `datos`. Las rutas protegidas exigen el encabezado `Authorization: Bearer <token>`,
que entrega el login.

| Método | Ruta                  | Descripción                                            | Acceso                                                   |
|--------|-----------------------|--------------------------------------------------------|----------------------------------------------------------|
| GET    | `/api/salud`          | Comprueba que la API está activa                       | Público                                                  |
| POST   | `/api/register`       | Registra un usuario                                    | Público (crea Vendedores); el Administrador elige el rol |
| POST   | `/api/login`          | Inicia sesión y entrega el token                       | Público                                                  |
| GET    | `/api/usuarios`       | Lista los usuarios                                     | Administrador                                            |
| GET    | `/api/usuarios/:id`   | Consulta un usuario                                    | Administrador                                            |
| PUT    | `/api/usuarios/:id`   | Edita un usuario                                       | Administrador                                            |
| DELETE | `/api/usuarios/:id`   | Elimina un usuario (o lo desactiva si tiene historial) | Administrador                                            |
| GET    | `/api/clientes`       | Lista los clientes (filtros opcionales: `q`, `tipo`, `estado`) | Administrador y Vendedor                         |
| GET    | `/api/clientes/:id`   | Consulta un cliente                                    | Administrador y Vendedor                                 |
| POST   | `/api/clientes`       | Registra un cliente                                    | Administrador y Vendedor                                 |
| PUT    | `/api/clientes/:id`   | Edita un cliente                                       | Administrador y Vendedor                                 |
| DELETE | `/api/clientes/:id`   | Elimina un cliente (o lo desactiva si tiene historial) | Administrador                                            |

Cada cliente incluye la fecha de su última compra, su saldo pendiente y si está en mora; estos
datos se calculan a partir de las ventas y los créditos.

Códigos de estado: `200` correcto, `201` creado, `400` datos inválidos, `401` sin sesión o credenciales
incorrectas, `403` sin permiso, `404` no encontrado, `409` dato repetido y `500` error del servidor.

## Pendiente

Productos e inventario, ventas, créditos, reportes y dashboard. La documentación completa
de cada servicio se agregará en `docs/` al terminar la API.