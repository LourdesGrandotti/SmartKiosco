document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. LÓGICA DE AUTENTICACIÓN (LOGIN / REGISTRO)
    // ==========================================
    // Arreglo global (en memoria) para guardar usuarios
    let usuariosRegistrados = [];

    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const loginError = document.getElementById('login-error');
    const registerSuccess = document.getElementById('register-success');

    // Función para alternar pestañas
    function switchToTab(isLogin) {
        if (isLogin) {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            formLogin.style.display = 'block';
            formRegister.style.display = 'none';
        } else {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            formRegister.style.display = 'block';
            formLogin.style.display = 'none';
        }
        // Ocultar alertas preventivamente
        loginError.style.display = 'none';
        registerSuccess.style.display = 'none';
    }

    // Eventos Click en TABS
    tabLogin.addEventListener('click', () => switchToTab(true));
    tabRegister.addEventListener('click', () => switchToTab(false));

    // Lógica de Registro (Submit)
    formRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        const usuario = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value.trim();
        
        // Verificamos si ya existe el usuario para no duplicar
        const existe = usuariosRegistrados.find(u => u.usuario === usuario);
        if (existe) {
            alert('Atención: Este usuario ya se encuentra registrado.');
            return;
        }

        // 1. Guardamos en el arreglo (memoria temporal)
        usuariosRegistrados.push({ usuario, password });
        
        // 2. Mostramos mensaje de éxito dinámico
        registerSuccess.textContent = '¡Registro exitoso! Ya podés iniciar sesión.';
        registerSuccess.style.display = 'block';
        formRegister.reset(); // Limpiar el form
        
        // 3. Volvemos al Login automáticamente despues de 1.5s
        setTimeout(() => {
            switchToTab(true);
        }, 1500);
    });

    // Lógica de Login (Submit)
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const usuario = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();
        
        // Verificamos si el usuario existe en 'usuariosRegistrados'
        const cuentaExistente = usuariosRegistrados.find(u => u.usuario === usuario);
        
        if (!cuentaExistente) {
            // Usuario no encontrado
            loginError.textContent = "Este usuario no está registrado. Si eres nuevo, por favor crea una cuenta en la sección 'Registrarse' primero";
            loginError.style.display = 'block';
        } else if (cuentaExistente.password !== password) {
            // Usuario existe, pero la contraseña no coincide
            loginError.textContent = "Contraseña incorrecta";
            loginError.style.display = 'block';
        } else {
            // Ingreso exitoso: mostramos Panel de Control
            authView.style.display = 'none';
            
            // Para mostrar la app.
            appView.style.display = ''; 
            
            // Navegar directamente a la Carga de Stock como vista predeterminada
            navigateTo('stock');
        }
    });

    // ==========================================
    // 1. LÓGICA DE NAVEGACIÓN (SPA)
    // ==========================================
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');

    function navigateTo(viewId) {
        // Ocultar todas las secciones
        views.forEach(view => view.classList.add('hidden'));
        
        // Mostrar sección destino
        const targetView = document.getElementById(`view-${viewId}`);
        if(targetView) targetView.classList.remove('hidden');

        // Actualizar botón activo en menú
        navItems.forEach(nav => nav.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
        if(activeNav) activeNav.classList.add('active');

        // Renderizar gráfico de dona si entramos al Dashboard
        if(viewId === 'dashboard') {
            initStockChart();
        }
        
        // Refrescar iconos de Feather
        if (typeof feather !== 'undefined') feather.replace();
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = item.getAttribute('data-view');
            navigateTo(viewId);
        });
    });

    // ==========================================
    // 2. LÓGICA DEL DASHBOARD (CHART.JS)
    // ==========================================
    let stockChartInstance = null;

    function initStockChart() {
        const canvas = document.getElementById('stockChart');
        if(!canvas) return;
        
        // Destruir instancia previa si existe para evitar superposiciones
        if(stockChartInstance) stockChartInstance.destroy();

        const ctx = canvas.getContext('2d');
        stockChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Stock Normal', 'Stock Bajo', 'Crítico'],
                datasets: [{
                    data: [120, 24, 8], // Datos de prueba (representan SKUs)
                    backgroundColor: [
                        '#10b981', // var(--status-ok)
                        '#f59e0b', // var(--status-low)
                        '#ef4444'  // var(--status-critical)
                    ],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#e2e8f0', // var(--text-primary)
                            font: {
                                family: "'Outfit', sans-serif",
                                size: 14
                            },
                            padding: 20
                        }
                    }
                },
                cutout: '75%', // Grosor de la dona
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });
    }

    // Inicialización por defecto
    initStockChart();


    // ==========================================
    // 3. LÓGICA DE DRAG & DROP Y PROCESAMIENTO
    // ==========================================
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const resultsContainer = document.getElementById('results-container');
    const tableBody = document.getElementById('table-body');
    const fileNameBadge = document.getElementById('file-name-badge');

    // Stats elements
    const criticalCountEl = document.getElementById('critical-count');
    const lowCountEl = document.getElementById('low-count');
    const okCountEl = document.getElementById('ok-count');

    if(dropzone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.add('drag-over'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.remove('drag-over'), false);
        });

        dropzone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files), false);
        fileInput.addEventListener('change', function() { handleFiles(this.files); });
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            const fileName = file.name.toLowerCase();
            fileNameBadge.textContent = file.name;
            
            if (fileName.endsWith('.csv')) {
                processCSVFile(file);
            } else {
                alert('Por favor, selecciona un reporte válido (Sólo formato CSV).');
            }
        }
    }

    // --- Procesadores por Tipo de Archivo ---

    function processCSVFile(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            dropzone.style.display = 'none';
            resultsContainer.style.display = 'block';
            analyzeStock(text);
        };
        reader.onerror = () => alert('Error al leer el archivo CSV.');
        reader.readAsText(file);
    }


    // --- Utilitarios ---
    function resetCounters() {
        criticalCountEl.textContent = '0';
        lowCountEl.textContent = '0';
        okCountEl.textContent = '0';
    }

    function analyzeStock(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        
        let critical = 0; let low = 0; let ok = 0;
        let tableHTML = '';
        let globalStock = []; // Temporal buffer para sugerencias

        if (lines.length <= 1) { // Fallback Data para pruebas visuales
            const demoProducts = [
                { name: 'Coca-Cola 1.5L', qty: 2, status: 'critical', text: 'Crítico', action: 'Pedir Inmediato', categoria: 'gaseosas' },
                { name: 'Aquarius Pera 1.5L', qty: 5, status: 'low', text: 'Bajo', action: 'Reponer pronto', categoria: 'bebidas' },
                { name: 'Galletitas Chocolinas', qty: 24, status: 'ok', text: 'Normal', action: 'Mantener', categoria: 'almacen' },
                { name: 'Alfajor Arcor', qty: 1, status: 'critical', text: 'Crítico', action: 'Pedir Inmediato', categoria: 'golosinas' }
            ];
            globalStock = demoProducts;
            critical = 2; low = 1; ok = 1;
            demoProducts.forEach(prod => { tableHTML += buildTableRow(prod.name, prod.qty, prod.status, prod.text, prod.action); });
        } else {
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim());
                if (cols.length >= 2) {
                    const productName = cols[0];
                    const qty = parseInt(cols[1], 10) || 0;
                    
                    let status = 'ok'; let text = 'Normal'; let action = 'Mantener';
                    if (qty <= 3) { status = 'critical'; text = 'Crítico'; action = 'Pedir Inmediato'; critical++; }
                    else if (qty <= 10) { status = 'low'; text = 'Bajo'; action = 'Reponer pronto'; low++; }
                    else { status = 'ok'; text = 'Normal'; action = 'Mantener'; ok++; }
                    
                    const categoria = cols.length > 2 ? cols[2].toLowerCase() : 'general';
                    globalStock.push({ name: productName, qty, status, categoria });
                    tableHTML += buildTableRow(productName, qty, status, text, action);
                }
            }
        }

        criticalCountEl.textContent = critical;
        lowCountEl.textContent = low;
        okCountEl.textContent = ok;
        tableBody.innerHTML = tableHTML;
        
        // Actualizar Dashboard Dinámico
        const d_ahorro = document.getElementById('dash-ahorro');
        if(d_ahorro) d_ahorro.textContent = globalStock.length;
        
        const d_alertas = document.getElementById('dash-alertas');
        if(d_alertas) d_alertas.textContent = critical;
        
        const d_visitas = document.getElementById('dash-visitas');
        if(d_visitas) d_visitas.textContent = ok;

        const dashEmpty = document.getElementById('dashboard-empty');
        const dashData = document.getElementById('dashboard-data');
        if (dashEmpty && dashData && globalStock.length > 0) {
            dashEmpty.classList.add('d-none');
            dashData.classList.remove('d-none');
        }
        
        if (typeof feather !== 'undefined') feather.replace();
        
        generarSugerenciasCriticas(globalStock);
    }

    function buildTableRow(name, qty, statusClass, statusText, action) {
        return `
            <tr>
                <td><strong>${name}</strong></td>
                <td>${qty} unid.</td>
                <td>
                    <div class="status-indicator">
                        <span class="status-dot dot-${statusClass}"></span>
                        <span style="color: var(--status-${statusClass})">${statusText}</span>
                    </div>
                </td>
                <td><span style="opacity: 0.8">${action}</span></td>
            </tr>
        `;
    }
    // ==========================================
    // 4. LÓGICA DE PROVEEDORES (AGENDA)
    // ==========================================
    let listaProveedores = [
        {
            id: 1,
            nombre: 'Arcor',
            rubros: ['golosinas', 'galletas'],
            visitaFisica: 'Lunes 10:00',
            cierreVirtual: 'Hoy 18:00',
            telefono: '0800-333-2726',
            enlaceOficial: 'https://www.arcorencasa.com'
        },
        {
            id: 2,
            nombre: 'Coca-Cola',
            rubros: ['bebidas', 'gaseosas'],
            visitaFisica: 'Jueves 11:30',
            cierreVirtual: 'Miércoles 12:00',
            telefono: '0800-888-2622',
            enlaceOficial: 'https://www.coca-cola.com.ar'
        },
        {
            id: 3,
            nombre: 'Mayorista Vital',
            rubros: ['general', 'alimentos', 'bebidas', 'gaseosas', 'golosinas', 'almacen'],
            visitaFisica: 'Martes 09:00',
            cierreVirtual: 'Faltan 4 horas',
            telefono: '0810-222-8482',
            enlaceOficial: 'https://www.vital.com.ar'
        },
        {
            id: 4,
            nombre: 'Maxiconsumo',
            rubros: ['general', 'alimentos', 'bebidas', 'gaseosas', 'golosinas', 'almacen'],
            visitaFisica: 'Viernes 14:00',
            cierreVirtual: 'Jueves 18:00',
            telefono: '0810-777-6294',
            enlaceOficial: 'https://maxiconsumo.com'
        }
    ];

    const formProveedor = document.getElementById('form-proveedor');
    const providersContainer = document.getElementById('providers-container');

    function renderProveedores() {
        if (!providersContainer) return;
        providersContainer.innerHTML = '';
        
        listaProveedores.forEach(prov => {
            const avatarLetra = prov.nombre.charAt(0).toUpperCase();
            const telefonoLimpio = prov.telefono.replace(/\D/g, ''); 
            const wppUrl = `https://wa.me/549${telefonoLimpio}?text=Hola,%20te%20escribo%20desde%20SmartKiosco%20para%20consultar%20sobre%20el%20pedido`;
            
            const card = document.createElement('div');
            card.className = 'supplier-card';
            card.innerHTML = `
                <div class="supplier-info">
                    <div class="supplier-avatar">${avatarLetra}</div>
                    <div>
                        <h3>${prov.nombre}</h3>
                        <p class="supplier-type">Tel: ${prov.telefono}</p>
                    </div>
                </div>
                <div class="supplier-schedule">
                    <div class="schedule-item">
                        <i data-feather="truck"></i>
                        <span>Visita Física: <strong>${prov.visitaFisica}</strong></span>
                    </div>
                    <div class="schedule-item">
                        <i data-feather="clock"></i>
                        <span>Cierre Virtual: <strong>${prov.cierreVirtual}</strong></span>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button class="btn-primary" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="window.open('${wppUrl}', '_blank')">
                        <i data-feather="message-circle" style="width: 16px; height: 16px;"></i> WhatsApp
                    </button>
                    <button class="btn-primary btn-delete-prov" data-id="${prov.id}" style="flex: 1; background: rgba(239, 68, 68, 0.1); color: var(--status-critical); border: 1px solid var(--status-critical); display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i data-feather="trash-2" style="width: 16px; height: 16px;"></i> Eliminar
                    </button>
                </div>
            `;
            providersContainer.appendChild(card);
        });

        // Re-attach delete listeners
        const deleteBtns = providersContainer.querySelectorAll('.btn-delete-prov');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (window.confirm('¿Seguro que deseas eliminar este proveedor de tu agenda?')) {
                    const idToDelete = parseInt(e.currentTarget.getAttribute('data-id'));
                    listaProveedores = listaProveedores.filter(p => p.id !== idToDelete);
                    renderProveedores();
                }
            });
        });

        if (typeof feather !== 'undefined') feather.replace();
    }

    if (formProveedor) {
        formProveedor.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Recolectar dias marcados del DOM de Bootstrap
            const marcados = document.querySelectorAll('.prov-day-check:checked');
            let visitasArr = [];
            marcados.forEach(cb => visitasArr.push(cb.value));
            const visitaString = visitasArr.length > 0 ? visitasArr.join(', ') : 'No asignado';

            const closeDay = document.getElementById('prov-close-day').value;
            const closeHr = document.getElementById('prov-close-hr').value;

            const nuevo = {
                id: Date.now(),
                nombre: document.getElementById('prov-name').value.trim(),
                rubros: ['general'],
                visitaFisica: visitaString,
                cierreVirtual: `${closeDay} a las ${closeHr}hs`,
                telefono: document.getElementById('prov-phone').value.trim() || 'No asignado',
                enlaceOficial: document.getElementById('prov-url').value.trim() || ''
            };
            listaProveedores.push(nuevo);
            formProveedor.reset();
            renderProveedores();
        });
        
        renderProveedores();
    }

    // ==========================================
    // 5. LÓGICA DE SUGERENCIAS CRÍTICAS
    // ==========================================
    function generarSugerenciasCriticas(stockData) {
        const offersContainer = document.getElementById('offers-grid-container');
        if (!offersContainer) return;

        // Filtrar aquellos que estén en alerta roja/crítica
        const criticos = stockData.filter(p => p.status === 'critical');

        offersContainer.innerHTML = ''; // Limpiar grilla

        if(criticos.length === 0) {
            offersContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; width: 100%; padding: 40px;">Stock saludable. No hay productos en estado crítico actualmente.</p>';
            return;
        }

        criticos.forEach(prod => {
            // Recorrer los proveedores actuales de la agenda para simular las cotizaciones
            if (listaProveedores.length === 0) return;

            const prodCat = prod.categoria || 'general';
            const proveedoresAptos = listaProveedores.filter(prov => {
                if (!prov.rubros) return true;
                return prov.rubros.includes(prodCat) || prov.rubros.includes('general');
            });

            if (proveedoresAptos.length === 0) return;

            const cotizaciones = proveedoresAptos.map(prov => {
                // Generamos un precio base simulado coherente para el producto (entre 5.000 y 15.000)
                const baseStr = prod.name.length * 500; 
                const precio = baseStr + Math.floor(Math.random() * 3000);
                return {
                    prov: prov,
                    precio: precio
                };
            });
            
            // Identificar el proveedor con el precio más bajo (destacarlo)
            cotizaciones.sort((a,b) => a.precio - b.precio);
            const mejorCotizacion = cotizaciones[0];

            let htmlCotizaciones = '';
            cotizaciones.forEach(cot => {
                const isBest = cot === mejorCotizacion;
                htmlCotizaciones += `
                    <div class="col">
                        <div class="provider-bid h-100 ${isBest ? 'best-offer' : ''}">
                            ${isBest ? '<div class="best-badge"><i data-feather="star"></i> Mejor Oferta</div>' : ''}
                            <h4>${cot.prov.nombre}</h4>
                            <p class="bid-price ${isBest ? 'mejor-precio' : ''}" ${isBest ? 'style="color: var(--status-ok); font-weight: bold;"' : ''}>$${cot.precio.toLocaleString('es-AR')}</p>
                            <p class="bid-delivery">Entrega: ${cot.prov.visitaFisica}</p>
                            <button class="btn-primary" style="width: 100%; margin-top: 10px;" onclick="window.open('${cot.prov.enlaceOficial || '#'}', '_blank')">Ir a comprar a la web oficial</button>
                        </div>
                    </div>
                `;
            });

            const card = document.createElement('div');
            card.className = 'offer-container';
            card.style.marginBottom = '20px';
            card.innerHTML = `
                <div class="offer-header">
                    <div class="product-info-offer">
                        <h2>${prod.name}</h2>
                        <span class="badge badge-critical" style="font-size: 1.1em; padding: 6px 12px;">Stock Crítico: ${prod.qty} unidades</span>
                    </div>
                </div>
                <div class="row row-cols-1 row-cols-md-3 g-3">
                    ${htmlCotizaciones}
                </div>
            `;
            offersContainer.appendChild(card);
        });

        if (typeof feather !== 'undefined') feather.replace();
    }
});

// Función global Bootstrap para reiniciar Carga de Stock
window.resetUpload = function() {
    document.getElementById('dropzone').style.display = 'flex';
    document.getElementById('results-container').style.display = 'none';
    document.getElementById('file-input').value = '';
};
