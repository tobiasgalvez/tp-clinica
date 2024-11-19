import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Firestore, collection, getDocs, doc, updateDoc } from '@angular/fire/firestore';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './turnos.component.html',
  styleUrl: './turnos.component.scss'
})
export class TurnosComponent {

  turnos: any[] = [];
  filterForm: FormGroup;

  constructor(private firestore: Firestore, private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      especialidad: [''],
      especialista: ['']
    });
  }

  ngOnInit(): void {
    this.cargarTurnos();
  }

  async cargarTurnos() {
    const turnosRef = collection(this.firestore, 'turnos');
    const querySnapshot = await getDocs(turnosRef);
    this.turnos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  filtrarTurnos() {
    const { especialidad, especialista } = this.filterForm.value;
    this.turnos = this.turnos.filter(turno => {
      return (!especialidad || turno.especialidad.toLowerCase().includes(especialidad.toLowerCase())) &&
             (!especialista || turno.nombreEspecialista.toLowerCase().includes(especialista.toLowerCase()));
    });
  }

  async cancelarTurno(turnoId: string, motivo: string) {
    const turnoDocRef = doc(this.firestore, 'turnos', turnoId);
    await updateDoc(turnoDocRef, { estado: 'Cancelado', motivoCancelacion: motivo });
    this.cargarTurnos();
  }

  verResenia(resenia: string) {
    // Mostrar la reseña utilizando SweetAlert2
    Swal.fire({
      title: 'Reseña del Turno',
      text: resenia,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      backdrop: false
    });
  }

}
