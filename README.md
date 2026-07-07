# 📦 SmartKiosco

**Asistente de Abastecimiento Inteligente para kioscos minoristas.**

SmartKiosco es una SPA (Single Page Application) que ayuda a controlar el stock de un kiosco, detectar productos en estado crítico o bajo, comparar precios entre proveedores y visualizar todo en un panel de control con gráficos.

🔗 Demo: [smartkiosco.netlify.app](https://smartkiosco.netlify.app/)

---

## ✨ Funcionalidades

- **Autenticación local** — Registro e inicio de sesión, con datos guardados en el navegador de cada usuario (sin backend).
- **Carga de stock vía CSV** — Arrastrá y soltá (o seleccioná) un archivo `.csv` con tu inventario para analizarlo automáticamente.
- **Clasificación automática de stock**:
  - 🔴 **Crítico** (cantidad ≤ 3) → *Pedir inmediato*
  - 🟡 **Bajo** (cantidad ≤ 10) → *Reponer pronto*
  - 🟢 **Normal** → *Mantener*
- **Comparador de ofertas** — Análisis de precios sugeridos según los proveedores cargados.
- **Agenda de proveedores** — Alta de proveedores con días de visita, horario de cierre, WhatsApp y sitio web.
- **Panel de control (Dashboard)** — Resumen visual del inventario con gráfico de estado (Chart.js).
- **Aislamiento de datos por usuario** — Cada cuenta tiene su propio stock y proveedores guardados de forma independiente.
- **Diseño responsive** — Sidebar adaptable a escritorio y menú optimizado para mobile.

---

## 🛠️ Stack tecnológico

| Tecnología | Uso |
|---|---|
| **HTML5 / CSS3** | Estructura y estilos propios |
| **JavaScript (Vanilla)** | Lógica de la aplicación, sin frameworks |
| **Bootstrap 5.3.3** | Componentes de UI y grillas |
| **Chart.js** | Gráfico de salud del inventario |
| **Feather Icons** | Iconografía |
| **localStorage** | Persistencia de usuarios, sesión, stock y proveedores (sin backend/base de datos) |

---

## 📁 Estructura del proyecto

```
SmartKiosco/
├── index.html      # Estructura de la SPA (auth + vistas de la app)
├── index.css       # Estilos propios
├── app.js          # Lógica: autenticación, parseo de CSV, proveedores, dashboard
└── favicon.ico
```

---

## 🚀 Cómo usarlo localmente

Al ser un proyecto 100% frontend (sin build ni backend), no requiere instalación de dependencias.

1. Cloná el repositorio:
   ```bash
   git clone https://github.com/LourdesGrandotti/SmartKiosco.git
   ```
2. Abrí `index.html` en tu navegador (o usá una extensión como *Live Server* en VS Code para evitar restricciones de CORS al cargar archivos).
3. Registrate con un usuario nuevo y comenzá a cargar tu stock.

### Formato del CSV esperado

```csv
producto,cantidad,categoria
Coca-Cola 1.5L,2,gaseosas
Galletitas Chocolinas,24,almacen
```

> Si no se cargan filas válidas, la app muestra datos de ejemplo (demo) para que puedas ver cómo funciona el análisis.

---

## 📌 Notas

- Todos los datos (usuarios, stock, proveedores) se guardan **localmente en el navegador** del usuario mediante `localStorage`. No hay servidor ni base de datos: si cambiás de navegador o dispositivo, no vas a ver los mismos datos.
- Proyecto desarrollado como práctica individual en el marco de la carrera de Programación en **Fundación Mediapila**.

---

## ✍️ Autora

**Lourdes Grandotti**
