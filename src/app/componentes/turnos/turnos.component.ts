import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormGroup, FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Firestore, collection, getDocs, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './turnos.component.html',
  styleUrls: ['./turnos.component.scss']
})
export class TurnosComponent {

  turnos: any[] = [];
  filteredTurnos: any[] = [];
  filterForm: FormGroup;
  isLoading: boolean = true;

  constructor(private firestore: Firestore, private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      especialidad: [''],
      especialista: ['']
    });
  }

  ngOnInit(): void {
    this.cargarTurnos();
    setTimeout(() => {
      this.isLoading = false;
    }, 2000);
  }

  async cargarTurnos() {
    const turnosRef = collection(this.firestore, 'turnos');
    const querySnapshot = await getDocs(turnosRef);
    const turnosConDetalles: any[] = [];

    for (const turnoDoc of querySnapshot.docs) {
      const turnoData = turnoDoc.data();
      const especialistaId = turnoData['especialista'];

      if (especialistaId) {
        // Obtener los detalles del especialista usando su UID
        const especialistaDocRef = doc(this.firestore, 'especialistas', especialistaId);
        const especialistaDoc = await getDoc(especialistaDocRef);

        if (especialistaDoc.exists()) {
          const especialistaData = especialistaDoc.data();
          turnoData['nombreEspecialista'] = `${especialistaData['nombre']} ${especialistaData['apellido']}`;
        } else {
          turnoData['nombreEspecialista'] = 'Especialista no encontrado';
        }
      }

      turnosConDetalles.push({ id: turnoDoc.id, ...turnoData });
    }

    this.turnos = turnosConDetalles;
    this.filteredTurnos = [...this.turnos]; // Inicializar los turnos filtrados con todos los turnos
  }

  filtrarTurnos() {
    const { especialidad, especialista } = this.filterForm.value;

    // Aplicar filtro sobre la lista original de turnos (`this.turnos`)
    this.filteredTurnos = this.turnos.filter(turno => {
      return (!especialidad || turno.especialidad.toLowerCase().includes(especialidad.toLowerCase())) &&
             (!especialista || turno.nombreEspecialista.toLowerCase().includes(especialista.toLowerCase()));
    });
  }

  async cancelarTurno(turnoId: string) {
    const { value: motivo } = await Swal.fire({
      title: 'Cancelar Turno',
      input: 'text',
      inputLabel: 'Motivo de cancelación',
      inputPlaceholder: 'Ingrese el motivo de la cancelación',
      showCancelButton: true,
      confirmButtonText: 'Cancelar Turno',
      cancelButtonText: 'Cerrar',
      inputValidator: (value) => {
        if (!value) {
          return 'Debe proporcionar un motivo';
        }
        return null;
      }
    });

    if (motivo) {
      const turnoDocRef = doc(this.firestore, 'turnos', turnoId);
      await updateDoc(turnoDocRef, { estado: 'Cancelado', motivoCancelacion: motivo });
      this.cargarTurnos();
      Swal.fire('Cancelado', 'El turno ha sido cancelado correctamente', 'success');
    }
  }

  verResenia(resenia: string) {
    Swal.fire({
      title: 'Reseña del Turno',
      text: resenia,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      backdrop: false
    });
  }
}
