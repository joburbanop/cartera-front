# Sincronización del Formulario de Clientes con Validaciones del Backend

## Resumen
Se corrigió el error HTTP 422 (Unprocessable Content) al crear clientes, sincronizando los nombres de campos del formulario Angular con las reglas de validación del backend Laravel.

## Problema Identificado

### Error Original
```
HTTP 422 Unprocessable Content
```

### Causa Raíz
El frontend enviaba campos con nombres incorrectos:
- ❌ Frontend enviaba: `document`
- ✅ Backend esperaba: `document_number`

## Reglas de Validación del Backend

### Archivo: `StoreCustomerRequest.php`

```php
public function rules(): array
{
    return [
        'document_type' => ['required', Rule::enum(DocumentType::class)],
        'document_number' => 'required|string|max:50|unique:customers,document_number',
        'name' => 'required|string|max:150',
        'phone' => 'required|string|max:50',
        'email' => 'nullable|email|max:150|unique:customers,email',
        'address' => 'nullable|string|max:255',
        'city' => 'nullable|string|max:100',
    ];
}
```

### Campos Requeridos
1. ✅ **document_type** - Enum: CC, CE, NIT, PASSPORT
2. ✅ **document_number** - Único en BD, max 50 caracteres
3. ✅ **name** - Max 150 caracteres
4. ✅ **phone** - Max 50 caracteres

### Campos Opcionales
5. **email** - Si se envía, debe ser único y válido
6. **address** - Max 255 caracteres
7. **city** - Max 100 caracteres

## Cambios Realizados en el Frontend

### 1. Servicio `customer.service.ts`

**Se creó una interfaz específica para el payload**:

```typescript
export interface CreateCustomerPayload {
  document_type: string;
  document_number: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
}

// Método actualizado
createCustomer(customer: CreateCustomerPayload | Partial<Customer>): Observable<any> {
  return this.http.post(this.apiUrl, customer);
}
```

### 2. Componente `clients.component.ts`

**Antes**:
```typescript
const customerData: Partial<Customer> = {
  name: this.customerForm.value.name || '',
  document: this.customerForm.value.document || '', // ❌ Campo incorrecto
  phone: this.customerForm.value.phone || '',
  // ...
};
```

**Después**:
```typescript
const customerData = {
  document_type: this.customerForm.value.document_type || 'CC',
  document_number: this.customerForm.value.document || '', // ✅ Nombre correcto
  name: this.customerForm.value.name || '',
  phone: this.customerForm.value.phone || '',
  email: this.customerForm.value.email || null,
  address: this.customerForm.value.address || null,
  city: this.customerForm.value.city || null
};
```

### 3. Manejo Mejorado de Errores 422

**Se agregó lógica para mostrar errores específicos de validación**:

```typescript
error: (err) => {
  console.error('Error al crear cliente:', err);
  this.isLoading = false;
  
  // Manejo específico de errores de validación (422)
  if (err.status === 422 && err.error?.errors) {
    // Laravel devuelve los errores en formato { campo: [mensajes] }
    const errors = err.error.errors;
    const errorMessages: string[] = [];
    
    // Mapear los nombres de campos del backend a mensajes amigables
    const fieldLabels: { [key: string]: string } = {
      'document_type': 'Tipo de documento',
      'document_number': 'Número de documento',
      'name': 'Nombre',
      'phone': 'Teléfono',
      'email': 'Email',
      'address': 'Dirección',
      'city': 'Ciudad'
    };
    
    for (const field in errors) {
      const label = fieldLabels[field] || field;
      const messages = errors[field];
      
      if (Array.isArray(messages)) {
        messages.forEach(msg => {
          errorMessages.push(`${label}: ${msg}`);
        });
      }
    }
    
    this.errorMessage = errorMessages.join('. ');
  } else {
    // Error genérico
    this.errorMessage = err.error?.message || 'No se pudo crear el cliente. Intente nuevamente.';
  }
}
```

### 4. Componente `contracts.component.ts`

También se actualizó el formulario de creación de clientes en el módulo de contratos:

```typescript
const payload = {
  name: String(rawCustomer.name ?? '').trim(),
  document_type: 'CC',
  document_number: documentValue, // ✅ Corregido
  phone: rawCustomer.phone?.trim() || '3000000000',
  email: rawCustomer.email?.trim() || null,
};
```

### 5. HTML - Tipos de Documento

Se actualizaron las opciones del select para coincidir con el Enum del backend:

**Antes**:
```html
<select formControlName="document_type">
  <option value="CC">CC</option>
  <option value="CE">CE</option>
  <option value="NIT">NIT</option>
  <option value="TI">TI</option> <!-- ❌ No existe en el Enum -->
</select>
```

**Después**:
```html
<select formControlName="document_type">
  <option value="CC">CC</option>
  <option value="CE">CE</option>
  <option value="NIT">NIT</option>
  <option value="PASSPORT">Pasaporte</option> <!-- ✅ Correcto -->
</select>
```

### 6. Estilos SCSS - Alertas de Error

Se mejoraron los estilos para mostrar errores multilínea:

```scss
.alert {
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;

  &.alert-error {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
    white-space: pre-wrap; // Permite múltiples líneas
  }
}
```

## Ejemplos de Errores de Validación

### Error: Documento Duplicado
**Request**:
```json
{
  "document_type": "CC",
  "document_number": "1234567890",
  "name": "Juan Pérez",
  "phone": "3001234567"
}
```

