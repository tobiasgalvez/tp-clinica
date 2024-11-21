import { trigger, transition, style, animate } from '@angular/animations';

export const fader = trigger('routeAnimations', [
  transition('* <=> *', [
    style({ opacity: 0, transform: 'translateY(100%)' }),
    animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);