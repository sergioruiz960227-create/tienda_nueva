-- =====================================================================
-- Base de datos del sistema de gestión "Tienda Nueva"
-- Versión corregida: llaves primarias autoincrementales y llaves foráneas
-- en la dirección correcta (la tabla "muchos" apunta a la tabla "uno").
-- Compatible con MySQL / MariaDB (XAMPP).
-- =====================================================================
CREATE DATABASE IF NOT EXISTS tienda_nueva
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE tienda_nueva;

-- ---------------------------------------------------------------------
-- usuarios: personas que ingresan al sistema (RNF03: roles y permisos)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    cedula VARCHAR(20) NOT NULL,
    fecha_nacimiento DATE NULL,
    correo VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NULL,
    usuario VARCHAR(50) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,            -- hash bcrypt, nunca texto plano (RNF01)
    rol ENUM('Administrador', 'Vendedor') NOT NULL DEFAULT 'Vendedor',
    estado ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario),
    UNIQUE KEY uq_usuarios_cedula (cedula),
    UNIQUE KEY uq_usuarios_correo (correo),
    UNIQUE KEY uq_usuarios_usuario (usuario)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- clientes (RF11: clientes con línea de crédito)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NULL,
    correo VARCHAR(100) NULL,
    direccion VARCHAR(200) NULL,
    ciudad VARCHAR(80) NULL,
    tipo_cliente ENUM('Ocasional', 'Frecuente', 'Mayorista') NOT NULL DEFAULT 'Ocasional',
    limite_credito DECIMAL(12,2) NOT NULL DEFAULT 0,
    estado ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
    observaciones TEXT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_cliente),
    KEY ix_clientes_nombre (nombre),
    CONSTRAINT ck_clientes_limite CHECK (limite_credito >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- productos: catálogo e inventario (RF03, RF05, RF06, RF07, RF08)
-- El estado "Stock bajo" no se guarda: se calcula (stock_actual <= stock_minimo)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
    id_producto INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NULL,
    categoria VARCHAR(50) NOT NULL,
    marca VARCHAR(80) NULL,
    precio_compra DECIMAL(12,2) NOT NULL DEFAULT 0,
    precio_venta DECIMAL(12,2) NOT NULL,
    stock_actual INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 0,
    imagen VARCHAR(255) NULL,
    estado ENUM('Disponible', 'Agotado') NOT NULL DEFAULT 'Disponible',
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_producto),
    KEY ix_productos_categoria (categoria),
    CONSTRAINT ck_productos_precios CHECK (precio_compra >= 0 AND precio_venta >= 0),
    CONSTRAINT ck_productos_stock CHECK (stock_actual >= 0 AND stock_minimo >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ventas (RF01). Una venta pertenece a UN usuario (quien vende) y a UN cliente.
-- Las ventas no se borran: se anulan (queda el historial).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ventas (
    id_venta INT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero_factura VARCHAR(20) NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT UNSIGNED NOT NULL,
    id_cliente INT UNSIGNED NOT NULL,
    metodo_pago ENUM('Efectivo', 'Transferencia', 'Tarjeta', 'Credito') NOT NULL DEFAULT 'Efectivo',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    iva DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    estado ENUM('Pagada', 'Pendiente', 'En mora', 'Anulada') NOT NULL DEFAULT 'Pagada',
    PRIMARY KEY (id_venta),
    UNIQUE KEY uq_ventas_factura (numero_factura),
    KEY ix_ventas_fecha (fecha),
    CONSTRAINT fk_ventas_usuarios FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ventas_clientes FOREIGN KEY (id_cliente)
        REFERENCES clientes (id_cliente) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- detalle_venta: líneas de cada venta. Una venta tiene muchos detalles y
-- un producto aparece en muchos detalles (por eso las FK están AQUÍ).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detalle_venta (
    id_detalle INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_venta INT UNSIGNED NOT NULL,
    id_producto INT UNSIGNED NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,       -- precio al momento de vender
    subtotal DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id_detalle),
    KEY ix_detalle_venta (id_venta),
    KEY ix_detalle_producto (id_producto),
    CONSTRAINT fk_detalle_ventas FOREIGN KEY (id_venta)
        REFERENCES ventas (id_venta) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_productos FOREIGN KEY (id_producto)
        REFERENCES productos (id_producto) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_detalle_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- cuentas_cobrar (créditos / fiados, RF11, RF12, RF13).
-- id_venta es opcional y único: un crédito puede nacer de una venta (1:1)
-- o registrarse manualmente desde el formulario de créditos.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cuentas_cobrar (
    id_cuenta INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_cliente INT UNSIGNED NOT NULL,
    id_venta INT UNSIGNED NULL,
    fecha_credito DATE NOT NULL,
    fecha_limite DATE NOT NULL,
    valor_credito DECIMAL(12,2) NOT NULL,
    saldo_pendiente DECIMAL(12,2) NOT NULL,
    metodo_pago ENUM('Efectivo', 'Transferencia', 'Tarjeta') NULL,
    estado ENUM('Pendiente', 'Pagado', 'En mora') NOT NULL DEFAULT 'Pendiente',
    observaciones TEXT NULL,
    PRIMARY KEY (id_cuenta),
    UNIQUE KEY uq_cuentas_venta (id_venta),
    KEY ix_cuentas_estado (estado, fecha_limite),
    CONSTRAINT fk_cuentas_clientes FOREIGN KEY (id_cliente)
        REFERENCES clientes (id_cliente) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_cuentas_ventas FOREIGN KEY (id_venta)
        REFERENCES ventas (id_venta) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_cuentas_valores CHECK (valor_credito > 0 AND saldo_pendiente >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- abonos: pagos parciales o totales de una cuenta por cobrar (RF12)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS abonos (
    id_abono INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_cuenta INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valor DECIMAL(12,2) NOT NULL,
    metodo_pago ENUM('Efectivo', 'Transferencia', 'Tarjeta') NOT NULL DEFAULT 'Efectivo',
    PRIMARY KEY (id_abono),
    KEY ix_abonos_cuenta (id_cuenta),
    CONSTRAINT fk_abonos_cuentas FOREIGN KEY (id_cuenta)
        REFERENCES cuentas_cobrar (id_cuenta) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_abonos_usuarios FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_abonos_valor CHECK (valor > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- gastos (RF09: registro de gastos del negocio)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gastos (
    id_gasto INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_usuario INT UNSIGNED NOT NULL,
    fecha DATE NOT NULL,
    concepto VARCHAR(150) NOT NULL,
    categoria VARCHAR(50) NULL,
    valor DECIMAL(12,2) NOT NULL,
    descripcion TEXT NULL,
    PRIMARY KEY (id_gasto),
    KEY ix_gastos_fecha (fecha),
    CONSTRAINT fk_gastos_usuarios FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_gastos_valor CHECK (valor > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- movimientos_inventario: historial de entradas y salidas (RNF02, RF07, RF08)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id_movimiento INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_producto INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    id_venta INT UNSIGNED NULL,
    tipo ENUM('Entrada', 'Salida', 'Ajuste') NOT NULL,
    motivo ENUM('Venta', 'Surtido', 'Anulacion de venta', 'Ajuste manual') NOT NULL,
    cantidad INT NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_movimiento),
    KEY ix_mov_producto (id_producto, fecha),
    CONSTRAINT fk_mov_productos FOREIGN KEY (id_producto)
        REFERENCES productos (id_producto) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_mov_usuarios FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ventas FOREIGN KEY (id_venta)
        REFERENCES ventas (id_venta) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_mov_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB;