**Response (422)**:
```json
{
  "message": "The document number has already been taken.",
  "errors": {
    "document_number": [
      "The document number has already been taken."
    ]
  }
}
```

**UI muestra**:
```
Número de documento: The document number has already been taken.
```

### Error: Email Inválido
**Request**:
```json
{
  "document_type": "CC",
  "document_number": "9876543210",
  "name": "Ana Gómez",
  "phone": "3009876543",
  "email": "correo-invalido"
}
```

**Response (422)**:
```json
{
  "message": "The email field must be a valid email address.",
  "errors": {
    "email": [
      "The email field must be a valid email address."
    ]
  }
}
```

**UI muestra**:
```
Email: The email field must be a valid email address.
```

### Error: Múltiples Campos
**Request**:
```json
{
  "document_type": "CC",
  "document_number": "",
  "name": "",
  "phone": ""
}
```

**Response (422)**:
```json
{
  "message": "Validation errors",
  "errors": {
    "document_number": ["The document number field is required."],
    "name": ["The name field is required."],
    "phone": ["The phone field is required."]
  }
}
```

**UI muestra**:
```
Número de documento: The document number field is required. 
Nombre: The name field is required. 
Teléfono: The phone field is required.
```

## Mapeo de Campos: Frontend ↔ Backend

| Campo en Formulario Angular | Campo en Backend Laravel | Tipo | Requerido |
|-----------------------------|--------------------------|------|-----------|
| `document_type` | `document_type` | string (Enum) | ✅ Sí |
| `document` | `document_number` | string | ✅ Sí |
| `name` | `name` | string | ✅ Sí |
| `phone` | `phone` | string | ✅ Sí |
| `email` | `email` | string | ❌ No |
| `address` | `address` | string | ❌ No |
| `city` | `city` | string | ❌ No |

## Enum de Tipos de Documento

```php
enum DocumentType: string
{
    case CC = 'CC';         // Cédula de Ciudadanía
    case CE = 'CE';         // Cédula de Extranjería
    case NIT = 'NIT';       // Empresa/Persona Jurídica
    case PASSPORT = 'PASSPORT'; // Pasaporte
}
```

## Flujo Completo de Creación de Cliente

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular)                           │
│                                                                 │
│  1. Usuario llena formulario                                    │
│  2. Click en "Guardar cliente"                                  │
│  3. Validación local (required, email format)                   │
│  4. Mapeo de campos:                                            │
│     document → document_number                                  │
│  5. POST /api/customers                                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Laravel)                            │
│                                                                 │
│  1. StoreCustomerRequest valida campos                          │
│  2. Si error 422 → Devuelve { errors: {...} }                  │
│  3. Si OK → CreateCustomerDTO                                   │
│  4. CustomerService crea registro                               │
│  5. Response 201 con datos del cliente                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular)                           │
│                                                                 │
│  Si Success (201):                                              │
│    • Muestra mensaje "Cliente registrado correctamente"        │
│    • Recarga lista de clientes                                  │
│    • Cierra modal                                               │
│                                                                 │
│  Si Error (422):                                                │
│    • Extrae errors del response                                 │
│    • Mapea nombres técnicos a nombres amigables                 │
│    • Muestra en alerta roja                                     │
│    • Usuario corrige y reenvía                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Verificación

### 1. Probar creación exitosa
```bash
# Datos válidos
{
  "document_type": "CC",
  "document_number": "1234567890",
  "name": "Juan Pérez",
  "phone": "3001234567",
  "email": "juan@email.com"
}

# Resultado esperado: HTTP 201, cliente creado
```

### 2. Probar validación de documento único
```bash
# Crear mismo cliente dos veces
# Resultado esperado: HTTP 422 con mensaje "document number has already been taken"
```

### 3. Probar validación de email
```bash
# Email inválido
{
  "email": "correo-invalido"
}

# Resultado esperado: HTTP 422 con mensaje "must be a valid email address"
```

### 4. Probar campos requeridos
```bash
# Omitir campos requeridos
{
  "document_type": "CC"
}

# Resultado esperado: HTTP 422 con mensajes de campos faltantes
```

## Archivos Modificados

**Frontend**:
- ✅ `/src/app/core/services/customer.service.ts` - Nueva interfaz CreateCustomerPayload
- ✅ `/src/app/features/clients/clients.component.ts` - Mapeo correcto y manejo de errores
- ✅ `/src/app/features/clients/clients.component.html` - Tipos de documento actualizados
- ✅ `/src/app/features/clients/clients.component.scss` - Estilos de alertas mejorados
- ✅ `/src/app/features/sales/contracts/contracts.component.ts` - Corrección de payload

**Backend** (sin cambios):
- ✅ Validaciones ya estaban correctamente configuradas

## Próximos Pasos

1. **Validación de Email en Tiempo Real**: Agregar validación async para verificar si el email ya existe antes de enviar el formulario
2. **Validación de Documento en Tiempo Real**: Similar al email, verificar disponibilidad del documento
3. **Mensajes de Error Personalizados**: Crear traducciones personalizadas de mensajes de Laravel al español
4. **Feedback Visual en Campos**: Marcar en rojo los campos específicos que tienen error según la respuesta del backend
5. **Rate Limiting**: Implementar protección contra intentos masivos de creación
