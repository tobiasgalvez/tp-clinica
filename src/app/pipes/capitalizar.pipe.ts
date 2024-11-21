
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'capitalizar',
  standalone: true,
})
export class CapitalizarPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    return value.replace(/\b\w/g, char => char.toUpperCase());
  }
}
