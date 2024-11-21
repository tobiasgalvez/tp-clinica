import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'estado',
  standalone: true
})
export class EstadoPipe implements PipeTransform {

  transform(value: string): string {
    switch (value) {
      case 'Pendiente':
        return 'En espera de confirmación';
      case 'Realizado':
        return 'Completado exitosamente';
      case 'Cancelado':
        return 'Turno cancelado';
      default:
        return value;
    }
  }
}
