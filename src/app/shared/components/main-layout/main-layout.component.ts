import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router'; 
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterModule, RouterOutlet, CommonModule], 
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent {
  isCarteraOpen = false;

  toggleCartera() {
    this.isCarteraOpen = !this.isCarteraOpen;
  }
}