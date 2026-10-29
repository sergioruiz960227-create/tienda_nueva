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

       // MENÚ LATERAL INTERACTIVO UNIFICADO
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


    // 3. BOTONES EN CONSTRUCCIÓN INTERNOS
    const btnAgregar = document.getElementById("btnAgregarProducto");
    const btnRegistrar = document.getElementById("btnRegistrarVenta");
    const btnCancelar = document.getElementById("btnCancelar");
    const btnEliminarItems = document.querySelectorAll(".btn-eliminar-item");

    if (btnAgregar) {
        btnAgregar.addEventListener("click", function() {
            alert("Módulo en construcción");
        });
    }

    if (btnRegistrar) {
        btnRegistrar.addEventListener("click", function() {
            alert("Módulo en construcción");
        });
    }

    if (btnCancelar) {
        btnCancelar.addEventListener("click", function() {
            if(confirm("¿Está seguro de que desea cancelar el registro de la venta?")) {
                window.location.href = "../ventas/ventas.html";
            }
        });
    }

    btnEliminarItems.forEach(btn => {
        btn.addEventListener("click", function() {
            alert("Módulo en construcción");
        });
    });
});
