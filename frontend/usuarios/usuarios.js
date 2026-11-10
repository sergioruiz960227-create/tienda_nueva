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

    // 1. CERRAR SESIÓN CON CONFIRMACIÓN SEGURA
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

            if (texto === "Usuarios") {
                return; // Ya estamos aquí
            }

            e.preventDefault();

            if (texto === "Dashboard") {
                window.location.href = "../dashboard/dashboard.html";
            } else if (texto === "Inventario") {
                window.location.href = "../inventario/inventario.html";
            } else if (texto === "Ventas") {
                window.location.href = "../ventas/ventas.html";
            } else if (texto === "Clientes") {
                window.location.href = "../clientes/clientes.html";
            } else if (texto === "Créditos") {
                window.location.href = "../creditos/creditos.html";
            } else if (texto === "Reportes") {
                window.location.href = "../reportes/reportes.html";
            } else if (texto === "Configuración") {
                window.location.href = "../configuracion/configuracion.html";
            } else {
                alert("Módulo en construcción");
            }
        });
    });

    // 3. BOTÓN REGISTRAR USUARIO
    const btnRegistrarUsuario = document.getElementById("btnRegistrarUsuario");
    if (btnRegistrarUsuario) {
        btnRegistrarUsuario.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "../registro_usuario/registro_usuario.html?origen=admin";
        });
    }

    // 4. LISTADO DE USUARIOS DESDE LA BASE DE DATOS
    const cuerpoTabla = document.querySelector("tbody");
    const tarjetas = document.querySelectorAll(".cards .card h2");
    const buscador = document.getElementById("buscarUsuario");

    function codigoUsuario(id) {
        return "US" + String(id).padStart(3, "0");
    }

    function crearCelda(texto) {
        const celda = document.createElement("td");
        celda.textContent = texto;
        return celda;
    }

    function crearCeldaEstado(estado) {
        const celda = document.createElement("td");
        const etiqueta = document.createElement("span");
        etiqueta.className = estado === "Activo" ? "badge disponible" : "badge agotado";
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

    function crearFila(usuario) {
        const nombreCompleto = usuario.nombres + " " + usuario.apellidos;
        const acciones = document.createElement("td");
        acciones.className = "acciones-celda";
        acciones.append(
            crearBoton("btn-editar", "Editar Usuario", "✏️", () => editarUsuario(usuario)),
            crearBoton("btn-eliminar", "Eliminar Usuario", "🗑️", () => eliminarUsuario(usuario, nombreCompleto))
        );

        const fila = document.createElement("tr");
        fila.append(
            crearCelda(codigoUsuario(usuario.id_usuario)),
            crearCelda(nombreCompleto),
            crearCelda(usuario.telefono || "—"),
            crearCelda(usuario.usuario),
            crearCelda(usuario.rol),
            crearCeldaEstado(usuario.estado),
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

    function actualizarTarjetas(usuarios) {
        const cantidad = (condicion) => usuarios.filter(condicion).length;
        const valores = [
            usuarios.length,
            cantidad((u) => u.rol === "Administrador"),
            cantidad((u) => u.rol === "Vendedor"),
            cantidad((u) => u.estado === "Inactivo")
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
            const codigo = fila.cells[0].textContent.toLowerCase();
            const nombre = fila.cells[1].textContent.toLowerCase();
            const usuarioText = fila.cells[3].textContent.toLowerCase();
            const coincide = codigo.includes(termino) || nombre.includes(termino) || usuarioText.includes(termino);
            fila.style.display = coincide ? "" : "none";
        });
    }

    async function cargarUsuarios() {
        mostrarMensajeTabla("Cargando usuarios...");
        const respuesta = await llamarApi("/usuarios");

        if (respuesta.estado !== 200) {
            mostrarMensajeTabla(respuesta.mensaje || "No se pudieron cargar los usuarios.");
            return;
        }
        if (respuesta.datos.length === 0) {
            mostrarMensajeTabla("No hay usuarios registrados.");
        } else {
            cuerpoTabla.replaceChildren(...respuesta.datos.map(crearFila));
        }
        actualizarTarjetas(respuesta.datos);
        filtrar();
    }

    // 5. ACCIONES DE LA TABLA
    function editarUsuario(usuario) {
        irA("../registro_usuario/registro_usuario.html?origen=admin&id=" + usuario.id_usuario);
    }

    async function eliminarUsuario(usuario, nombre) {
        if (!confirm("¿Está seguro de que desea eliminar al usuario " + nombre + "?")) {
            return;
        }
        const respuesta = await llamarApi("/usuarios/" + usuario.id_usuario, "DELETE");
        alert(respuesta.mensaje || "No fue posible eliminar el usuario.");
        if (respuesta.ok) {
            cargarUsuarios();
        }
    }

    // 6. BUSCADOR EN TIEMPO REAL
    if (buscador) {
        buscador.addEventListener("input", filtrar);
    }

    cargarUsuarios();
});