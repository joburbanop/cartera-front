# Integración del Módulo de Clientes con Backend

## Resumen
Se integró el módulo de Clientes del frontend Angular con el backend Laravel, añadiendo la capacidad de mostrar el lote asociado a cada cliente y su estado de cartera en tiempo real.

## Cambios en el Backend (Laravel)

### 1. Modelo `Customer.php`
**Archivo**: `/app/Models/Customer.php`

Se agregaron las siguientes relaciones:

```php
// --- Relaciones de Negocio ---
public function contracts()
{
    return $this->hasMany(Contract::class);
}

public function activeContract()
{
    return $this->hasOne(Contract::class)->where('status', 'active')->latest();
}
```

### 2. Resource `CustomerResource.php` (NUEVO)
**Archivo**: `/app/Http/Resources/CustomerResource.php`

Se creó un Resource para formatear la respuesta de la API con los datos necesarios:

**Lógica de estado de cartera**:
1. Si el cliente NO tiene contrato activo → `sin_contrato`
2. Si tiene promesas de pago vencidas (`is_paid = false` y `expected_date < hoy`) → `vencida`
3. Si tiene cuotas de amortización vencidas (status ≠ 'paid'/'cancelled' y `due_date < hoy`) → `vencida`
4. Si tiene contrato pero no tiene pagos vencidos → `al_dia`

**Estructura de respuesta**:
```json
{
  "id": 1,
  "nombre": "William Rojas",
  "documento": "1234567890",
  "telefono": "321 456 7890",
  "email": "william.rojas@email.com",
  "lote": "Lote 45",
  "estadoCartera": "vencida",
  "tipo_documento": "CC",
  "direccion": "Calle 123",
  "ciudad": "Bogotá"
}
```

### 3. Servicio `CustomerService.php`
**Archivo**: `/app/Services/CRM/CustomerService.php`

Se actualizó el método `getAllCustomers()` para cargar relaciones:

```php
public function getAllCustomers(int $perPage = 100)
{
    return Customer::with([
        'activeContract.lot',
        'activeContract.paymentPromises' => function ($query) {
            $query->where('is_paid', false)
                  ->whereDate('expected_date', '<', now());
        },
        'activeContract.installments' => function ($query) {
            $query->whereNotIn('status', ['paid', 'cancelled'])
                  ->whereDate('due_date', '<', now());
        }
    ])
    ->latest()
    ->paginate($perPage);
}
```

**Cambios**:
- ✅ Se incrementó el `$perPage` de 15 a 100 para mostrar más clientes por defecto
- ✅ Se carga el contrato activo con el lote asociado
- ✅ Se pre-filtran las promesas de pago vencidas
- ✅ Se pre-filtran las cuotas de amortización vencidas

### 4. Controlador `CustomerController.php`
**Archivo**: `/app/Http/Controllers/CRM/CustomerController.php`

Se actualizó el método `index()` para usar el Resource:

```php
use App\Http\Resources\CustomerResource;

public function index(): JsonResponse
{
    $customers = $this->customerService->getAllCustomers();

    return $this->successResponse(
        CustomerResource::collection($customers->items()),
        'Lista de clientes obtenida exitosamente.'
    );
}
```

## Cambios en el Frontend (Angular)

### 1. Componente `clients.component.ts`
**Archivo**: `/src/app/features/clients/clients.component.ts`

Se actualizó el método `cargarClientes()`:

**Antes**:
```typescript
// Mapeaba manualmente y siempre ponía lote = null y estadoCartera = 'sin_contrato'
// Agregaba datos de prueba si no había clientes
```

**Después**:
```typescript
cargarClientes(): void {
  this.isLoading = true;
  this.customerService.getCustomers().subscribe({
    next: (response) => {
      const customersData = response.data || response || [];
      
      // Los datos ya vienen en el formato correcto desde el backend
      this.clientes = customersData.map((customer: any) => ({
        id: customer.id,
        nombre: customer.nombre,
        documento: customer.documento,
        telefono: customer.telefono,
        email: customer.email,
        lote: customer.lote,
        estadoCartera: customer.estadoCartera
      }));

      this.clientesFiltrados = [...this.clientes];
      this.calcularKPIs();
      this.isLoading = false;
    },
    error: (err) => {
      console.error('Error cargando clientes:', err);
      this.errorMessage = 'No se pudieron cargar los clientes. Por favor, intente nuevamente.';
      this.clientes = [];
      this.clientesFiltrados = [];
      this.calcularKPIs();
      this.isLoading = false;
    }
  });
}
```

**Cambios**:
- ✅ Se eliminó el método `agregarDatosDePrueba()`
- ✅ Se consumen directamente los datos del backend
- ✅ Los campos `lote` y `estadoCartera` vienen calculados desde el backend
- ✅ Mejor manejo de errores con mensaje al usuario

