import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appRotateOnHover]',
  standalone: true
})
export class RotateOnHoverDirective {

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('mouseenter') onMouseEnter() {
    this.renderer.setStyle(this.el.nativeElement, 'transform', 'rotate(360deg)');
    this.renderer.setStyle(this.el.nativeElement, 'transition', 'transform 0.5s ease-in-out');
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.renderer.setStyle(this.el.nativeElement, 'transform', 'rotate(0deg)');
  }
}
