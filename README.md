# Tienda Nueva

Sistema de gestión para una tienda: ventas, inventario, clientes, créditos, usuarios y reportes.

## Estado actual

Prototipo del front-end (HTML, CSS y JavaScript) con datos de ejemplo.
La API (Node.js, Express y MySQL) se agrega en los siguientes commits.

## Estructura

- `frontend/`: pantallas del sistema (14 módulos)
- `backend/`: API (próximamente)
- `basededatos/`: scripts SQL de la base de datos
- `docs/`: modelo conceptual y lógico (y, próximamente, la documentación de los servicios)

## Base de datos

Base de datos `tienda_nueva` (MySQL / MariaDB, incluida en XAMPP), con 9 tablas:
usuarios, clientes, productos, ventas, detalle_venta, cuentas_cobrar, abonos, gastos y movimientos_inventario.

Para crearla: encender MySQL y Apache en XAMPP, abrir phpMyAdmin, ir a **Importar** y
cargar el archivo `basededatos/01_estructura.sql`.

## Cómo ver el prototipo

Abrir `frontend/index.html` con la extensión Live Server de VS Code.