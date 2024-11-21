import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatoHorario',
  standalone: true
})
export class FormatoHorarioPipe implements PipeTransform {
  transform(rango: string): string {
    return rango.replace('-', 'a las');
  }
}
