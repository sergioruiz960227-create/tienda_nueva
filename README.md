# Tienda Nueva

Sistema de gestión para una tienda: ventas, inventario, clientes, créditos, usuarios y reportes.

Proyecto formativo del programa Análisis y Desarrollo de Software (SENA).
Aprendiz: Sergio Andrés Ruiz Sanabria.

## Estado actual

- **Front-end:** 14 pantallas (HTML, CSS y JavaScript).
- **API (Node.js, Express y MySQL):** autenticación, usuarios, clientes y productos e inventario,
  ya conectadas con las pantallas de Login, Registro de usuario, Usuarios, Clientes, Registrar Cliente,
  Inventario, Registrar Producto, Ventas y Registrar Venta.
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
    services/            Reglas del negocio que usan transacciones (ventas)
    utils/               Validaciones, respuestas y transacciones compartidas
  .env.example           Plantilla de configuración
basededatos/             Scripts SQL (estructura y datos iniciales)
docs/                    Documentación (modelo conceptual y lógico)
frontend/                Pantallas del sistema
  js/api.js              Sesión y comunicación con la API
```

## Instalación y ejecución

1. **Requisitos:** Node.js y XAMPP (MySQL).
2. **Base de datos:** encender MySQL y Apache en XAMPP, abrir phpMyAdmin, ir a **Importar** y cargar,
   en este orden, `basededatos/01_estructura.sql` y `basededatos/02_datos_iniciales.sql`
   (el segundo crea los usuarios de prueba y el cliente "Cliente General"; se puede cargar de nuevo sin repetirlos).
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

| Método | Ruta                              | Descripción                                                  | Acceso                                                   |
|--------|-----------------------------------|--------------------------------------------------------------|----------------------------------------------------------|
| GET    | `/api/salud`                      | Comprueba que la API está activa                             | Público                                                  |
| POST   | `/api/register`                   | Registra un usuario                                          | Público (crea Vendedores); el Administrador elige el rol |
| POST   | `/api/login`                      | Inicia sesión y entrega el token                             | Público                                                  |
| GET    | `/api/usuarios`                   | Lista los usuarios                                           | Administrador                                            |
| GET    | `/api/usuarios/:id`               | Consulta un usuario                                          | Administrador                                            |
| PUT    | `/api/usuarios/:id`               | Edita un usuario                                             | Administrador                                            |
| DELETE | `/api/usuarios/:id`               | Elimina un usuario (o lo desactiva si tiene historial)       | Administrador                                            |
| GET    | `/api/clientes`                   | Lista los clientes (filtros opcionales: `q`, `tipo`, `estado`) | Administrador y Vendedor                               |
| GET    | `/api/clientes/:id`               | Consulta un cliente                                          | Administrador y Vendedor                                 |
| POST   | `/api/clientes`                   | Registra un cliente                                          | Administrador y Vendedor                                 |
| PUT    | `/api/clientes/:id`               | Edita un cliente                                             | Administrador y Vendedor                                 |
| DELETE | `/api/clientes/:id`               | Elimina un cliente (o lo desactiva si tiene historial)       | Administrador                                            |
| GET    | `/api/productos`                  | Lista los productos (filtros: `q`, `categoria`, `estado`, `stock=bajo\|agotado`) | Administrador y Vendedor               |
| GET    | `/api/productos/catalogo`         | Catálogo: productos disponibles con precio y existencias     | Administrador y Vendedor                                 |
| GET    | `/api/productos/bajo-stock`       | Alerta: productos con existencias iguales o menores al mínimo | Administrador y Vendedor                                |
| GET    | `/api/productos/:id`              | Detalle de un producto                                       | Administrador y Vendedor                                 |
| GET    | `/api/productos/:id/movimientos`  | Historial de entradas y salidas de un producto               | Administrador y Vendedor                                 |
| POST   | `/api/productos`                  | Registra un producto (el stock inicial queda como entrada)   | Administrador y Vendedor                                 |
| PUT    | `/api/productos/:id`              | Edita un producto (un cambio de stock queda como ajuste manual) | Administrador y Vendedor                              |
| PATCH  | `/api/productos/:id/surtir`       | Registra la llegada de mercancía (`cantidad`, y opcional `precio_compra`) | Administrador y Vendedor                    |
| DELETE | `/api/productos/:id`              | Elimina un producto que nunca se ha vendido                  | Administrador                                            |
| POST   | `/api/ventas`                     | Registra una venta (`id_cliente`, `metodo_pago`, `productos`, y `fecha_limite` si es a crédito) | Administrador y Vendedor |
| GET    | `/api/ventas`                     | Historial paginado (filtros: `q`, `estado`, `metodo`, `desde`, `hasta`, `pagina`, `limite`) | Administrador y Vendedor |
| GET    | `/api/ventas/resumen`             | Cifras de las tarjetas: ventas y facturas de hoy y del mes, clientes activos | Administrador y Vendedor |
| GET    | `/api/ventas/:id`                 | Factura completa, con sus productos                          | Administrador y Vendedor                                 |
| PATCH  | `/api/ventas/:id/anular`          | Anula una venta y devuelve el stock al inventario            | Administrador                                            |

Notas:

- Cada cliente incluye la fecha de su última compra, su saldo pendiente y si está en mora; estos datos
  se calculan a partir de las ventas y los créditos.
- Cada producto incluye `estado_stock` (Disponible, Stock bajo o Agotado), calculado a partir de sus
  existencias y de su stock mínimo. Un producto sin existencias queda como Agotado y vuelve a Disponible
  cuando se surte.
- Todo movimiento de existencias (stock inicial, surtido, venta, anulación o ajuste) queda anotado en el
  historial del producto.
- En una venta, el servidor toma los precios de la base de datos y calcula el subtotal, el IVA (19 %) y el total.
  Todo se guarda en una transacción: la venta, su detalle, el descuento de stock y, si es a crédito, la cuenta
  por cobrar. Dos ventas simultáneas del último producto no pueden dejar el stock en negativo.
- Métodos de pago: `Efectivo`, `Transferencia`, `Tarjeta` y `Credito`. El crédito exige cupo disponible
  (límite del cliente menos su saldo pendiente); si no se indica `fecha_limite`, se asignan 30 días.
- Las facturas se numeran FV001, FV002... Las ventas no se editan ni se eliminan: se anulan. Una venta a
  crédito con abonos no se puede anular. Un Vendedor solo ve las ventas que él registró.
- Las ventas a personas no registradas se hacen al cliente **Cliente General** (límite de crédito 0, por lo que
  nunca se le vende a crédito). El servidor no deja editarlo, eliminarlo ni crear otro cliente con ese nombre,
  y no se cuenta en "Clientes Activos". En Registrar Venta aparece preseleccionado.
- El historial entrega quién registró cada venta (`vendedor`, `usuario_vendedor` y `rol_vendedor`); la pantalla de Ventas muestra
  esa columna solo al Administrador.
- El estado de una venta se calcula: Pagada, Pendiente, En mora (crédito vencido) o Anulada.

Códigos de estado: `200` correcto, `201` creado, `400` datos inválidos, `401` sin sesión o credenciales
incorrectas, `403` sin permiso, `404` no encontrado, `409` dato repetido o en uso y `500` error del servidor.

## Pendiente

Créditos, reportes y dashboard. La documentación completa de cada servicio se agregará en
`docs/` al terminar la API.