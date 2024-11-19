import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { FormGroup, FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Firestore, collection, query, where, getDocs, doc, updateDoc, getDoc } from '@angular/fire/firestore';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mis-turnos-especialista',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './mis-turnos-especialista.component.html',
  styleUrls: ['./mis-turnos-especialista.component.scss']
})
export class MisTurnosEspecialistaComponent implements OnInit {

  turnos: any[] = [];
  filteredTurnos: any[] = [];  // Añadir esta propiedad para manejar los turnos filtrados
  filterForm: FormGroup;

  constructor(private firestore: Firestore, private auth: Auth, private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      especialidad: [''],
      paciente: ['']
    });
  }

  ngOnInit(): void {
    this.cargarTurnos();
  }

  async cargarTurnos() {
    const user = this.auth.currentUser;
    if (user) {
      const turnosRef = collection(this.firestore, 'turnos');
      const q = query(turnosRef, where('especialista', '==', user.uid));
      const querySnapshot = await getDocs(q);
      this.turnos = [];

      for (const turnoDoc of querySnapshot.docs) {
        const turno = { id: turnoDoc.id, ...turnoDoc.data() } as any;

        if (turno.paciente) {
          // Obtener el nombre del paciente desde la colección de pacientes
          const pacienteRef = doc(this.firestore, 'pacientes', turno.paciente);
          const pacienteDoc = await getDoc(pacienteRef);
          if (pacienteDoc.exists()) {
            const pacienteData = pacienteDoc.data();
            turno.nombrePaciente = `${pacienteData?.['nombre']} ${pacienteData?.['apellido']}`;
          }
        }

        this.turnos.push(turno);
      }

      this.filteredTurnos = [...this.turnos]; // Inicializar los turnos filtrados
    }
  }

  filtrarTurnos() {
    const { especialidad, paciente } = this.filterForm.value;

    this.filteredTurnos = this.turnos.filter(turno => {
      const cumpleEspecialidad = especialidad ? turno.especialidad.includes(especialidad) : true;
      const cumplePaciente = paciente ? turno.nombrePaciente.includes(paciente) : true;
      return cumpleEspecialidad && cumplePaciente;
    });
  }

  async cancelarTurno(turnoId: string, motivo: string) {
    const turnoDocRef = doc(this.firestore, 'turnos', turnoId);
    await updateDoc(turnoDocRef, { estado: 'Cancelado', motivoCancelacion: motivo });
    this.cargarTurnos();
  }

  async rechazarTurno(turnoId: string, motivo: string) {
    const turnoDocRef = doc(this.firestore, 'turnos', turnoId);
    await updateDoc(turnoDocRef, { estado: 'Rechazado', motivoRechazo: motivo });
    this.cargarTurnos();
  }

  async aceptarTurno(turnoId: string) {
    const turnoDocRef = doc(this.firestore, 'turnos', turnoId);
    await updateDoc(turnoDocRef, { estado: 'Aceptado' });
    this.cargarTurnos();
  }

  async finalizarTurno(turnoId: string, resenia: string) {
    const turnoDocRef = doc(this.firestore, 'turnos', turnoId);
    await updateDoc(turnoDocRef, { estado: 'Realizado', resenia: resenia });
    this.cargarTurnos();
  }

  verResenia(reseña: string) {
    // Mostrar la reseña utilizando SweetAlert2
    Swal.fire({
      title: 'Reseña del Turno',
      text: reseña,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      backdrop: false
    });
  }

}
