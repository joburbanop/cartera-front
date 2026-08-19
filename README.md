# SGC (Sistema de Gestión de Cartera) - Frontend

Aplicación web desarrollada como **Single-Page Application (SPA)** utilizando **Angular** para el **Sistema de Gestión de Cartera (SGC)**. Se comunica mediante una API REST en formato JSON con el backend de Laravel.

---

## 🚀 Arquitectura y Organización

El proyecto sigue una estructura modular y escalable orientada a características (*feature-driven*):

- **`src/app/core/`**: Servicios globales, interceptores HTTP (tokens, manejo de errores) y *Guards* de autenticación.
- **`src/app/shared/`**: Componentes visuales reutilizables, directivas y pipes globales (`components/`, `ui-kit/`).
- **`src/app/features/`**: Módulos funcionales de la aplicación:
  - `auth/`: Pantallas de inicio de sesión y control de permisos de usuario.
  - `dashboard/`: Pantalla principal con métricas de gerencia.
  - `inventory/`: Creación de proyectos, lotes, registro de clientes y contratos de compraventa.
  - `collection/`: Recepción de pagos mensuales, archivos adjuntos y gestión de la cobranza.

---

## 🛠️ Requisitos del Sistema

- **Node.js** (versión LTS recomendada)
- **npm** o **pnpm**
- **Angular CLI** (v18+)

---

## 📦 Instalación y Configuración Local

Sigue estos pasos para levantar el frontend en tu entorno local:

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/joburbanop/cartera-front.git
   cd sgci-front
   ```

2. **Instalar dependencias:**

   ```bash
   npm install
   ```

3. **Configurar las variables de entorno:**

   Ajusta la URL de la API de Laravel en los archivos de entorno de Angular (ej. `src/environments/environment.ts`):

   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://cartera-api.test/api'
   };
   ```

4. **Ejecutar el servidor de desarrollo:**

   ```bash
   ng serve
   ```

   La aplicación estará disponible en `http://localhost:4200`.

---

## 📄 Licencia

Este proyecto es software privativo / de uso interno bajo los términos establecidos por la organización.