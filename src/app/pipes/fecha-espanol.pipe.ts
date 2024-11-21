import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fechaEspanol',
  standalone: true
})
export class FechaEspanolPipe implements PipeTransform {
  transform(value: Date): string {
    if (!value) return '';
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(value);
  }
}