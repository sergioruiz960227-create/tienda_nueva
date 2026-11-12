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
            let confirmar = confirm("¿Desea cerrar sesión?");
            if (confirmar) {
                window.location.href = "../index/index.html";
            }
        });
    }

    // 2. MENÚ LATERAL INTERACTIVO REAL UNIFICADO
    const enlaces = document.querySelectorAll(".sidebar nav a");

    enlaces.forEach((enlace) => {
        enlace.addEventListener("click", function (e) {
            const texto = this.textContent.trim();

            if (texto === "Inventario") {
                return; // Ya estamos aquí
            }

            e.preventDefault();

            if (texto === "Dashboard") {
                window.location.href = "../dashboard/dashboard.html";
            } else if (texto === "Ventas") {
                window.location.href = "../ventas/ventas.html";
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

    // 3. BOTÓN REGISTRAR PRODUCTO
    const btnRegistrar = document.getElementById("btnRegistrarProducto");

    if (btnRegistrar) {
        btnRegistrar.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "../R_inventario/R_inventario.html";
        });
    }

    // 4. LISTADO DE PRODUCTOS DESDE LA BASE DE DATOS
    const cuerpoTabla = document.querySelector("tbody");
    const tarjetas = document.querySelectorAll(".cards .card h2");
    const buscador = document.getElementById("buscarProducto");

    // Solo el Administrador puede eliminar productos
    const sesion = leerSesion();
    const esAdmin = Boolean(sesion) && sesion.usuario.rol === "Administrador";

    // Etiqueta y estilo según el estado del stock
    const ESTILOS_ESTADO = { "Disponible": "disponible", "Stock bajo": "stock-bajo", "Agotado": "agotado" };

    function codigoProducto(id) {
        return "P" + String(id).padStart(3, "0");
    }

    function formatearPrecio(valor) {
        return "$" + Number(valor).toLocaleString("es-CO");
    }

    function crearCelda(texto) {
        const celda = document.createElement("td");
        celda.textContent = texto;
        return celda;
    }

    function crearCeldaEstado(estado) {
        const celda = document.createElement("td");
        const etiqueta = document.createElement("span");
        etiqueta.className = "badge " + ESTILOS_ESTADO[estado];
        etiqueta.textContent = estado;
        celda.appendChild(etiqueta);
        return celda;
    }

    function crearBoton(clase, titulo, icono, accion) {
        const boton = document.createElement("button");
        boton.className = "btn-accion " + clase;
        boton.title = titulo;
        boton.textContent = icono;
        boton.addEventListener("click", accion);
        return boton;
    }

    function crearFila(producto) {
        const acciones = document.createElement("td");
        acciones.className = "acciones-celda";
        acciones.appendChild(crearBoton("btn-surtir", "Surtir producto", "➕", () => surtirProducto(producto)));
        acciones.appendChild(crearBoton("btn-editar", "Editar producto", "📝", () => editarProducto(producto)));
        if (esAdmin) {
            acciones.appendChild(
                crearBoton("btn-eliminar", "Eliminar producto", "🗑️", () => eliminarProducto(producto))
            );
        }

        const fila = document.createElement("tr");
        fila.append(
            crearCelda(codigoProducto(producto.id_producto)),
            crearCelda(producto.nombre),
            crearCelda(producto.categoria),
            crearCelda(producto.stock_actual),
            crearCelda(formatearPrecio(producto.precio_venta)),
            crearCeldaEstado(producto.estado_stock),
            acciones
        );
        return fila;
    }

    // Muestra un mensaje que ocupa toda la fila de la tabla (cargando, error o sin datos)
    function mostrarMensajeTabla(texto) {
        const celda = document.createElement("td");
        celda.colSpan = 7;
        celda.style.textAlign = "center";
        celda.textContent = texto;
        const fila = document.createElement("tr");
        fila.appendChild(celda);
        cuerpoTabla.replaceChildren(fila);
    }

    function actualizarTarjetas(productos) {
        const cantidad = (estado) => productos.filter((p) => p.estado_stock === estado).length;
        const valores = [
            productos.length,
            cantidad("Stock bajo"),
            cantidad("Agotado"),
            new Set(productos.map((p) => p.categoria)).size
        ];
        tarjetas.forEach((tarjeta, i) => {
            tarjeta.textContent = valores[i];
        });
    }

    // Aplica el texto del buscador a las filas que están en pantalla
    function filtrar() {
        const termino = buscador ? buscador.value.toLowerCase().trim() : "";

        Array.from(cuerpoTabla.rows).forEach((fila) => {
            if (fila.cells.length < 5) {
                return;
            }
            const texto = [0, 1, 2].map((i) => fila.cells[i].textContent.toLowerCase()).join(" ");
            fila.style.display = texto.includes(termino) ? "" : "none";
        });
    }

    async function cargarProductos() {
        mostrarMensajeTabla("Cargando productos...");
        const respuesta = await llamarApi("/productos");

        if (respuesta.estado !== 200) {
            mostrarMensajeTabla(respuesta.mensaje || "No se pudieron cargar los productos.");
            return;
        }
        if (respuesta.datos.length === 0) {
            mostrarMensajeTabla("No hay productos registrados.");
        } else {
            cuerpoTabla.replaceChildren(...respuesta.datos.map(crearFila));
        }
        actualizarTarjetas(respuesta.datos);
        filtrar();
    }

    // 5. ACCIONES DE LA TABLA
    function editarProducto(producto) {
        irA("../R_inventario/R_inventario.html?id=" + producto.id_producto);
    }

    // Registra la llegada de mercancía: pide la cantidad y la suma al stock
    async function surtirProducto(producto) {
        const texto = prompt("¿Cuántas unidades de " + producto.nombre + " llegaron?");
        if (texto === null) {
            return;
        }
        const cantidad = Number(texto);
        if (!Number.isInteger(cantidad) || cantidad < 1) {
            alert("Ingrese una cantidad entera mayor que cero.");
            return;
        }
        const respuesta = await llamarApi("/productos/" + producto.id_producto + "/surtir", "PATCH", { cantidad });
        if (respuesta.ok) {
            alert(respuesta.mensaje + ". Stock actual: " + respuesta.datos.stock_actual);
            cargarProductos();
        } else {
            alert(respuesta.mensaje || "No fue posible registrar el surtido.");
        }
    }

    async function eliminarProducto(producto) {
        if (!confirm("¿Está seguro de que desea eliminar el producto " + producto.nombre + "?")) {
            return;
        }
        const respuesta = await llamarApi("/productos/" + producto.id_producto, "DELETE");
        alert(respuesta.mensaje || "No fue posible eliminar el producto.");
        if (respuesta.ok) {
            cargarProductos();
        }
    }

    // 6. BUSCADOR EN TIEMPO REAL (código, producto y categoría)
    if (buscador) {
        buscador.addEventListener("input", filtrar);
    }

    cargarProductos();
});