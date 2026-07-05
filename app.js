// Estructura: Variables · Selectores DOM · Funciones · Eventos

// VARIABLES
// ══════════════════════════════════════════════════════════

const STORAGE_KEYS = {
    usuarios: 'sk_usuarios',
    sesion: 'sk_sesion_activa',
    proveedores: 'sk_proveedores',
    stock: 'sk_stock'
};

const PROVEEDORES_DEFAULT = [
    { id: 1, nombre: 'Arcor', rubros: ['golosinas', 'galletas'], visitaFisica: 'Lunes', cierreVirtual: 'Viernes a las 18:00hs', telefono: '08003332726', enlaceOficial: 'https://www.arcorencasa.com' },
    { id: 2, nombre: 'Coca-Cola', rubros: ['bebidas', 'gaseosas'], visitaFisica: 'Jueves', cierreVirtual: 'Miércoles a las 12:00hs', telefono: '08008882622', enlaceOficial: 'https://www.coca-cola.com.ar' },
    { id: 3, nombre: 'Mayorista Vital', rubros: ['general', 'alimentos', 'bebidas', 'gaseosas', 'golosinas', 'almacen'], visitaFisica: 'Martes', cierreVirtual: 'Lunes a las 17:00hs', telefono: '08102228482', enlaceOficial: 'https://www.vital.com.ar' },
    { id: 4, nombre: 'Maxiconsumo', rubros: ['general', 'alimentos', 'bebidas', 'gaseosas', 'golosinas', 'almacen'], visitaFisica: 'Viernes', cierreVirtual: 'Jueves a las 18:00hs', telefono: '08107776294', enlaceOficial: 'https://maxiconsumo.com' }
];

let usuariosRegistrados = cargarDesdeStorage(STORAGE_KEYS.usuarios, []);
let usuarioActivo = cargarDesdeStorage(STORAGE_KEYS.sesion, null);
let listaProveedores = cargarDesdeStorage(claveUsuario(STORAGE_KEYS.proveedores), PROVEEDORES_DEFAULT);

let stockChartInstance = null;
let chartData = { ok: 0, low: 0, critical: 0 };

const colorMap = { critical: 'var(--status-critical)', low: 'var(--status-low)', ok: 'var(--status-ok)' };

// SELECTORES DEL DOM
// ══════════════════════════════════════════════════════════

// — Auth
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const loginError = document.getElementById('login-error');
const registerMsg = document.getElementById('register-success');
const registerLoading = document.getElementById('register-loading');
const registerSpinner = registerLoading.querySelector('.register-spinner');
const registerLoadingText = registerLoading.querySelector('.register-loading-text');

// — Navegación
const navItems = document.querySelectorAll('.nav-item[data-view]');
const views = document.querySelectorAll('.view-section');

// — Stock / CSV
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const resultsContainer = document.getElementById('results-container');
const tableBody = document.getElementById('table-body');
const fileNameBadge = document.getElementById('file-name-badge');
const btnReset = document.getElementById('btn-reset-upload');

// — Proveedores
const formProveedor = document.getElementById('form-proveedor');
const providersContainer = document.getElementById('providers-container');

// FUNCIONES — Utilidades
// ══════════════════════════════════════════════════════════

function claveUsuario(base) {
    return usuarioActivo ? `${base}_${usuarioActivo}` : base;
}

function cargarDesdeStorage(clave, porDefecto) {
    try {
        const raw = localStorage.getItem(clave);
        return raw ? JSON.parse(raw) : porDefecto;
    } catch {
        return porDefecto;
    }
}

function guardarEnStorage(clave, valor) {
    localStorage.setItem(clave, JSON.stringify(valor));
}

