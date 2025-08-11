import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'priceMin'
})
export class PriceMinPipe implements PipeTransform {
  transform(versiones: any[]): number {
    if (!Array.isArray(versiones) || versiones.length === 0) return 0;
    return Math.min(...versiones.map(v => v.Precio));
  }
}
