# Módulo de Clientes

## Resumen
Módulo completo para la gestión de clientes (compradores y titulares de lotes) con diseño moderno usando Tailwind CSS.

## Archivos creados
- `/src/app/features/clients/clients.component.ts` - Lógica del componente
- `/src/app/features/clients/clients.component.html` - Vista del componente
- `/src/app/features/clients/clients.component.scss` - Estilos (usando Tailwind)
- `/src/app/features/clients/clients.spec.ts` - Pruebas unitarias

## Características implementadas

### 1. Vista principal
- **Cabecera con breadcrumbs**: Panel / Clientes
- **Título descriptivo**: "Clientes - Base de compradores y titulares de lotes"
- **Barra de búsqueda**: Con icono de lupa y fondo oscuro (#242424)
- **Botón de acción**: "Nuevo cliente" con color principal (#327365)

### 2. KPIs (Indicadores)
Tres tarjetas con métricas importantes:
- **Total clientes**: Cantidad total registrados en el sistema
- **Con contrato activo**: Clientes que son titulares de un lote
- **Con cartera vencida**: Clientes que requieren seguimiento (en rojo)

### 3. Tabla de clientes
Columnas:
- **Cliente**: Nombre completo y documento de identidad
- **Contacto**: Teléfono
- **Lote asociado**: Muestra el lote o "Sin contrato" (color teal #327365 si tiene lote)
- **Estado de cartera**: Badges dinámicos
  - 🟢 "Al día" (verde)
  - 🔴 "Vencida" (rojo)
  - ⚪ "N/A" (gris para clientes sin contrato)

### 4. Modal de nuevo cliente
Formulario completo con validaciones:
- Nombre completo (requerido)
- Tipo de documento (CC, CE, NIT, TI)
- Número de documento (requerido)
- Teléfono (requerido)
- Email (opcional, con validación de formato)
- Dirección (opcional)
- Ciudad (opcional)

### 5. Funcionalidades
- ✅ Búsqueda en tiempo real por nombre, documento, teléfono o lote
- ✅ Integración con `CustomerService` para listar y crear clientes
- ✅ Datos de prueba automáticos si no hay clientes en la API
- ✅ Cálculo automático de KPIs
- ✅ Validaciones de formulario con mensajes de error
- ✅ Feedback visual (loading, success, error messages)
- ✅ Diseño responsive

## Integración con la aplicación

### Ruta configurada
```typescript
{
  path: 'clientes',
  loadComponent: () => import('./features/clients/clients.component').then(m => m.ClientsComponent)
}
```

### Navegación
El enlace en el sidebar fue activado (se removió la clase "disabled" y el badge "Próx."):
```html
<a routerLink="/clientes" routerLinkActive="active" class="menu-link">
  <svg>...</svg>
  Clientes
</a>
```

## Datos de prueba
Si la API no devuelve datos o hay error, se muestran 3 clientes de ejemplo:
1. **William Rojas** - CC 1234567890 - Lote 45 - Cartera vencida
2. **Ana Muñoz** - CC 9876543210 - Lote 12 - Al día
3. **Luis Erazo** - CC 5554443332 - Sin contrato

## Colores del diseño
- **Color principal**: #327365 (teal/verde azulado)
- **Hover**: #25574c (más oscuro)
- **Fondo de búsqueda**: #242424 (negro suave)
- **Textos**: slate-900, slate-800, slate-600, slate-500, slate-400
- **Bordes**: slate-200, slate-100
- **Alertas rojas**: red-700, red-200, red-100
- **Estado OK**: green-700, green-100

## Próximas mejoras sugeridas
1. **Conectar con contratos**: Obtener el lote asociado desde el servicio de contratos
2. **Calcular estado de cartera**: Verificar pagos vencidos desde el backend
3. **Acciones por cliente**: Botones para ver detalles, editar, eliminar
4. **Paginación**: Para manejar grandes cantidades de clientes
5. **Filtros avanzados**: Por estado de cartera, con/sin contrato, etc.
6. **Exportar datos**: Generar reportes en Excel/PDF
7. **Vista de detalles**: Mostrar histórico completo del cliente

## Verificación
El módulo se compiló exitosamente:
```
chunk-SDO77QC7.js | clients-component | 15.95 kB | 4.25 kB
```

## Acceso
Navegar a: `http://localhost:4200/clientes`
