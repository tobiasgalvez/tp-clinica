import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appDisableButton]',
  standalone: true
})
export class DisableButtonDirective implements OnInit {
  @Input() appDisableButton: boolean = false;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    if (this.appDisableButton) {
      this.renderer.setAttribute(this.el.nativeElement, 'disabled', 'true');
      this.renderer.setStyle(this.el.nativeElement, 'cursor', 'not-allowed');
    }
  }
}
