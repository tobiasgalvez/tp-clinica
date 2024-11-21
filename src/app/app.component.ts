import { trigger, transition, style, animate } from '@angular/animations';
import { Component } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { LoadingService } from './loading.service';
import { CommonModule } from '@angular/common';
import { fader } from './route-animations';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  animations: [
    trigger('routeAnimation', [
      transition('* <=> *', [
        style({ opacity: 0, transform: 'translateX(-100%)' }),
        animate('500ms ease-in', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
    ,fader
  ]
})
export class AppComponent {
  title = 'tp-clinica';
  isLoading: boolean = false; // Definir la propiedad isLoading
  constructor(private router: Router, private loadingService: LoadingService) {}

  
  ngOnInit() {
    // Suscribirse al servicio de carga para recibir actualizaciones del estado de carga
    this.loadingService.loading$.subscribe((loading) => {
      this.isLoading = loading;
    });

    // Manejar eventos del Router para mostrar/ocultar el spinner al navegar
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.loadingService.showLoading();
      } else if (event instanceof NavigationEnd) {
        this.loadingService.hideLoading();
      }
    });
  }

  getRouterOutletState(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  }




}
