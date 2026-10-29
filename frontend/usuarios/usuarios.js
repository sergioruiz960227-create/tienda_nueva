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

       // MENÚ LATERAL INTERACTIVO UNIFICADO
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
        btnRegistrarUsuario.addEventListener("click", function(e) {
            e.preventDefault();
            window.location.href = "../registro_usuario/registro_usuario.html?origen=admin";
        });
    }

    // 4. INTERACCIONES DE ACCIONES EN LA TABLA
    // Botones de Editar (Lápiz)
    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.addEventListener("click", function() {
            alert("Módulo en construcción");
        });
    });

    // Botones de Eliminar (Caneca)
    document.querySelectorAll(".btn-eliminar").forEach(btn => {
        btn.addEventListener("click", function() {
            // Encuentra el nombre en la segunda celda (columna Nombre) de la fila actual
            let nombreUsuario = this.closest("tr").cells[1].textContent;
            let confirmar = confirm(`¿Está seguro de que desea eliminar al usuario ${nombreUsuario}?`);
            if (confirmar) {
                alert("Usuario eliminado con éxito.");
            }
        });
    });

    // 5. BUSCADOR EN TIEMPO REAL
    const buscador = document.getElementById("buscarUsuario");
    const filasTabla = document.querySelectorAll("tbody tr");

    if (buscador) {
        buscador.addEventListener("input", function () {
            const termino = this.value.toLowerCase().trim();

            filasTabla.forEach((fila) => {
                const codigo = fila.cells[0].textContent.toLowerCase();
                const nombre = fila.cells[1].textContent.toLowerCase();
                const usuarioText = fila.cells[3].textContent.toLowerCase();

                if (codigo.includes(termino) || nombre.includes(termino) || usuarioText.includes(termino)) {
                    fila.style.display = "";
                } else {
                    fila.style.display = "none";
                }
            });
        });
    }
});
