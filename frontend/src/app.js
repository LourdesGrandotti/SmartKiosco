document.addEventListener('DOMContentLoaded', () => {

    // ══════════════════════════════════════════════════════════
    // 0. AUTENTICACIÓN
    // ══════════════════════════════════════════════════════════

    let usuariosRegistrados = [];
    let usuarioActivo = null;

    const authView     = document.getElementById('auth-view');
    const appView      = document.getElementById('app-view');
    const formLogin    = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const loginError   = document.getElementById('login-error');
    const registerMsg  = document.getElementById('register-success');
    const registerLoading = document.getElementById('register-loading');
    const registerSpinner = registerLoading.querySelector('.register-spinner');
    const registerLoadingText = registerLoading.querySelector('.register-loading-text');

    function showAlert(el, text, show = true) {
        el.textContent = text;
        el.classList.toggle('visible', show);
    }

    function showAlertWithIcon(el, text, show = true) {
        if (show) {
            el.innerHTML = `<i data-feather="check-circle"></i><span>${text}</span>`;
            feather.replace();
        }
        el.classList.toggle('visible', show);
    }

    // Links cruzados entre tabs
    document.getElementById('go-register').addEventListener('click', () => {
        bootstrap.Tab.getOrCreateInstance(document.getElementById('tab-register')).show();
    });
    document.getElementById('go-login').addEventListener('click', () => {
        bootstrap.Tab.getOrCreateInstance(document.getElementById('tab-login')).show();
    });

    // "¿Olvidaste tu contraseña?"
    document.getElementById('forgot-btn').addEventListener('click', () => {
        const msg = document.getElementById('forgot-msg');
        msg.classList.toggle('visible');
        if (msg.classList.contains('visible')) feather.replace();
    });

    // Registro
    formRegister.addEventListener('submit', e => {
        e.preventDefault();
        const usuario  = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value.trim();

        if (usuariosRegistrados.find(u => u.usuario === usuario)) {
            showAlert(registerMsg, 'Este usuario ya existe. Iniciá sesión.');
            registerMsg.classList.remove('auth-alert--success');
            registerMsg.classList.add('auth-alert--error');
            registerMsg.classList.add('visible');
            return;
        }

        // Ocultar formulario, mostrar spinner
        formRegister.style.display = 'none';
        registerLoading.classList.add('visible');
        feather.replace();

        // Fase 1: "cargando..." (0.9s)
        setTimeout(() => {
            registerSpinner.classList.add('done');
            registerLoadingText.textContent = '¡Cuenta creada!';
        }, 900);

        // Fase 2: redirigir al login (1.8s total)
        setTimeout(() => {
            usuariosRegistrados.push({ usuario, password });
            registerLoading.classList.remove('visible');
            registerSpinner.classList.remove('done');
            registerLoadingText.textContent = 'Creando tu cuenta...';
            formRegister.style.display = '';
            formRegister.reset();
            bootstrap.Tab.getOrCreateInstance(document.getElementById('tab-login')).show();
        }, 1800);
    });

    // Login
    formLogin.addEventListener('submit', e => {
        e.preventDefault();
        const usuario  = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();
        const cuenta   = usuariosRegistrados.find(u => u.usuario === usuario);

        if (!cuenta) {
            showAlert(loginError, 'Usuario no registrado. Creá una cuenta primero.');
        } else if (cuenta.password !== password) {
            showAlert(loginError, 'Contraseña incorrecta. Intentá de nuevo.');
        } else {
            showAlert(loginError, '', false);
            usuarioActivo = usuario;
            authView.style.display = 'none';
            appView.classList.remove('d-none');
            actualizarSidebarUsuario(usuario);
            navigateTo('stock');
        }
    });

    // Cerrar sesión (botón en sidebar)
    document.getElementById('btn-logout').addEventListener('click', () => {
        usuarioActivo = null;
        appView.classList.add('d-none');
        authView.style.display = '';
        formLogin.reset();
        showAlert(loginError, '', false);
        bootstrap.Tab.getOrCreateInstance(document.getElementById('tab-login')).show();
    });

    /** Actualiza el avatar y nombre de usuario en el sidebar */
    function actualizarSidebarUsuario(nombre) {
        const avatar = document.getElementById('sidebar-user-avatar');
        const label  = document.getElementById('sidebar-user-name');
        if (avatar) avatar.textContent = nombre.charAt(0).toUpperCase();
        if (label)  label.textContent  = nombre;
    }

    // ══════════════════════════════════════════════════════════
    // 1. NAVEGACIÓN SPA — con scroll al top en cada cambio
    // ══════════════════════════════════════════════════════════

    const navItems = document.querySelectorAll('.nav-item[data-view]');
    const views    = document.querySelectorAll('.view-section');

    function navigateTo(viewId) {
        views.forEach(v => v.classList.add('hidden'));

        const target = document.getElementById(`view-${viewId}`);
        if (target) target.classList.remove('hidden');

        navItems.forEach(n => n.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Volver siempre al top del contenido al cambiar de vista
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.scrollTop = 0;
        window.scrollTo(0, 0);

        if (viewId === 'dashboard') initStockChart();

        feather.replace();
    }

    window.navTo = navigateTo;

    navItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            navigateTo(item.getAttribute('data-view'));
        });
    });

    // ══════════════════════════════════════════════════════════
    // 2. DASHBOARD — Chart.js
    // ══════════════════════════════════════════════════════════

    let stockChartInstance = null;
    let chartData = { ok: 0, low: 0, critical: 0 };

    function initStockChart() {
        const canvas = document.getElementById('stockChart');
        if (!canvas) return;
        if (stockChartInstance) stockChartInstance.destroy();

        stockChartInstance = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Stock Normal', 'Stock Bajo', 'Crítico'],
                datasets: [{
                    data: [chartData.ok, chartData.low, chartData.critical],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 0, hoverOffset: 14
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#e2e8f0', font: { family: "'Outfit', sans-serif", size: 13 }, padding: 18 }
                    }
                },
                cutout: '74%',
                animation: { animateScale: true, animateRotate: true }
            }
        });
    }

    // ══════════════════════════════════════════════════════════
    // 3. DRAG & DROP Y PROCESAMIENTO CSV
    // ══════════════════════════════════════════════════════════

    const dropzone         = document.getElementById('dropzone');
    const fileInput        = document.getElementById('file-input');
    const resultsContainer = document.getElementById('results-container');
    const tableBody        = document.getElementById('table-body');
    const fileNameBadge    = document.getElementById('file-name-badge');

    if (dropzone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
            dropzone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); });
            document.body.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); });
        });
        ['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, () => dropzone.classList.add('drag-over')));
        ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, () => dropzone.classList.remove('drag-over')));
        dropzone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
        fileInput.addEventListener('change', function () { handleFiles(this.files); });
    }

    function handleFiles(files) {
        if (!files.length) return;
        const file = files[0];
        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Por favor, seleccioná un archivo CSV válido.');
            return;
        }
        fileNameBadge.textContent = file.name;
        const reader = new FileReader();
        reader.onload = e => {
            dropzone.style.display = 'none';
            resultsContainer.classList.remove('d-none');
            analyzeStock(e.target.result);
            feather.replace();
        };
        reader.onerror = () => alert('Error al leer el archivo.');
        reader.readAsText(file);
    }

    function analyzeStock(csvText) {
        const lines = csvText.split('\n').filter(l => l.trim() !== '');
        let critical = 0, low = 0, ok = 0, html = '', globalStock = [];

        if (lines.length <= 1) {
            const demo = [
                { name: 'Coca-Cola 1.5L',       qty: 2,  status: 'critical', label: 'Crítico', action: 'Pedir inmediato', categoria: 'gaseosas'  },
                { name: 'Aquarius Pera 1.5L',    qty: 5,  status: 'low',      label: 'Bajo',    action: 'Reponer pronto',  categoria: 'bebidas'   },
                { name: 'Galletitas Chocolinas', qty: 24, status: 'ok',       label: 'Normal',  action: 'Mantener',        categoria: 'almacen'   },
                { name: 'Alfajor Arcor',         qty: 1,  status: 'critical', label: 'Crítico', action: 'Pedir inmediato', categoria: 'golosinas' }
            ];
            critical = 2; low = 1; ok = 1;
            globalStock = demo;
            demo.forEach(p => { html += buildRow(p.name, p.qty, p.status, p.label, p.action); });
        } else {
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim());
                if (cols.length < 2) continue;
                const name     = cols[0];
                const qty      = parseInt(cols[1], 10) || 0;
                const categoria = cols[2] ? cols[2].toLowerCase() : 'general';
                let status, label, action;
                if      (qty <= 3)  { status = 'critical'; label = 'Crítico'; action = 'Pedir inmediato'; critical++; }
                else if (qty <= 10) { status = 'low';      label = 'Bajo';    action = 'Reponer pronto';  low++; }
                else                { status = 'ok';       label = 'Normal';  action = 'Mantener';        ok++; }
                globalStock.push({ name, qty, status, categoria });
                html += buildRow(name, qty, status, label, action);
            }
        }

        document.getElementById('critical-count').textContent = critical;
        document.getElementById('low-count').textContent      = low;
        document.getElementById('ok-count').textContent       = ok;
        tableBody.innerHTML = html;

        const total = globalStock.length;
        setText('dash-total',    total);
        setText('dash-critical', critical);
        setText('dash-ok',       ok);

        chartData = { ok, low, critical };

        if (total > 0) {
            document.getElementById('dashboard-empty').classList.add('d-none');
            document.getElementById('dashboard-data').classList.remove('d-none');
        }

        generarSugerencias(globalStock);
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    const colorMap = { critical: 'var(--status-critical)', low: 'var(--status-low)', ok: 'var(--status-ok)' };

    function buildRow(name, qty, status, label, action) {
        return `
            <tr>
                <td><strong>${name}</strong></td>
                <td>${qty} unid.</td>
                <td>
                    <span class="status-dot dot-${status}"></span>
                    <span style="color:${colorMap[status]};font-weight:600;">${label}</span>
                </td>
                <td class="text-muted-sk">${action}</td>
            </tr>
        `;
    }

    // ══════════════════════════════════════════════════════════
    // 4. PROVEEDORES
    // ══════════════════════════════════════════════════════════

    let listaProveedores = [
        { id: 1, nombre: 'Arcor',          rubros: ['golosinas','galletas'],                                           visitaFisica: 'Lunes',   cierreVirtual: 'Viernes a las 18:00hs',  telefono: '08003332726', enlaceOficial: 'https://www.arcorencasa.com'  },
        { id: 2, nombre: 'Coca-Cola',       rubros: ['bebidas','gaseosas'],                                            visitaFisica: 'Jueves',  cierreVirtual: 'Miércoles a las 12:00hs',telefono: '08008882622', enlaceOficial: 'https://www.coca-cola.com.ar' },
        { id: 3, nombre: 'Mayorista Vital', rubros: ['general','alimentos','bebidas','gaseosas','golosinas','almacen'],visitaFisica: 'Martes',  cierreVirtual: 'Lunes a las 17:00hs',    telefono: '08102228482', enlaceOficial: 'https://www.vital.com.ar'     },
        { id: 4, nombre: 'Maxiconsumo',     rubros: ['general','alimentos','bebidas','gaseosas','golosinas','almacen'],visitaFisica: 'Viernes', cierreVirtual: 'Jueves a las 18:00hs',   telefono: '08107776294', enlaceOficial: 'https://maxiconsumo.com'      }
    ];

    const formProveedor      = document.getElementById('form-proveedor');
    const providersContainer = document.getElementById('providers-container');

    function renderProveedores() {
        if (!providersContainer) return;
        providersContainer.innerHTML = '';

        if (listaProveedores.length === 0) {
            providersContainer.innerHTML = '<p class="empty-state col-12">No hay proveedores. Agregá uno arriba.</p>';
            return;
        }

        listaProveedores.forEach(prov => {
            const tel    = (prov.telefono || '').replace(/\D/g, '');
            const wppUrl = `https://wa.me/549${tel}?text=Hola%2C%20te%20escribo%20desde%20SmartKiosco%20para%20consultar%20sobre%20el%20pedido`;
            const telText = prov.telefono && prov.telefono !== 'No asignado' ? prov.telefono : '—';

            const col = document.createElement('div');
            col.className = 'col-12 col-md-6';
            col.innerHTML = `
                <div class="supplier-card">
                    <div class="d-flex align-items-center gap-3">
                        <div class="supplier-avatar">${prov.nombre.charAt(0).toUpperCase()}</div>
                        <div>
                            <h3>${prov.nombre}</h3>
                            <p class="supplier-tel">Tel: ${telText}</p>
                        </div>
                    </div>
                    <div class="supplier-schedule">
                        <div class="schedule-row">
                            <i data-feather="truck"></i>
                            <span>Visita Física: <strong>${prov.visitaFisica}</strong></span>
                        </div>
                        <div class="schedule-row">
                            <i data-feather="clock"></i>
                            <span>Cierre Virtual: <strong>${prov.cierreVirtual}</strong></span>
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn-sk flex-fill justify-content-center" type="button"
                            onclick="window.open('${wppUrl}', '_blank')">
                            <i data-feather="message-circle"></i> WhatsApp
                        </button>
                        <button class="btn-sk btn-sk--danger flex-fill justify-content-center btn-del-prov"
                            type="button" data-id="${prov.id}">
                            <i data-feather="trash-2"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
            providersContainer.appendChild(col);
        });

        providersContainer.querySelectorAll('.btn-del-prov').forEach(btn => {
            btn.addEventListener('click', e => {
                if (!confirm('¿Seguro que querés eliminar este proveedor?')) return;
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                listaProveedores = listaProveedores.filter(p => p.id !== id);
                renderProveedores();
            });
        });

        feather.replace();
    }

    if (formProveedor) {
        formProveedor.addEventListener('submit', e => {
            e.preventDefault();
            const dias    = Array.from(document.querySelectorAll('.prov-day-check:checked')).map(cb => cb.value);
            const visita  = dias.length > 0 ? dias.join(', ') : 'No asignado';
            const closeDay = document.getElementById('prov-close-day').value;
            const closeHr  = document.getElementById('prov-close-hr').value;

            listaProveedores.push({
                id:            Date.now(),
                nombre:        document.getElementById('prov-name').value.trim(),
                rubros:        ['general'],
                visitaFisica:  visita,
                cierreVirtual: `${closeDay} a las ${closeHr}hs`,
                telefono:      document.getElementById('prov-phone').value.trim() || 'No asignado',
                enlaceOficial: document.getElementById('prov-url').value.trim() || ''
            });
            formProveedor.reset();
            renderProveedores();
        });

        renderProveedores();
    }

    // ══════════════════════════════════════════════════════════
    // 5. COMPARADOR DE PRECIOS
    //    Siempre muestra 3 cotizaciones por producto,
    //    completando con proveedores generales si hacen falta.
    // ══════════════════════════════════════════════════════════

    function generarSugerencias(stockData) {
        const container = document.getElementById('offers-container');
        if (!container) return;

        const criticos = stockData.filter(p => p.status === 'critical');
        container.innerHTML = '';

        if (criticos.length === 0) {
            container.innerHTML = '<p class="empty-state">Stock saludable. No hay productos en estado crítico actualmente.</p>';
            return;
        }

        criticos.forEach(prod => {
            const cat = prod.categoria || 'general';

            // Proveedores específicos de la categoría
            let aptos = listaProveedores.filter(pv =>
                pv.rubros && (pv.rubros.includes(cat) || pv.rubros.includes('general'))
            );

            // Si hay menos de 3, completar con cualquier proveedor
            if (aptos.length < 3) {
                const extras = listaProveedores.filter(pv => !aptos.includes(pv));
                aptos = [...aptos, ...extras].slice(0, 3);
            }

            // Tomar exactamente 3
            const pool = aptos.slice(0, 3);
            if (!pool.length) return;

            const cotizaciones = pool
                .map(pv => ({ pv, precio: prod.name.length * 500 + Math.floor(Math.random() * 3000) }))
                .sort((a, b) => a.precio - b.precio);

            const mejor = cotizaciones[0];

            // Siempre col-4 para que entren 3 por fila
            const bidsHTML = cotizaciones.map(c => {
                const isBest = c === mejor;
                return `
                    <div class="col-12 col-md-4">
                        <div class="bid-card ${isBest ? 'bid-card--best' : ''}">
                            ${isBest ? '<div class="best-badge"><i data-feather="star"></i> Mejor Oferta</div>' : ''}
                            <h5>${c.pv.nombre}</h5>
                            <p class="bid-price">$${c.precio.toLocaleString('es-AR')}</p>
                            <p class="bid-delivery">Entrega: ${c.pv.visitaFisica}</p>
                            <button class="btn-sk mt-auto" type="button"
                                style="width:100%;justify-content:center;"
                                onclick="window.open('${c.pv.enlaceOficial || '#'}', '_blank')">
                                Ir a comprar
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            const card = document.createElement('div');
            card.className = 'offer-card';
            card.innerHTML = `
                <div class="offer-card-header">
                    <h2>${prod.name}</h2>
                    <span class="badge-sk badge-sk--critical">Stock Crítico: ${prod.qty} unidades</span>
                </div>
                <div class="row g-3 row-cols-3">${bidsHTML}</div>
            `;
            container.appendChild(card);
        });

        feather.replace();
    }

}); // fin DOMContentLoaded

// ══════════════════════════════════════════════════════════════
// GLOBAL
// ══════════════════════════════════════════════════════════════
window.resetUpload = function () {
    const dz = document.getElementById('dropzone');
    const rc = document.getElementById('results-container');
    const fi = document.getElementById('file-input');
    if (dz) dz.style.display = '';
    if (rc) rc.classList.add('d-none');
    if (fi) fi.value = '';
};
