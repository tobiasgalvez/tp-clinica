import { Component, OnInit } from '@angular/core';
import { Firestore, collection, query, where, getDocs, updateDoc, doc, getDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { EstadoPipe } from '../../pipes/estado.pipe';
import { HoverColorDirective } from '../../directives/hover-color.directive';

interface Turno {
  id: string;
  especialidad: string;
  especialista: string;
  nombreEspecialista?: string;
  fechaHora: string;
  estado?: string;
  resenia?: string;
  encuestaCompletada?: boolean;
  atencionCalificada?: boolean;
  [key: string]: any;
}

@Component({
  selector: 'app-mis-turnos',
  templateUrl: './mis-turnos.component.html',
  styleUrls: ['./mis-turnos.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, EstadoPipe, HoverColorDirective]
})
export class MisTurnosComponent implements OnInit {
  turnos: Turno[] = [];
  filteredTurnos: Turno[] = [];
  filterForm: FormGroup;

  constructor(private firestore: Firestore, private auth: Auth, private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      especialidad: [''],
      especialista: [''],
      busquedaGeneral: ['']
    });
  }

  ngOnInit(): void {
    this.cargarTurnos();
  }

  async cargarTurnos() {
    const user = this.auth.currentUser;
    if (user) {
      const turnosRef = collection(this.firestore, 'turnos');
      const q = query(turnosRef, where('paciente', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const turnosData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Turno[];

      this.turnos = await Promise.all(
        turnosData.map(async turno => {
          const especialistaDocRef = doc(this.firestore, 'especialistas', turno.especialista);
          const especialistaDoc = await getDoc(especialistaDocRef);
          if (especialistaDoc.exists()) {
            const especialistaData = especialistaDoc.data();
            turno.nombreEspecialista = `${especialistaData['apellido']}, ${especialistaData['nombre']}`;
          }
          return turno;
        })
      );

      this.filteredTurnos = [...this.turnos]; // Inicializar los turnos filtrados
    }
  }

  async cancelarTurno(turnoId: string) {
    const { value: motivo } = await Swal.fire({
      title: 'Cancelar Turno',
      input: 'text',
      inputLabel: 'Motivo de cancelación',
      inputPlaceholder: 'Ingrese el motivo de la cancelación',
      showCancelButton: true
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
      confirmButtonText: 'Aceptar',
      backdrop: false
    });
  }

  async completarEncuesta(turnoId: string) {
    const { value: encuesta } = await Swal.fire({
      title: 'Completar Encuesta',
      input: 'textarea',
      inputLabel: 'Por favor, complete la encuesta',
      inputPlaceholder: 'Escriba su opinión sobre el turno',
      showCancelButton: true
    });

    if (encuesta) {
      const turnoDocRef = doc(this.firestore, 'turnos', turnoId);
      await updateDoc(turnoDocRef, { encuesta: encuesta, encuestaCompletada: true });
      this.cargarTurnos();
      Swal.fire('¡Gracias!', 'Su encuesta ha sido enviada correctamente', 'success');
    }
  }

  async calificarAtencion(turnoId: string) {
    const { value: calificacion } = await Swal.fire({
      title: 'Calificar Atención',
      input: 'textarea',
      inputLabel: 'Comentario sobre la atención',
      inputPlaceholder: 'Escriba su opinión sobre la atención del especialista',
      showCancelButton: true
    });

    if (calificacion) {
      const turnoDocRef = doc(this.firestore, 'turnos', turnoId);
      await updateDoc(turnoDocRef, { calificacion: calificacion, atencionCalificada: true });
      this.cargarTurnos();
      Swal.fire('¡Gracias!', 'Su calificación ha sido enviada correctamente', 'success');
    }
  }

  filtrarTurnos() {
    const { especialidad, especialista, busquedaGeneral } = this.filterForm.value;

    this.filteredTurnos = this.turnos.filter(turno => {
      // Filtrar por especialidad y especialista
      const cumpleEspecialidad = especialidad ? turno.especialidad.includes(especialidad) : true;
      const cumpleEspecialista = especialista ? turno.nombreEspecialista?.includes(especialista) : true;

      // Filtrar por búsqueda general en todos los campos relevantes
      let cumpleBusquedaGeneral = true;
      if (busquedaGeneral) {
        const busqueda = busquedaGeneral.toLowerCase();
        cumpleBusquedaGeneral = Object.values(turno).some(value =>
          typeof value === 'string' && value.toLowerCase().includes(busqueda)
        );
      }

      return cumpleEspecialidad && cumpleEspecialista && cumpleBusquedaGeneral;
    });
  }
}
