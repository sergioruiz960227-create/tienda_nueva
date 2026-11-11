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

            if (texto === "Clientes") {
                return; // Ya estamos aquí
            }

            e.preventDefault();

            if (texto === "Dashboard") {
                window.location.href = "../dashboard/dashboard.html";
            } else if (texto === "Inventario") {
                window.location.href = "../inventario/inventario.html";
            } else if (texto === "Ventas") {
                window.location.href = "../ventas/ventas.html";
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

    // 3. BOTÓN REGISTRAR CLIENTE
    const btnRegistrar = document.getElementById("btnRegistrar");
    if (btnRegistrar) {
        btnRegistrar.addEventListener("click", function () {
            window.location.href = "../R_clientes/R_clientes.html";
        });
    }

    // 4. LISTADO DE CLIENTES DESDE LA BASE DE DATOS
    const cuerpoTabla = document.querySelector("tbody");
    const tarjetas = document.querySelectorAll(".cards .card h2");
    const buscador = document.getElementById("buscarCliente");

    // Solo el Administrador puede eliminar clientes
    const sesion = leerSesion();
    const esAdmin = Boolean(sesion) && sesion.usuario.rol === "Administrador";

    function codigoCliente(id) {
        return "CL" + String(id).padStart(3, "0");
    }

    // Convierte una fecha AAAA-MM-DD en DD/MM/AAAA
    function formatearFecha(fecha) {
        if (!fecha) {
            return "Sin compras";
        }
        const [anio, mes, dia] = fecha.split("-");
        return dia + "/" + mes + "/" + anio;
    }

    function crearCelda(texto) {
        const celda = document.createElement("td");
        celda.textContent = texto;
        return celda;
    }

    function crearEtiqueta(texto, clase) {
        const etiqueta = document.createElement("span");
        etiqueta.className = "badge " + clase;
        etiqueta.textContent = texto;
        return etiqueta;
    }

    // Estado del cliente; si además está en mora se agrega una segunda etiqueta
    function crearCeldaEstado(cliente) {
        const celda = document.createElement("td");
        celda.appendChild(crearEtiqueta(cliente.estado, cliente.estado === "Activo" ? "disponible" : "agotado"));
        if (cliente.en_mora) {
            celda.append(" ", crearEtiqueta("En mora", "stock-bajo"));
        }
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

    function crearFila(cliente) {
        const acciones = document.createElement("td");
        acciones.className = "acciones-celda";
        acciones.appendChild(crearBoton("btn-editar", "Editar Cliente", "✏️", () => editarCliente(cliente)));
        if (esAdmin) {
            acciones.appendChild(
                crearBoton("btn-eliminar", "Eliminar Cliente", "🗑️", () => eliminarCliente(cliente))
            );
        }

        const fila = document.createElement("tr");
        fila.append(
            crearCelda(codigoCliente(cliente.id_cliente)),
            crearCelda(cliente.nombre),
            crearCelda(cliente.telefono || "—"),
            crearCelda(cliente.correo || "—"),
            crearCelda(formatearFecha(cliente.ultima_compra)),
            crearCeldaEstado(cliente),
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

    function actualizarTarjetas(clientes) {
        const cantidad = (condicion) => clientes.filter(condicion).length;
        const valores = [
            clientes.length,
            cantidad((c) => c.tipo_cliente === "Frecuente"),
            cantidad((c) => c.limite_credito > 0),
            cantidad((c) => c.en_mora)
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
            const texto = [0, 1, 2, 3].map((i) => fila.cells[i].textContent.toLowerCase()).join(" ");
            fila.style.display = texto.includes(termino) ? "" : "none";
        });
    }

    async function cargarClientes() {
        mostrarMensajeTabla("Cargando clientes...");
        const respuesta = await llamarApi("/clientes");

        if (respuesta.estado !== 200) {
            mostrarMensajeTabla(respuesta.mensaje || "No se pudieron cargar los clientes.");
            return;
        }
        if (respuesta.datos.length === 0) {
            mostrarMensajeTabla("No hay clientes registrados.");
        } else {
            cuerpoTabla.replaceChildren(...respuesta.datos.map(crearFila));
        }
        actualizarTarjetas(respuesta.datos);
        filtrar();
    }

    // 5. ACCIONES DE LA TABLA
    function editarCliente(cliente) {
        irA("../R_clientes/R_clientes.html?id=" + cliente.id_cliente);
    }

    async function eliminarCliente(cliente) {
        if (!confirm("¿Está seguro de que desea eliminar al cliente " + cliente.nombre + "?")) {
            return;
        }
        const respuesta = await llamarApi("/clientes/" + cliente.id_cliente, "DELETE");
        alert(respuesta.mensaje || "No fue posible eliminar el cliente.");
        if (respuesta.ok) {
            cargarClientes();
        }
    }

    // 6. BUSCADOR EN TIEMPO REAL (código, nombre, teléfono y correo)
    if (buscador) {
        buscador.addEventListener("input", filtrar);
    }

    cargarClientes();
});