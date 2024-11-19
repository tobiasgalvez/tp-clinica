import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, getDocs, query, where, addDoc, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-solicitar-turno',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './solicitar-turno.component.html',
  styleUrls: ['./solicitar-turno.component.scss']
})
export class SolicitarTurnoComponent {
  especialidades: any[] = [
    { nombre: 'Cardiología', imagen: 'assets/cardiologia.jpg' },
    { nombre: 'Pediatría', imagen: 'assets/pediatria.jpg' },
    { nombre: 'Neurología', imagen: 'assets/neurologia.jpg' }
  ];
  especialistas: any[] = [];
  horariosDisponibles: string[] = [];
  seleccionEspecialidad: string | null = null;
  seleccionEspecialista: any | null = null;
  seleccionDia: Date | null = null;
  diasDisponibles: Date[] = [];

  constructor(private firestore: Firestore, private auth: Auth) {}

  async seleccionarEspecialidad(especialidad: string) {
    this.seleccionEspecialidad = especialidad;

    try {
      // Obtener especialistas relacionados con la especialidad seleccionada
      const especialistasRef = collection(this.firestore, 'especialistas');
      const q = query(especialistasRef, where('especialidad', '==', especialidad)); // Usa '==' si el campo no es un array
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.warn('No se encontraron especialistas para la especialidad seleccionada.');
      }

      this.especialistas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('Especialistas cargados:', this.especialistas); // Verifica los datos cargados
    } catch (error) {
      console.error('Error al obtener especialistas:', error);
    }
  }

  seleccionarEspecialista(especialista: any) {
    this.seleccionEspecialista = especialista;

    // Generar los días disponibles (próximos 15 días)
    this.generarDiasDisponibles();
  }

  generarDiasDisponibles() {
    const hoy = new Date();
    this.diasDisponibles = [];
    for (let i = 0; i < 15; i++) {
      const dia = new Date(hoy);
      dia.setDate(hoy.getDate() + i);
      this.diasDisponibles.push(dia);
    }
  }

  seleccionarDia(dia: Date) {
    this.seleccionDia = dia;

    // Generar horarios disponibles para el día seleccionado
    this.horariosDisponibles = this.generarHorariosDisponibles();
  }

  generarHorariosDisponibles(): string[] {
    const horarios: string[] = [];
    if (!this.seleccionEspecialista || !this.seleccionEspecialista.disponibilidadHoraria) {
      return horarios; // Si no hay disponibilidad, devolvemos un array vacío
    }
  
    const disponibilidad = this.seleccionEspecialista.disponibilidadHoraria;
    const diaSeleccionado = this.seleccionDia ? this.seleccionDia.getDay() : null;
  
    if (diaSeleccionado !== null) {
      let diaTexto = '';
  
      if (diaSeleccionado >= 1 && diaSeleccionado <= 5) {
        diaTexto = 'Lunes a Viernes';
      } else if (diaSeleccionado === 6) {
        diaTexto = 'Sábado';
      }
  
      // Buscar la disponibilidad del especialista para el día seleccionado
      const horarioDia = disponibilidad.find((disp: any) => disp.dia === diaTexto);
      if (horarioDia) {
        horarioDia.horarios.forEach((horaObj: any) => {
          if (horaObj.estado === 'disponible') {
            horarios.push(`${this.seleccionDia?.toLocaleDateString()} - ${horaObj.hora}`);
          }
        });
      }
    }
  
    return horarios;
  }
  
  

  obtenerDiaTexto(dia: number): string {
    switch (dia) {
      case 0: return 'Domingo';
      case 1: return 'Lunes';
      case 2: return 'Martes';
      case 3: return 'Miércoles';
      case 4: return 'Jueves';
      case 5: return 'Viernes';
      case 6: return 'Sábado';
      default: return '';
    }
  }

  async solicitarTurno(horario: string) {
    const user = this.auth.currentUser;
    if (user && this.seleccionEspecialidad && this.seleccionEspecialista) {
      try {
        // Añadir el turno a la colección de turnos con el estado "pendiente"
        const turnoData = {
          paciente: user.uid,
          especialidad: this.seleccionEspecialidad,
          especialista: this.seleccionEspecialista.id,
          fechaHora: horario,
          estado: 'pendiente'  // Aquí agregas el estado inicial
        };
        await addDoc(collection(this.firestore, 'turnos'), turnoData);
  
        // Actualizar el estado del horario seleccionado a "ocupado" en la disponibilidad del especialista
        const especialistaRef = doc(this.firestore, 'especialistas', this.seleccionEspecialista.id);
        const especialistaDoc = await getDoc(especialistaRef);
        if (especialistaDoc.exists()) {
          const especialistaData = especialistaDoc.data();
          const disponibilidad = especialistaData['disponibilidadHoraria'];
  
          const diaTexto = this.seleccionDia && this.seleccionDia.getDay() >= 1 && this.seleccionDia.getDay() <= 5
            ? 'Lunes a Viernes' : 'Sábado';
  
          const diaDisponibilidad = disponibilidad.find((disp: any) => disp.dia === diaTexto);
          if (diaDisponibilidad) {
            const horarioObj = diaDisponibilidad.horarios.find((h: any) => `${this.seleccionDia?.toLocaleDateString()} - ${h.hora}` === horario);
            if (horarioObj) {
              horarioObj.estado = 'ocupado';
            }
          }
  
          // Guardar la disponibilidad actualizada en Firebase
          await updateDoc(especialistaRef, { disponibilidadHoraria: disponibilidad });
        }
  
        // Mostrar mensaje de éxito
        Swal.fire({
          title: '¡Turno solicitado!',
          text: 'Tu turno ha sido solicitado con éxito.',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });
  
        // Reiniciar estado
        this.seleccionEspecialidad = null;
        this.seleccionEspecialista = null;
        this.horariosDisponibles = [];
      } catch (error) {
        console.error('Error al solicitar el turno:', error);
        Swal.fire({
          title: 'Error',
          text: 'Hubo un error al solicitar el turno. Por favor, intenta nuevamente.',
          icon: 'error',
          confirmButtonText: 'Cerrar'
        });
      }
    }
  }
  
}
