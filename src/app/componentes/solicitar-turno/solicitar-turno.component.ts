import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, getDocs, query, where, addDoc, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import Swal from 'sweetalert2';
import { FechaEspanolPipe } from '../../pipes/fecha-espanol.pipe';
import { Router } from '@angular/router';

interface Especialista {
  id: string;
  nombre: string;
  apellido: string;
  especialidad: string;
  especialidad2?: string;
  [key: string]: any; // Para otras propiedades que no conocemos
}

@Component({
  selector: 'app-solicitar-turno',
  standalone: true,
  imports: [CommonModule, FechaEspanolPipe],
  templateUrl: './solicitar-turno.component.html',
  styleUrls: ['./solicitar-turno.component.scss']
})
export class SolicitarTurnoComponent implements OnInit {
  especialidades: any[] = [];
  especialistas: Especialista[] = [];
  horariosDisponibles: string[] = [];
  seleccionEspecialidad: string | null = null;
  seleccionEspecialista: Especialista | null = null;
  seleccionDia: Date | null = null;
  diasDisponibles: Date[] = [];
  pacientes: any[] = [];
  pacienteSeleccionado: any | null = null;
  esAdministrador: boolean = false;
  seleccionEspecialidadImagen: string | undefined;
  constructor(private firestore: Firestore, private auth: Auth, private router: Router) {}

  ngOnInit() {
    this.verificarRolUsuario();
    this.cargarEspecialidades();
  }

  async verificarRolUsuario() {
    const user = this.auth.currentUser;
    if (user) {
      const adminDocRef = doc(this.firestore, 'administradores', user.uid);
      const adminDoc = await getDoc(adminDocRef);
      if (adminDoc.exists()) {
        this.esAdministrador = true;
        await this.cargarPacientes();
      }
    }
  }

  async cargarPacientes() {
    const pacientesSnapshot = await getDocs(collection(this.firestore, 'pacientes'));
    this.pacientes = pacientesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async cargarEspecialidades() {
    try {
      const especialidadesRef = collection(this.firestore, 'especialidades');
      const querySnapshot = await getDocs(especialidadesRef);
      this.especialidades = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const imagen = this.obtenerImagenEspecialidad(data['nombre']);
        return { nombre: data['nombre'], imagen };
      });
    } catch (error) {
      console.error('Error al cargar especialidades:', error);
    }
  }

  obtenerImagenEspecialidad(nombre: string): string {
    switch (nombre) {
      case 'Cardiología':
        return 'assets/cardiologia.jpg';
      case 'Pediatría':
        return 'assets/pediatria.jpg';
      case 'Neurología':
        return 'assets/neurologia.jpg';
      default:
        return 'assets/default-specialty.jpg';
    }
  }

  async seleccionarEspecialidad(especialidad: string) {
    this.seleccionEspecialidad = especialidad;

    // Asignar imagen dependiendo de la especialidad
    // switch (especialidad) {
    //   case 'Cardiología':
    //     this.seleccionEspecialidadImagen = 'assets/cardiologia.jpg';
    //     break;
    //   case 'Pediatría':
    //     this.seleccionEspecialidadImagen = 'assets/pediatria.jpg';
    //     break;
    //   case 'Neurología':
    //     this.seleccionEspecialidadImagen = 'assets/neurologia.jpg';
    //     break;
    //   default:
    //     this.seleccionEspecialidadImagen = 'assets/default-specialty.jpg'; // Imagen por defecto
    //     break;
    // }
  
    try {
      // Obtener especialistas relacionados con la especialidad seleccionada
      const especialistasRef = collection(this.firestore, 'especialistas');
      const q = query(especialistasRef, where('especialidad', '==', especialidad));
      const querySnapshot = await getDocs(q);
  
      if (querySnapshot.empty) {
        console.warn('No se encontraron especialistas para la especialidad seleccionada.');
      }
      this.especialistas = querySnapshot.docs
  .map(doc => {
    const data = doc.data() as Especialista;
    return { ...data, id: doc.id }; // Colocamos id al final para garantizar que sea único
  })
  .filter(especialista =>
    especialista.especialidad === especialidad || especialista.especialidad2 === especialidad
  );

      console.log('Especialistas cargados:', this.especialistas); // Verifica los datos cargados
    } catch (error) {
      console.error('Error al obtener especialistas:', error);
    }
  }
  
  seleccionarPaciente(paciente: any) {
    this.pacienteSeleccionado = paciente;
  }

  seleccionarEspecialista(especialista: Especialista) {
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
    
    // Verificar si se ha seleccionado un especialista y una especialidad
    if (!this.seleccionEspecialista || !this.seleccionEspecialista['disponibilidadHoraria'] || !this.seleccionEspecialidad) {
      return horarios; // Si no hay disponibilidad o especialidad seleccionada, devolvemos un array vacío
    }
  
    const disponibilidad = this.seleccionEspecialista['disponibilidadHoraria'];
    const diaSeleccionado = this.seleccionDia ? this.seleccionDia.getDay() : null;
  
    if (diaSeleccionado !== null) {
      let diaTexto = '';
  
      if (diaSeleccionado >= 1 && diaSeleccionado <= 5) {
        diaTexto = 'Lunes a Viernes';
      } else if (diaSeleccionado === 6) {
        diaTexto = 'Sábado';
      }
  
      // Buscar la disponibilidad del especialista para la especialidad seleccionada y el día seleccionado
      const especialidadDisponibilidad = disponibilidad.find((disp: any) => disp.especialidad === this.seleccionEspecialidad);
      if (especialidadDisponibilidad) {
        const horarioDia = especialidadDisponibilidad.horarios.find((dia: any) => dia.dia === diaTexto);
        if (horarioDia) {
          horarioDia.horarios.forEach((horaObj: any) => {
            if (horaObj.estado === 'disponible') {
              const fechaFormateada = this.seleccionDia?.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              horarios.push(`${fechaFormateada} - ${horaObj.hora}`);
            }
          });
        }
      }
    }
  
    return horarios;
  }
  

  async solicitarTurno(horario: string) {
    const user = this.auth.currentUser;
    if ((user || this.pacienteSeleccionado) && this.seleccionEspecialidad && this.seleccionEspecialista) {
      try {
        // Añadir el turno a la colección de turnos con el estado "pendiente"
        const turnoData = {
          paciente: this.esAdministrador ? this.pacienteSeleccionado.id : user?.uid,
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
          const especialistaData = especialistaDoc.data() as Especialista;
          const disponibilidad = especialistaData['disponibilidadHoraria'];

          const diaTexto = this.seleccionDia && this.seleccionDia.getDay() >= 1 && this.seleccionDia.getDay() <= 5
            ? 'Lunes a Viernes' : 'Sábado';

          const diaDisponibilidad = disponibilidad.find((disp: any) =>
            disp.especialidad === this.seleccionEspecialidad && disp.dia === diaTexto
          );

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
        this.pacienteSeleccionado = null;
        this.router.navigate(['/home']);
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
