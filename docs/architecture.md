# 📘 Guía de Arquitectura Frontend - SGC (Angular)

Este documento describe la estructura física y las reglas de diseño obligatorias para el desarrollo del Frontend del **Sistema de Gestión de Cartera (SGC)**. El proyecto está construido bajo una arquitectura modular orientada a características (*feature-driven*), garantizando la separación de responsabilidades.

---

## 📂 Estructura de Directorios (`src/app/`)

El código fuente se organiza estrictamente bajo la siguiente jerarquía:

```text
src/app/
├── core/                  # 🔒 Núcleo global (Singleton Services y Seguridad)
│   ├── guards/            # Candados de navegación (Control de acceso por roles / JWT)
│   └── services/          # Conexión centralizada con la API REST de Laravel
│
├── features/              # 📺 Módulos funcionales (Pantallas completas / Smart Components)
│   ├── auth/              # Módulo de autenticación y sesiones
│   ├── collection/        # Módulo de recaudos, pagos y cobranza
│   ├── dashboard/         # Pantalla principal con métricas financieras
│   └── inventory/         # Módulo de gestión de proyectos, lotes y contratos
│
├── shared/                # 🧩 Bloques visuales reutilizables (Dumb Components)
│   ├── components/        # Componentes complejos reutilizables (ej. tablas, modales)
│   └── ui-kit/            # Elementos gráficos atómicos (botones, inputs, alertas)
│
├── app.config.ts          # Configuración global de la aplicación (Providers y Rutas)
└── app.component.html     # Contenedor raíz de la SPA