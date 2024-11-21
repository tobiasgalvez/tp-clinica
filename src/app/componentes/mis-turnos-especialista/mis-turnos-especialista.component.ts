import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { FormGroup, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Firestore, collection, query, where, getDocs, doc, updateDoc, getDoc, setDoc } from '@angular/fire/firestore';
import Swal from 'sweetalert2';
import { CapitalizarPipe } from '../../pipes/capitalizar.pipe';
import { FormatoHorarioPipe } from '../../pipes/formato-horario.pipe';
import { HoverColorDirective } from '../../directives/hover-color.directive';

@Component({
  selector: 'app-mis-turnos-especialista',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CapitalizarPipe, FormatoHorarioPipe, HoverColorDirective],
  templateUrl: './mis-turnos-especialista.component.html',
  styleUrls: ['./mis-turnos-especialista.component.scss']
})
export class MisTurnosEspecialistaComponent implements OnInit {

  turnos: any[] = [];
  filteredTurnos: any[] = [];
  pacientesAtendidos: any[] = [];
  filterForm: FormGroup;
  historiaClinicaForm?: FormGroup;
  pacienteSeleccionado?: any; // Paciente seleccionado para cargar la historia clínica
  filteredPacientesAtendidos: any[] = []; // Nueva propiedad
  isLoading: boolean = true;