### 2. Servicio `customer.service.ts`
**Archivo**: `/src/app/core/services/customer.service.ts`

No se requirieron cambios. El servicio ya tenía el método `getCustomers()` configurado correctamente.

## Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND                               │
│                                                                 │
│  ClientsComponent                                               │
│    ↓ ngOnInit()                                                 │
│    ↓ cargarClientes()                                           │
│    ↓                                                            │
│  CustomerService.getCustomers()                                 │
│    ↓ HTTP GET /api/customers                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                          BACKEND                                │
│                                                                 │
│  Route: GET /api/customers                                      │
│    ↓                                                            │
│  CustomerController@index                                       │
│    ↓                                                            │
│  CustomerService->getAllCustomers()                             │
│    ↓ Customer::with(['activeContract.lot', ...])               │
│    ↓                                                            │
│  CustomerResource::collection()                                 │
│    • Calcula estadoCartera (vencida/al_dia/sin_contrato)       │
│    • Obtiene nombre del lote si existe                          │
│    • Formatea todos los campos                                  │
│    ↓                                                            │
│  Response JSON                                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                        RESPUESTA                                │
│                                                                 │
│  {                                                              │
│    "data": [                                                    │
│      {                                                          │
│        "id": 1,                                                 │
│        "nombre": "William Rojas",                               │
│        "documento": "1234567890",                               │
│        "telefono": "321 456 7890",                              │
│        "lote": "Lote 45",                                       │
│        "estadoCartera": "vencida"                               │
│      }                                                          │
│    ]                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Estados de Cartera

### 🔴 `vencida`
- El cliente tiene promesas de pago o cuotas de amortización vencidas
- Se muestra en color rojo en la UI
- Aparece en el KPI "Con cartera vencida"

### 🟢 `al_dia`
- El cliente tiene un contrato activo
- No tiene pagos vencidos
- Se muestra en color verde en la UI

### ⚪ `sin_contrato`
- El cliente no tiene un contrato activo
- Se muestra en color gris en la UI
- No cuenta para el KPI "Con contrato activo"

## KPIs Calculados

### Total clientes
```typescript
this.totalClientes = this.clientes.length;
```

### Con contrato activo
```typescript
this.clientesConContrato = this.clientes.filter(c => c.lote !== null).length;
```

### Con cartera vencida
```typescript
this.clientesEnMora = this.clientes.filter(c => c.estadoCartera === 'vencida').length;
```

## Endpoint de la API

**URL**: `GET http://127.0.0.1:8000/api/customers`

**Respuesta**:
```json
{
  "success": true,
  "message": "Lista de clientes obtenida exitosamente.",
  "data": [
    {
      "id": 1,
      "nombre": "Juan Pérez",
      "documento": "1234567890",
      "telefono": "321 456 7890",
      "email": "juan@email.com",
      "lote": "Lote 45",
      "estadoCartera": "al_dia",
      "tipo_documento": "CC",
      "direccion": "Calle 123",
      "ciudad": "Bogotá"
    }
  ]
}
```

## Relaciones de Base de Datos

```
customers
  ↓ (one-to-many)
contracts
  ↓ (belongs-to)
lots
  
contracts
  ↓ (one-to-many)
contract_payment_promises
  
contracts
  ↓ (one-to-many)
amortization_installments
```

## Verificación

### Backend
```bash
# En el directorio cartera-api
php artisan route:list | grep customer

# Salida esperada:
# GET|HEAD  api/customers ....................... CRM\CustomerController@index
# POST      api/customers ....................... CRM\CustomerController@store
```

### Frontend
```bash
# En el directorio cartera-front
npm run build

# Verificar que compile sin errores críticos
# chunk-XXXXX.js | clients-component | ~24 kB | ~4.89 kB
```

### Prueba manual
1. Iniciar backend: `php artisan serve`
2. Iniciar frontend: `npm start`
3. Navegar a: `http://localhost:4200/clientes`
4. Verificar que:
   - ✅ Se carguen los clientes desde la API
   - ✅ Se muestre el lote asociado (si existe)
   - ✅ Los badges de estado sean correctos
   - ✅ Los KPIs se calculen correctamente

## Próximas Mejoras

1. **Paginación**: Implementar paginación en el frontend para manejar grandes volúmenes
2. **Filtros avanzados**: Agregar filtros por estado, con/sin contrato, etc.
3. **Vista de detalle**: Crear una vista detallada de cada cliente
4. **Caché**: Implementar caché en el backend para mejorar performance
5. **WebSockets**: Actualización en tiempo real cuando cambia el estado de un pago
6. **Exportación**: Generar reportes en Excel/PDF con la lista de clientes