function showAlert(el, text, show = true) {
    el.textContent = text;
    el.classList.toggle('visible', show);
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// FUNCIONES — Autenticación
// ══════════════════════════════════════════════════════════

function iniciarSesion(usuario) {
    usuarioActivo = usuario;
    guardarEnStorage(STORAGE_KEYS.sesion, usuario);
    restaurarDatosUsuario();
    authView.style.display = 'none';
    appView.classList.remove('d-none');
    actualizarSidebarUsuario(usuario);
    navigateTo('stock');
}

function cerrarSesion() {
    usuarioActivo = null;
    guardarEnStorage(STORAGE_KEYS.sesion, null);
    
    // Reiniciar lista de proveedores y stock/chartData para no dejar datos visibles
    listaProveedores = PROVEEDORES_DEFAULT;
    renderProveedores();
    
    resetUpload();
    chartData = { ok: 0, low: 0, critical: 0 };
    initStockChart();
    if (tableBody) tableBody.innerHTML = '';
    
    setText('critical-count', '0');
    setText('low-count', '0');
    setText('ok-count', '0');
    setText('dash-total', '0');
    setText('dash-critical', '0');
    setText('dash-ok', '0');
    
    const dbEmpty = document.getElementById('dashboard-empty');
    const dbData = document.getElementById('dashboard-data');
    if (dbEmpty) dbEmpty.classList.remove('d-none');
    if (dbData) dbData.classList.add('d-none');
    
    const offersContainer = document.getElementById('offers-container');
    if (offersContainer) {
        offersContainer.innerHTML = '<p class="empty-state">Cargá un reporte de stock primero para ver cotizaciones inteligentes.</p>';
    }

    appView.classList.add('d-none');
    authView.style.display = '';
    formLogin.reset();
    showAlert(loginError, '', false);
    bootstrap.Tab.getOrCreateInstance(document.getElementById('tab-login')).show();
}

function actualizarSidebarUsuario(nombre) {
    const avatar = document.getElementById('sidebar-user-avatar');
    const label = document.getElementById('sidebar-user-name');
    const mobileAvatar = document.getElementById('mobile-user-avatar');
    const mobileLabel = document.getElementById('mobile-user-name');

    const inicial = nombre.charAt(0).toUpperCase();
    if (avatar) avatar.textContent = inicial;
    if (label) label.textContent = nombre;
    if (mobileAvatar) mobileAvatar.textContent = inicial;
    if (mobileLabel) mobileLabel.textContent = nombre;
}

function restaurarDatosUsuario() {
    listaProveedores = cargarDesdeStorage(claveUsuario(STORAGE_KEYS.proveedores), PROVEEDORES_DEFAULT);
    renderProveedores();

    const stockGuardado = cargarDesdeStorage(claveUsuario(STORAGE_KEYS.stock), null);
    if (stockGuardado && stockGuardado.length > 0) {
        let critical = 0, low = 0, okCount = 0, html = '';

        stockGuardado.forEach(p => {
            let status = p.status;
            let label = p.label;
            let action = p.action;
            if (!label || !action) {
                if (status === 'critical') { label = 'Crítico'; action = 'Pedir inmediato'; }
                else if (status === 'low') { label = 'Bajo'; action = 'Reponer pronto'; }
                else { label = 'Normal'; action = 'Mantener'; }
            }

            if (status === 'critical') critical++;
            else if (status === 'low') low++;
            else okCount++;

            html += buildRow(p.name, p.qty, status, label, action);
        });

        document.getElementById('critical-count').textContent = critical;
        document.getElementById('low-count').textContent = low;
        document.getElementById('ok-count').textContent = okCount;
        tableBody.innerHTML = html;

        const total = stockGuardado.length;
        setText('dash-total', total);
        setText('dash-critical', critical);
        setText('dash-ok', okCount);

        chartData = { ok: okCount, low, critical };
        initStockChart();

        if (total > 0) {
            document.getElementById('dashboard-empty').classList.add('d-none');
            document.getElementById('dashboard-data').classList.remove('d-none');
        }

        if (dropzone) dropzone.style.display = 'none';
        if (resultsContainer) resultsContainer.classList.remove('d-none');

        generarSugerencias(stockGuardado);
        feather.replace();
    } else {
        resetUpload();
        
        document.getElementById('critical-count').textContent = '0';
        document.getElementById('low-count').textContent = '0';
        document.getElementById('ok-count').textContent = '0';
        tableBody.innerHTML = '';
        
        setText('dash-total', '0');
        setText('dash-critical', '0');
        setText('dash-ok', '0');
        
        chartData = { ok: 0, low: 0, critical: 0 };
        
        const dbEmpty = document.getElementById('dashboard-empty');
        const dbData = document.getElementById('dashboard-data');
        if (dbEmpty) dbEmpty.classList.remove('d-none');
        if (dbData) dbData.classList.add('d-none');
        
        const offersContainer = document.getElementById('offers-container');
        if (offersContainer) {
            offersContainer.innerHTML = '<p class="empty-state">Cargá un reporte de stock primero para ver cotizaciones inteligentes.</p>';
        }
    }
}

function restaurarSesion() {
    if (usuarioActivo) {
        restaurarDatosUsuario();
        authView.style.display = 'none';
        appView.classList.remove('d-none');
        actualizarSidebarUsuario(usuarioActivo);
        navigateTo('stock');
    }
}

// FUNCIONES — Navegación SPA
// ══════════════════════════════════════════════════════════

function navigateTo(viewId) {
    views.forEach(v => v.classList.add('hidden'));

    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.remove('hidden');

    navItems.forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (activeNav) activeNav.classList.add('active');

    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.scrollTop = 0;
    window.scrollTo(0, 0);

    if (viewId === 'dashboard') initStockChart();

    feather.replace();
}

// FUNCIONES — Dashboard / Chart
// ══════════════════════════════════════════════════════════

function initStockChart() {
    const canvas = document.getElementById('stockChart');
    if (!canvas || canvas.offsetParent === null) return;
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

// FUNCIONES — Stock / CSV
// ══════════════════════════════════════════════════════════

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
            { name: 'Coca-Cola 1.5L', qty: 2, status: 'critical', label: 'Crítico', action: 'Pedir inmediato', categoria: 'gaseosas' },
            { name: 'Aquarius Pera 1.5L', qty: 5, status: 'low', label: 'Bajo', action: 'Reponer pronto', categoria: 'bebidas' },
            { name: 'Galletitas Chocolinas', qty: 24, status: 'ok', label: 'Normal', action: 'Mantener', categoria: 'almacen' },
            { name: 'Alfajor Arcor', qty: 1, status: 'critical', label: 'Crítico', action: 'Pedir inmediato', categoria: 'golosinas' }
        ];
        critical = 2; low = 1; ok = 1;
        globalStock = demo;
        demo.forEach(p => { html += buildRow(p.name, p.qty, p.status, p.label, p.action); });
    } else {
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim());
            if (cols.length < 2) continue;
            const name = cols[0];
            const qty = parseInt(cols[1], 10) || 0;
            const categoria = cols[2] ? cols[2].toLowerCase() : 'general';
            let status, label, action;
            if (qty <= 3) { status = 'critical'; label = 'Crítico'; action = 'Pedir inmediato'; critical++; }
            else if (qty <= 10) { status = 'low'; label = 'Bajo'; action = 'Reponer pronto'; low++; }
            else { status = 'ok'; label = 'Normal'; action = 'Mantener'; ok++; }
            globalStock.push({ name, qty, status, label, action, categoria });
            html += buildRow(name, qty, status, label, action);
        }
    }

    document.getElementById('critical-count').textContent = critical;
    document.getElementById('low-count').textContent = low;
    document.getElementById('ok-count').textContent = ok;
    tableBody.innerHTML = html;

    const total = globalStock.length;
    setText('dash-total', total);
    setText('dash-critical', critical);
    setText('dash-ok', ok);

    chartData = { ok, low, critical };
    initStockChart();

    if (total > 0) {
        document.getElementById('dashboard-empty').classList.add('d-none');
        document.getElementById('dashboard-data').classList.remove('d-none');
    }

    generarSugerencias(globalStock);
    guardarEnStorage(claveUsuario(STORAGE_KEYS.stock), globalStock);
}