  constructor(private firestore: Firestore, private auth: Auth, private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      especialidad: [''],
      paciente: [''],
      busquedaGeneral: ['']  // Agregar campo para búsqueda general
    });
  }

  ngOnInit(): void {
    this.cargarTurnos();
    setTimeout(() => {
      this.isLoading = false;
    }, 2000);
    this.filteredTurnos = [...this.turnos];
    this.filteredPacientesAtendidos = [...this.pacientesAtendidos];
  }

  async cargarTurnos() {
    const user = this.auth.currentUser;
    if (user) {
      const turnosRef = collection(this.firestore, 'turnos');
      const q = query(turnosRef, where('especialista', '==', user.uid));
      const querySnapshot = await getDocs(q);
      this.turnos = [];
      this.pacientesAtendidos = [];

      for (const turnoDoc of querySnapshot.docs) {
        const turno = { id: turnoDoc.id, ...turnoDoc.data() } as any;

        if (turno.paciente) {
          // Obtener el nombre del paciente desde la colección de pacientes
          const pacienteRef = doc(this.firestore, 'pacientes', turno.paciente);
          const pacienteDoc = await getDoc(pacienteRef);
          if (pacienteDoc.exists()) {
            const pacienteData = pacienteDoc.data();
            turno.nombrePaciente = `${pacienteData?.['nombre']} ${pacienteData?.['apellido']}`;

            // Verificar si ya existe una historia clínica para este paciente
            const historiasClinicasRef = collection(this.firestore, 'historiasClinicas');
            const historiasQuery = query(historiasClinicasRef, where('pacienteId', '==', turno.paciente));
            const historiaClinicaSnapshot = await getDocs(historiasQuery);
            let historiaClinica = null;
            if (!historiaClinicaSnapshot.empty) {
              historiaClinica = historiaClinicaSnapshot.docs[0].data();
            }

            // Añadir el paciente a la lista de pacientes atendidos si el turno está realizado
            if (turno.estado === 'Realizado' && !this.pacientesAtendidos.some(p => p.id === turno.paciente)) {
              this.pacientesAtendidos.push({ id: turno.paciente, nombre: turno.nombrePaciente, historiaClinica });
            }
          }
        }

        this.turnos.push(turno);
      }

      this.filteredTurnos = [...this.turnos];
    }
  }

  filtrarTurnos() {
    const { especialidad, paciente, busquedaGeneral } = this.filterForm.value;
  
    // Filtrar turnos
    this.filteredTurnos = this.turnos.filter(turno => {
      // Filtrar por especialidad y paciente
      const cumpleEspecialidad = especialidad ? turno.especialidad.includes(especialidad) : true;
      const cumplePaciente = paciente ? turno.nombrePaciente.includes(paciente) : true;
  
      // Filtrar por búsqueda general en todos los campos relevantes
      let cumpleBusquedaGeneral = true;
      if (busquedaGeneral) {
        const busqueda = busquedaGeneral.toLowerCase();
  
        // Verificar los campos del turno
        const contieneDatosTurno = Object.values(turno).some(value =>
          typeof value === 'string' && value.toLowerCase().includes(busqueda)
        );
  
        // Verificar los campos de la historia clínica si existen
        let contieneDatosHistoria = false;
        if (turno.historiaClinica) {
          contieneDatosHistoria = Object.values(turno.historiaClinica).some(value => {
            if (typeof value === 'string') {
              return value.toLowerCase().includes(busqueda);
            } else if (Array.isArray(value)) {
              // Si es un arreglo (datos dinámicos)
              return value.some(dato =>
                dato.clave.toLowerCase().includes(busqueda) || dato.valor.toLowerCase().includes(busqueda)
              );
            }
            return false;
          });
        }
  
        cumpleBusquedaGeneral = contieneDatosTurno || contieneDatosHistoria;
      }
  
      return cumpleEspecialidad && cumplePaciente && cumpleBusquedaGeneral;
    });
  
    // Filtrar pacientes atendidos
    this.filteredPacientesAtendidos = this.pacientesAtendidos.filter(paciente => {
      let cumpleBusquedaGeneral = true;
      if (busquedaGeneral) {
        const busqueda = busquedaGeneral.toLowerCase();
  
        // Verificar los campos del paciente atendido
        const contieneDatosPaciente = Object.values(paciente).some(value =>
          typeof value === 'string' && value.toLowerCase().includes(busqueda)
        );
  
        // Verificar los campos de la historia clínica si existen
        let contieneDatosHistoria = false;
        if (paciente.historiaClinica) {
          contieneDatosHistoria = Object.values(paciente.historiaClinica).some(value => {
            if (typeof value === 'string') {
              return value.toLowerCase().includes(busqueda);
            } else if (Array.isArray(value)) {
              // Si es un arreglo (datos dinámicos)
              return value.some(dato =>
                dato.clave.toLowerCase().includes(busqueda) || dato.valor.toLowerCase().includes(busqueda)
              );
            }
            return false;
          });
        }
  
        cumpleBusquedaGeneral = contieneDatosPaciente || contieneDatosHistoria;
      }
  
      return cumpleBusquedaGeneral;
    });
  }
  

  async finalizarTurno(turno: any) {
    const { value: resenia } = await Swal.fire({
      title: 'Finalizar Turno',
      input: 'textarea',
      inputLabel: 'Ingrese la reseña o comentario de la consulta y diagnóstico realizado',
      inputPlaceholder: 'Escriba aquí...',
      inputValidator: (value) => {
        if (!value) {
          return 'La reseña es obligatoria';
        }
        return null;
      },
      showCancelButton: true,
      confirmButtonText: 'Finalizar',
      cancelButtonText: 'Cancelar'
    });

    if (resenia) {
      // Actualizar el estado del turno a 'Realizado' y agregar la reseña
      const turnoDocRef = doc(this.firestore, 'turnos', turno.id);
      await updateDoc(turnoDocRef, { estado: 'Realizado', resenia });

      // Actualizar el estado del turno en las listas locales
      this.turnos = this.turnos.map(t => t.id === turno.id ? { ...t, estado: 'Realizado', resenia } : t);
      this.filteredTurnos = this.filteredTurnos.map(t => t.id === turno.id ? { ...t, estado: 'Realizado', resenia } : t);

      // Actualizar la lista de pacientes atendidos
      if (!this.pacientesAtendidos.some(p => p.id === turno.paciente)) {
        this.pacientesAtendidos.push({ id: turno.paciente, nombre: turno.nombrePaciente });
      }

      Swal.fire('¡Turno finalizado!', '', 'success');
    }
  }

  async cargarHistoriaClinicaForm(paciente: any) {
    this.pacienteSeleccionado = paciente;
    this.historiaClinicaForm = this.fb.group({
      altura: ['', Validators.required],
      peso: ['', Validators.required],
      temperatura: ['', Validators.required],
      presion: ['', Validators.required],
      clave1: [''],
      valor1: [''],
      clave2: [''],
      valor2: [''],
      clave3: [''],
      valor3: ['']
    });
  }

  async guardarHistoriaClinica() {
    if (!this.historiaClinicaForm?.valid) {
      // Mostrar alerta de error si el formulario no es válido
      Swal.fire({
        title: 'Error',
        text: 'Por favor, complete todos los campos requeridos antes de guardar la historia clínica.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        backdrop: false
      });
      return;
    }

    const fechaActual = new Date();
    const fechaFormateada = fechaActual.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const horaFormateada = fechaActual.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const historiaClinica = {
      pacienteId: this.pacienteSeleccionado.id,
      especialistaId: this.auth.currentUser?.uid,
      fecha: `${fechaFormateada} ${horaFormateada}`,
      altura: this.historiaClinicaForm.value.altura,
      peso: this.historiaClinicaForm.value.peso,
      temperatura: this.historiaClinicaForm.value.temperatura,
      presion: this.historiaClinicaForm.value.presion,
      datosDinamicos: [
        {
          clave: this.historiaClinicaForm.value.clave1,
          valor: this.historiaClinicaForm.value.valor1
        },
        {
          clave: this.historiaClinicaForm.value.clave2,
          valor: this.historiaClinicaForm.value.valor2
        },
        {
          clave: this.historiaClinicaForm.value.clave3,
          valor: this.historiaClinicaForm.value.valor3
        }
      ].filter(dato => dato.clave && dato.valor)
    };

    await setDoc(doc(this.firestore, 'historiasClinicas', `${this.pacienteSeleccionado.id}-${new Date().getTime()}`), historiaClinica);

    // Actualizar el estado del paciente para que no pueda volver a cargar historia clínica
    this.pacientesAtendidos = this.pacientesAtendidos.map(p => {
      if (p.id === this.pacienteSeleccionado.id) {
        return { ...p, historiaClinica };
      }
      return p;
    });

    this.pacienteSeleccionado = null;
    this.historiaClinicaForm = undefined;

    Swal.fire('¡Historia clínica guardada!', '', 'success');
  }


  async cancelarTurno(turnoId: string) {
    const { value: motivo } = await Swal.fire({
      title: 'Cancelar Turno',
      input: 'text',
      inputLabel: 'Ingrese el motivo de la cancelación',
      inputPlaceholder: 'Motivo de cancelación',
      inputValidator: (value) => {
        if (!value) {
          return 'El motivo es obligatorio';
        }
        return null;
      },
      showCancelButton: true,
      confirmButtonText: 'Cancelar Turno',
      cancelButtonText: 'Cancelar'
    });

    if (motivo) {
      const turnoDocRef = doc(this.firestore, 'turnos', turnoId);
      await updateDoc(turnoDocRef, { estado: 'Cancelado', motivoCancelacion: motivo });
      this.cargarTurnos();
    }
  }

  async rechazarTurno(turnoId: string) {
    const { value: motivo } = await Swal.fire({
      title: 'Rechazar Turno',
      input: 'text',
      inputLabel: 'Ingrese el motivo del rechazo',
      inputPlaceholder: 'Motivo de rechazo',
      inputValidator: (value) => {
        if (!value) {
          return 'El motivo es obligatorio';
        }
        return null;
      },
      showCancelButton: true,
      confirmButtonText: 'Rechazar Turno',
      cancelButtonText: 'Cancelar'
    });

    if (motivo) {
      const turnoDocRef = doc(this.firestore, 'turnos', turnoId);
      await updateDoc(turnoDocRef, { estado: 'Rechazado', motivoRechazo: motivo });
      this.cargarTurnos();
    }
  }

  async aceptarTurno(turnoId: string) {
    const turnoDocRef = doc(this.firestore, 'turnos', turnoId);
    await updateDoc(turnoDocRef, { estado: 'Aceptado' });
    this.cargarTurnos();
  }

  verResenia(reseña: string) {
    Swal.fire({
      title: 'Reseña del Turno',
      text: reseña,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      backdrop: false
    });
  }
}
