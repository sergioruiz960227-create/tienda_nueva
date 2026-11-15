-- =====================================================================
-- Datos iniciales de Tienda Nueva (usuarios para poder iniciar sesión)
-- Ejecutar DESPUÉS de 01_estructura.sql. Se puede ejecutar varias veces
-- (no repite los usuarios ni el Cliente General si ya existen).
-- Las contraseñas están cifradas con bcrypt:
--   admin      -> Admin1234
--   vendedor1  -> Vendedor123
-- =====================================================================
USE tienda_nueva;

INSERT IGNORE INTO usuarios
    (nombres, apellidos, cedula, fecha_nacimiento, correo, telefono, usuario, contrasena, rol, estado)
VALUES
    ('Administrador', 'Tienda Nueva', '1000000001', '1990-01-15', 'admin@tiendanueva.com', '3000000001',
     'admin', '$2b$10$dH.Rerowpp/BIoU1Dxt2o.mGB1INlAnBqpdWIboY57599IB3HDEQa', 'Administrador', 'Activo'),
    ('Vendedor', 'Uno', '1000000002', '1995-06-20', 'vendedor1@tiendanueva.com', '3000000002',
     'vendedor1', '$2b$10$zcnImsntRg3PfWPEQ1XCLeHiXLQDbjX7uuXZKQ8zpPxtqSEYeJJNC', 'Vendedor', 'Activo');

-- Cliente General: se usa para ventas de mostrador a personas que no están registradas.
-- Tiene límite de crédito 0, por eso nunca se le puede vender a crédito.
-- (Los clientes no tienen un campo único, así que se evita repetirlo con NOT EXISTS.)
INSERT INTO clientes (nombre, tipo_cliente, limite_credito, estado, observaciones)
SELECT 'Cliente General', 'Ocasional', 0, 'Activo', 'Ventas de mostrador a clientes no registrados'
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE nombre = 'Cliente General');