function resetUpload() {
    const dz = document.getElementById('dropzone');
    const rc = document.getElementById('results-container');
    const fi = document.getElementById('file-input');
    if (dz) dz.style.display = '';
    if (rc) rc.classList.add('d-none');
    if (fi) fi.value = '';
}

// FUNCIONES — Proveedores
// ══════════════════════════════════════════════════════════

function renderProveedores() {
    if (!providersContainer) return;
    providersContainer.innerHTML = '';

    if (listaProveedores.length === 0) {
        providersContainer.innerHTML = '<p class="empty-state col-12">No hay proveedores. Agregá uno arriba.</p>';
        return;
    }

    listaProveedores.forEach(prov => {
        const tel = (prov.telefono || '').replace(/\D/g, '');
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
                    <button class="btn-sk flex-fill justify-content-center btn-wpp" type="button" data-url="${wppUrl}">
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
            guardarEnStorage(claveUsuario(STORAGE_KEYS.proveedores), listaProveedores);
            renderProveedores();
        });
    });

    providersContainer.querySelectorAll('.btn-wpp').forEach(btn => {
        btn.addEventListener('click', e => {
            window.open(e.currentTarget.getAttribute('data-url'), '_blank');
        });
    });

    feather.replace();
}

// FUNCIONES — Comparador de precios
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

        let aptos = listaProveedores.filter(pv =>
            pv.rubros && (pv.rubros.includes(cat) || pv.rubros.includes('general'))
        );

        if (aptos.length < 3) {
            const extras = listaProveedores.filter(pv => !aptos.includes(pv));
            aptos = [...aptos, ...extras].slice(0, 3);
        }

        const pool = aptos.slice(0, 3);
        if (!pool.length) return;

        const cotizaciones = pool
            .map(pv => ({ pv, precio: prod.name.length * 500 + Math.floor(Math.random() * 3000) }))
            .sort((a, b) => a.precio - b.precio);

        const mejor = cotizaciones[0];

        const bidsHTML = cotizaciones.map(c => {
            const isBest = c === mejor;
            return `
                <div class="col-12 col-md-4">
                    <div class="bid-card ${isBest ? 'bid-card--best' : ''}">
                        ${isBest ? '<div class="best-badge"><i data-feather="star"></i> Mejor Oferta</div>' : ''}
                        <h5>${c.pv.nombre}</h5>
                        <p class="bid-price">$${c.precio.toLocaleString('es-AR')}</p>
                        <p class="bid-delivery">Entrega: ${c.pv.visitaFisica}</p>
                        <button class="btn-sk mt-auto btn-buy" type="button"
                            style="width:100%;justify-content:center;"
                            data-url="${c.pv.enlaceOficial || '#'}">
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

    container.querySelectorAll('.btn-buy').forEach(btn => {
        btn.addEventListener('click', e => {
            window.open(e.currentTarget.getAttribute('data-url'), '_blank');
        });
    });

    feather.replace();
}

// EVENTOS — Autenticación
// ══════════════════════════════════════════════════════════

document.getElementById('go-register').addEventListener('click', () => {
    bootstrap.Tab.getOrCreateInstance(document.getElementById('tab-register')).show();
});

document.getElementById('go-login').addEventListener('click', () => {
    bootstrap.Tab.getOrCreateInstance(document.getElementById('tab-login')).show();
});

document.getElementById('forgot-btn').addEventListener('click', () => {
    const msg = document.getElementById('forgot-msg');
    msg.classList.toggle('visible');
    if (msg.classList.contains('visible')) feather.replace();
});

formRegister.addEventListener('submit', e => {
    e.preventDefault();
    const usuario = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();

    if (usuariosRegistrados.find(u => u.usuario === usuario)) {
        showAlert(registerMsg, 'Este usuario ya existe. Iniciá sesión.');
        registerMsg.classList.remove('auth-alert--success');
        registerMsg.classList.add('auth-alert--error');
        registerMsg.classList.add('visible');
        return;
    }

    formRegister.style.display = 'none';
    registerLoading.classList.add('visible');
    feather.replace();

    setTimeout(() => {
        registerSpinner.classList.add('done');
        registerLoadingText.textContent = '¡Cuenta creada!';
    }, 900);

    setTimeout(() => {
        usuariosRegistrados.push({ usuario, password });
        guardarEnStorage(STORAGE_KEYS.usuarios, usuariosRegistrados);

        registerLoading.classList.remove('visible');
        registerSpinner.classList.remove('done');
        registerLoadingText.textContent = 'Creando tu cuenta...';
        formRegister.style.display = '';
        formRegister.reset();
        bootstrap.Tab.getOrCreateInstance(document.getElementById('tab-login')).show();
    }, 1800);
});

formLogin.addEventListener('submit', e => {
    e.preventDefault();
    const usuario = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const cuenta = usuariosRegistrados.find(u => u.usuario === usuario);

    if (!cuenta) {
        showAlert(loginError, 'Usuario no registrado. Creá una cuenta primero.');
    } else if (cuenta.password !== password) {
        showAlert(loginError, 'Contraseña incorrecta. Intentá de nuevo.');
    } else {
        showAlert(loginError, '', false);
        iniciarSesion(usuario);
    }
});

document.getElementById('btn-logout').addEventListener('click', cerrarSesion);

const logoutMobile = document.getElementById('btn-logout-mobile');
if (logoutMobile) {
    logoutMobile.addEventListener('click', () => {
        document.getElementById('btn-logout').click();
    });
}

// EVENTOS — Navegación
// ══════════════════════════════════════════════════════════

document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
        navigateTo(btn.getAttribute('data-nav'));
    });
});

navItems.forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(item.getAttribute('data-view'));
    });
});

// EVENTOS — Stock / CSV
// ══════════════════════════════════════════════════════════

if (dropzone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
        dropzone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); });
        document.body.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); });
    });
    ['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, () => dropzone.classList.add('drag-over')));
    ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, () => dropzone.classList.remove('drag-over')));
    dropzone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
    fileInput.addEventListener('change', function () { handleFiles(this.files); });

    const btnBrowse = document.getElementById('btn-browse-files');
    if (btnBrowse) {
        btnBrowse.addEventListener('click', () => fileInput.click());
    }
}

if (btnReset) {
    btnReset.addEventListener('click', resetUpload);
}

// EVENTOS — Proveedores
// ══════════════════════════════════════════════════════════

if (formProveedor) {
    formProveedor.addEventListener('submit', e => {
        e.preventDefault();
        const dias = Array.from(document.querySelectorAll('.prov-day-check:checked')).map(cb => cb.value);
        const visita = dias.length > 0 ? dias.join(', ') : 'No asignado';
        const closeDay = document.getElementById('prov-close-day').value;
        const closeHr = document.getElementById('prov-close-hr').value;

        listaProveedores.push({
            id: Date.now(),
            nombre: document.getElementById('prov-name').value.trim(),
            rubros: ['general'],
            visitaFisica: visita,
            cierreVirtual: `${closeDay} a las ${closeHr}hs`,
            telefono: document.getElementById('prov-phone').value.trim() || 'No asignado',
            enlaceOficial: document.getElementById('prov-url').value.trim() || ''
        });

        guardarEnStorage(claveUsuario(STORAGE_KEYS.proveedores), listaProveedores);
        formProveedor.reset();
        renderProveedores();
    });

    renderProveedores();
}

// INICIO — Restaurar sesión si ya estaba logueada
// ══════════════════════════════════════════════════════════

restaurarSesion();
feather.replace();
