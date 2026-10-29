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

    // 1. CERRAR SESIÓN CON VENTANA DE CONFIRMACIÓN OBLIGATORIA
    const cerrarSesion = document.getElementById("cerrarSesion");
    if (cerrarSesion) {
        cerrarSesion.addEventListener("click", function (e) {
            e.preventDefault(); // Evita la redirección inmediata
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

            if (texto === "Dashboard") {
                e.preventDefault();
                window.location.href = "../dashboard/dashboard.html";
                return;
            }
            if (texto === "Inventario") {
                e.preventDefault();
                window.location.href = "../inventario/inventario.html";
                return;
            }
            if (texto === "Ventas") {
                e.preventDefault();
                window.location.href = "../ventas/ventas.html";
                return;
            }
            if (texto === "Clientes") {
                e.preventDefault();
                window.location.href = "../clientes/clientes.html";
                return;
            }
            if (texto === "Créditos") {
                e.preventDefault();
                window.location.href = "../creditos/creditos.html";
                return;
            }
            if (texto === "Reportes") {
                e.preventDefault();
                window.location.href = "../reportes/reportes.html";
                return;
            }
            if (texto === "Usuarios") {
                e.preventDefault();
                window.location.href = "../usuarios/usuarios.html";
                return;
            }
            if (texto === "Configuración") {
                return; // Ya nos encontramos en esta pantalla
            }

            e.preventDefault();
            alert("Módulo en construcción");
        });
    });

    // 3. EVENTOS DE LOS SUBMÓDULOS DE CONFIGURACIÓN
    const btnGuardar = document.getElementById("btnGuardarConfiguracion");
    const linkPassword = document.getElementById("linkPassword");
    const linkCopia = document.getElementById("linkCopia");

    if (btnGuardar) {
        btnGuardar.addEventListener("click", function(e) {
            e.preventDefault();
            alert("Módulo en construcción");
        });
    }

    if (linkPassword) {
        linkPassword.addEventListener("click", function() {
            alert("Módulo en construcción");
        });
    }

    if (linkCopia) {
        linkCopia.addEventListener("click", function() {
            alert("Módulo en construcción");
        });
    }
});
