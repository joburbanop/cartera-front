import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // <-- 1. Importamos esto

@Component({
  selector: 'app-main-layout',
  standalone: true, // <-- Asegúrate de que tenga esto
  imports: [RouterOutlet], // <-- 2. Lo inyectamos aquí
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {}