import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';

interface Breadcrumb {
  label: string;
  url: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent implements OnInit {
  
  isCarteraOpen = false;
  isInventarioOpen = false;
  breadcrumbs: Breadcrumb[] = [];

  // Diccionario base para rutas principales
  private routeLabels: Record<string, string> = {
    'dashboard': 'Dashboard',
    'projects': 'Proyectos',
    'lots': 'Lotes',
    'clientes': 'Clientes',
    'usuarios': 'Usuarios',
    'bank-accounts': 'Cuentas bancarias',
    'contracts': 'Contratos',
    'historial-pagos': 'Historial de pagos'
  };

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {}

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.breadcrumbs = this.buildBreadcrumbs();
    });
    // Inicializar al cargar
    this.breadcrumbs = this.buildBreadcrumbs();
  }

  private buildBreadcrumbs(): Breadcrumb[] {
    const root: ActivatedRoute = this.activatedRoute.root;
    const crumbs: Breadcrumb[] = [{ label: 'Panel', url: '/' }];
    let currentUrl = '';

    const getChild = (route: ActivatedRoute): void => {
      if (!route.firstChild) return;
      
      const child = route.firstChild;
      const segment = child.snapshot.url.map(s => s.path).join('/');
      
      if (segment) {
        currentUrl += '/' + segment;
        
        // 1. Obtener etiqueta base (ej: "Lotes")
        let label = this.routeLabels[segment] || segment;

        // 2. VERIFICAR SI HAY DATOS DINÁMICOS EN LA RUTA (Data o QueryParams)
        // Opción A: Si el componente hijo pasó un título explícito en data.title
        if (child.snapshot.data && child.snapshot.data['title']) {
          label = child.snapshot.data['title'];
        } 
        // Opción B: Si es un filtro por proyecto (ej: ?projectId=5&projectName=San+Miguel)
        else if (child.snapshot.queryParams['projectName']) {
          // Decodificar y formatear: "san-miguel" -> "San Miguel"
          const rawName = decodeURIComponent(child.snapshot.queryParams['projectName']);
          label = `${this.routeLabels[segment] || segment}: ${rawName}`;
        }
        // Opción C: Búsqueda simple (ej: ?search=San+Miguel)
        else if (child.snapshot.queryParams['search']) {
           const rawSearch = decodeURIComponent(child.snapshot.queryParams['search']);
           label = `${label} (${rawSearch})`;
        }

        crumbs.push({ label, url: currentUrl });
      }
      
      getChild(child);
    };

    getChild(root);
    return crumbs;
  }

  toggleCartera() { this.isCarteraOpen = !this.isCarteraOpen; }
  toggleInventario() { this.isInventarioOpen = !this.isInventarioOpen; }
}