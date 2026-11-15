document.addEventListener("DOMContentLoaded", function () {

    // MENÚ HAMBURGUESA (MÓVIL)
    const btnMenu = document.getElementById("btnMenu");
    const sidebarMenu = document.querySelector(".sidebar");
    const overlayMenu = document.getElementById("overlayMenu");

    if (btnMenu && sidebarMenu && overlayMenu) {
        btnMenu.addEventListener("click", function () {
            sidebarMenu.classList.add("activo");
            overlayMenu.classList.add("activo");
        });

        overlayMenu.addEventListener("click", function () {
            sidebarMenu.classList.remove("activo");
            overlayMenu.classList.remove("activo");
        });
    }

    // 1. CERRAR SESIÓN
    const cerrarSesion = document.getElementById("cerrarSesion");
    if (cerrarSesion) {
        cerrarSesion.addEventListener("click", function (e) {
            e.preventDefault();
            if (confirm("¿Desea cerrar sesión?")) {
                window.location.href = "../index/index.html";
            }
        });
    }

    // 2. MENÚ LATERAL INTERACTIVO UNIFICADO
    const enlaces = document.querySelectorAll(".sidebar nav a");

    enlaces.forEach((enlace) => {
        enlace.addEventListener("click", function (e) {
            const texto = this.textContent.trim();

            e.preventDefault();

            if (texto === "Ventas") {
                window.location.href = "../ventas/ventas.html";
            } else if (texto === "Dashboard") {
                window.location.href = "../dashboard/dashboard.html";
            } else if (texto === "Inventario") {
                window.location.href = "../inventario/inventario.html";
            } else if (texto === "Clientes") {
                window.location.href = "../clientes/clientes.html";
            } else if (texto === "Créditos") {
                window.location.href = "../creditos/creditos.html";
            } else if (texto === "Reportes") {
                window.location.href = "../reportes/reportes.html";
            } else if (texto === "Usuarios") {
                window.location.href = "../usuarios/usuarios.html";
            } else if (texto === "Configuración") {
                window.location.href = "../configuracion/configuracion.html";
            } else {
                alert("Módulo en construcción");
            }
        });
    });

    // 3. FORMULARIO DE VENTA CONECTADO A LA API
    const TASA_IVA = 0.19;
    const CLIENTE_GENERAL = "Cliente General"; // para vender a quien no está registrado

    const selectCliente = document.getElementById("selectCliente");
    const selectMetodo = document.getElementById("selectMetodo");
    const campoFechaLimite = document.getElementById("campoFechaLimite");
    const inputFechaLimite = document.getElementById("fechaLimite");
    const cuerpoDetalle = document.getElementById("detalleProductos");
    const btnAgregar = document.getElementById("btnAgregarProducto");
    const btnRegistrar = document.getElementById("btnRegistrarVenta");
    const btnCancelar = document.getElementById("btnCancelar");

    // Productos disponibles para vender (vienen de la API con su precio y su stock)
    let catalogo = [];

    // Convierte un valor en dinero con separador de miles: 12500 -> $12.500
    function formatearDinero(valor) {
        return "$" + Number(valor).toLocaleString("es-CO");
    }

    // Redondea a dos decimales, igual que el servidor, para que los totales coincidan
    function redondear(valor) {
        return Math.round(valor * 100) / 100;
    }

    function dosDigitos(numero) {
        return String(numero).padStart(2, "0");
    }

    // Fecha de hoy en formato AAAA-MM-DD (la que usan los campos de fecha)
    function fechaHoyISO() {
        const hoy = new Date();
        return hoy.getFullYear() + "-" + dosDigitos(hoy.getMonth() + 1) + "-" + dosDigitos(hoy.getDate());
    }

    // Fecha de hoy en formato DD/MM/AAAA (la que se muestra en pantalla)
    function fechaHoyTexto() {
        const [anio, mes, dia] = fechaHoyISO().split("-");
        return dia + "/" + mes + "/" + anio;
    }

    function buscarProducto(id) {
        return catalogo.find((producto) => producto.id_producto === Number(id));
    }

    function esCredito() {
        return selectMetodo.value === "Credito";
    }

    function crearOpcion(valor, texto) {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = texto;
        return opcion;
    }

    function crearCelda(contenido) {
        const celda = document.createElement("td");
        if (typeof contenido === "string") {
            celda.textContent = contenido;
        } else {
            celda.appendChild(contenido);
        }
        return celda;
    }

    // ---------- Cliente y productos desde la base de datos ----------

    async function cargarClientes() {
        const respuesta = await llamarApi("/clientes?estado=Activo");
        if (respuesta.estado !== 200) {
            alert(respuesta.mensaje || "No se pudieron cargar los clientes.");
            return;
        }
        respuesta.datos.forEach((cliente) => {
            selectCliente.appendChild(crearOpcion(cliente.id_cliente, cliente.nombre));
        });
        // Deja elegido el Cliente General: lo más común es vender de contado sin registrar al cliente
        const opcionGeneral = Array.from(selectCliente.options).find((o) => o.textContent === CLIENTE_GENERAL);
        if (opcionGeneral) {
            selectCliente.value = opcionGeneral.value;
        }
    }

    async function cargarCatalogo() {
        const respuesta = await llamarApi("/productos/catalogo");
        if (respuesta.estado !== 200) {
            alert(respuesta.mensaje || "No se pudo cargar el catálogo de productos.");
            return;
        }
        catalogo = respuesta.datos;
    }

    // ---------- Detalle de productos ----------

    // Llena un selector con el catálogo; conserva el producto elegido si todavía está disponible
    function llenarSelectorProducto(selector) {
        const elegido = selector.value;
        selector.replaceChildren(crearOpcion("", "Seleccionar producto"));
        catalogo.forEach((producto) => {
            selector.appendChild(crearOpcion(producto.id_producto,
                producto.nombre + " (stock: " + producto.stock_actual + ")"));
        });
        selector.value = buscarProducto(elegido) ? elegido : "";
    }

    function crearFilaProducto() {
        const selector = document.createElement("select");
        llenarSelectorProducto(selector);

        const cantidad = document.createElement("input");
        cantidad.type = "number";
        cantidad.min = "1";
        cantidad.step = "1";
        cantidad.value = "1";

        const botonEliminar = document.createElement("button");
        botonEliminar.className = "btn-eliminar-item";
        botonEliminar.type = "button";
        botonEliminar.title = "Quitar producto";
        botonEliminar.textContent = "🗑️";

        const fila = document.createElement("tr");
        fila.append(crearCelda(selector), crearCelda(cantidad), crearCelda("$0"), crearCelda("$0"),
            crearCelda(botonEliminar));

        selector.addEventListener("change", recalcularTotales);
        cantidad.addEventListener("input", recalcularTotales);
        botonEliminar.addEventListener("click", function () {
            fila.remove();
            if (cuerpoDetalle.rows.length === 0) {
                cuerpoDetalle.appendChild(crearFilaProducto());
            }
            recalcularTotales();
        });
        return fila;
    }

    // Calcula el subtotal de cada fila y los totales de la venta (subtotal, IVA 19 % y total)
    function recalcularTotales() {
        let subtotal = 0;
        Array.from(cuerpoDetalle.rows).forEach((fila) => {
            const producto = buscarProducto(fila.querySelector("select").value);
            const cantidad = Number(fila.querySelector("input").value);
            const valido = producto && Number.isInteger(cantidad) && cantidad > 0;
            const subtotalFila = valido ? redondear(producto.precio_venta * cantidad) : 0;

            fila.cells[2].textContent = formatearDinero(producto ? producto.precio_venta : 0);
            fila.cells[3].textContent = formatearDinero(subtotalFila);
            subtotal += subtotalFila;
        });

        subtotal = redondear(subtotal);
        const iva = redondear(subtotal * TASA_IVA);
        document.getElementById("totalSubtotal").textContent = formatearDinero(subtotal);
        document.getElementById("totalIva").textContent = formatearDinero(iva);
        document.getElementById("totalGeneral").textContent = formatearDinero(redondear(subtotal + iva));
    }

    // Vuelve a llenar los selectores con el catálogo actualizado (por ejemplo, tras un error de stock)
    function refrescarSelectores() {
        Array.from(cuerpoDetalle.rows).forEach((fila) => llenarSelectorProducto(fila.querySelector("select")));
        recalcularTotales();
    }

    // Lee las filas de la tabla y devuelve [{ id_producto, cantidad }]
    function leerLineas() {
        return Array.from(cuerpoDetalle.rows).map((fila) => ({
            id_producto: Number(fila.querySelector("select").value),
            cantidad: Number(fila.querySelector("input").value)
        }));
    }

    // ---------- Validación y registro ----------

    // Revisa que no se pidan más unidades de las que hay (si un producto está en varias filas, se suman)
    function validarStock(lineas) {
        const pedido = new Map();
        lineas.forEach((l) => pedido.set(l.id_producto, (pedido.get(l.id_producto) || 0) + l.cantidad));
        for (const [id, cantidad] of pedido) {
            const producto = buscarProducto(id);
            if (cantidad > producto.stock_actual) {
                return "Stock insuficiente de " + producto.nombre + ": hay " + producto.stock_actual
                    + " y se piden " + cantidad + ".";
            }
        }
        return null;
    }

    // Devuelve el mensaje del primer problema que encuentre, o null si el formulario está bien
    function validarVenta() {
        if (!selectCliente.value) {
            return "Seleccione un cliente.";
        }
        if (!selectMetodo.value) {
            return "Seleccione el método de pago.";
        }
        if (esCredito() && selectCliente.selectedOptions[0].textContent === CLIENTE_GENERAL) {
            return "El Cliente General no tiene crédito. Elija un cliente registrado o cambie el método de pago.";
        }
        if (esCredito() && inputFechaLimite.value && inputFechaLimite.value < fechaHoyISO()) {
            return "La fecha límite de pago no puede ser anterior a hoy.";
        }
        const lineas = leerLineas();
        if (lineas.some((l) => !l.id_producto)) {
            return "Seleccione un producto en cada fila o quite las filas vacías.";
        }
        if (lineas.some((l) => !Number.isInteger(l.cantidad) || l.cantidad < 1)) {
            return "La cantidad de cada producto debe ser un número entero mayor que cero.";
        }
        return validarStock(lineas);
    }

    async function registrarVenta() {
        const problema = validarVenta();
        if (problema) {
            alert(problema);
            return;
        }

        const cuerpo = {
            id_cliente: Number(selectCliente.value),
            metodo_pago: selectMetodo.value,
            productos: leerLineas()
        };
        if (esCredito() && inputFechaLimite.value) {
            cuerpo.fecha_limite = inputFechaLimite.value;
        }

        btnRegistrar.disabled = true; // evita registrar la misma venta dos veces con un doble clic
        const respuesta = await llamarApi("/ventas", "POST", cuerpo);
        btnRegistrar.disabled = false;

        if (respuesta.ok) {
            alert("Venta registrada correctamente.\nFactura: " + respuesta.datos.numero_factura
                + "\nTotal: " + formatearDinero(respuesta.datos.total));
            irA("../ventas/ventas.html");
            return;
        }
        alert(respuesta.mensaje || "No fue posible registrar la venta.");
        if (respuesta.estado === 409) {
            // El stock o el cliente cambiaron mientras se llenaba el formulario: se actualiza el catálogo
            await cargarCatalogo();
            refrescarSelectores();
        }
    }

    // ---------- Eventos ----------

    // La fecha límite solo se muestra cuando la venta es a crédito
    selectMetodo.addEventListener("change", function () {
        campoFechaLimite.style.display = esCredito() ? "" : "none";
        if (!esCredito()) {
            inputFechaLimite.value = "";
        }
    });

    btnAgregar.addEventListener("click", function () {
        cuerpoDetalle.appendChild(crearFilaProducto());
    });

    btnRegistrar.addEventListener("click", registrarVenta);

    btnCancelar.addEventListener("click", function () {
        if (confirm("¿Está seguro de que desea cancelar el registro de la venta?")) {
            window.location.href = "../ventas/ventas.html";
        }
    });

    // ---------- Inicio de la pantalla ----------
    async function iniciar() {
        document.getElementById("fechaVenta").value = fechaHoyTexto();
        inputFechaLimite.min = fechaHoyISO();
        await Promise.all([cargarClientes(), cargarCatalogo()]);
        cuerpoDetalle.appendChild(crearFilaProducto());
        recalcularTotales();
    }

    iniciar();
});