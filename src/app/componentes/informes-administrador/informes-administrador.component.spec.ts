import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InformesAdministradorComponent } from './informes-administrador.component';

describe('InformesAdministradorComponent', () => {
  let component: InformesAdministradorComponent;
  let fixture: ComponentFixture<InformesAdministradorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InformesAdministradorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InformesAdministradorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
