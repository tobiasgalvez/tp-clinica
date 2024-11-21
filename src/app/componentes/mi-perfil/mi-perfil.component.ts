import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';
import { CapitalizarPipe } from '../../pipes/capitalizar.pipe';
import { DisableButtonDirective } from '../../directives/disable-button.directive';

interface Disponibilidad {
  especialidad: string;
  horarios: { dia: string; horarios: { hora: string; estado: string }[] }[];
}

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, CapitalizarPipe, DisableButtonDirective],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss']
})


export class MiPerfilComponent implements OnInit {
  
  usuario: any = null;
  historiaClinica: any[] = [];

  // Opciones de disponibilidad horaria
  rangosHorariosLunesViernes: string[] = [
    '08:00 - 14:00',
    '10:00 - 16:00',
    '13:00 - 19:00'
  ];
  rangoHorarioSabado: string = '08:00 - 14:00';

  lunesViernesRango: string = '';
  sabadoRango: string = this.rangoHorarioSabado;
  habilitarSabado: boolean = false;

  disponibilidad: { especialidad: string, dia: string, horarios: { hora: string, estado: string }[] }[] = [];
  especialidades: string[] = [];
  especialidadSeleccionada: string = '';

  constructor(private firestore: Firestore, private auth: Auth) {}

  ngOnInit(): void {
    this.cargarPerfil();
  }

  async cargarPerfil() {
    const user = this.auth.currentUser;
    if (user) {
      // Buscar en la colección de administradores
      let userDocRef = doc(this.firestore, 'administradores', user.uid);
      let userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        this.usuario = userDoc.data();
        this.usuario.tipo = 'administrador';
        return;
      }
  
      // Buscar en la colección de especialistas si no se encontró en administradores
      userDocRef = doc(this.firestore, 'especialistas', user.uid);
      userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        this.usuario = userDoc.data();
        this.usuario.tipo = 'especialista';
        this.disponibilidad = this.usuario.disponibilidadHoraria || [];

        // Agregar especialidades
        this.especialidades.push(this.usuario.especialidad);
        if (this.usuario.especialidad2) {
          this.especialidades.push(this.usuario.especialidad2);
        }

        // Establecer la especialidad seleccionada como la primera por defecto
        this.especialidadSeleccionada = this.especialidades[0];
        return;
      }
  
      // Buscar en la colección de pacientes si no se encontró en especialistas
      userDocRef = doc(this.firestore, 'pacientes', user.uid);
      userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        this.usuario = userDoc.data();
        this.usuario.tipo = 'paciente';
        this.cargarHistoriaClinica(user.uid);
        return;
      }
      
      // Si no se encuentra en ninguna colección, mostrar un mensaje de error
      Swal.fire('Error', 'Usuario no encontrado.', 'error');
    }
  }

  async actualizarDisponibilidadHoraria() {
    if (this.usuario?.tipo === 'especialista') {
      const user = this.auth.currentUser;
  
      if (user) {
        // Obtener la disponibilidad actual desde Firestore
        const userDocRef = doc(this.firestore, 'especialistas', user.uid);
        const userDoc = await getDoc(userDocRef);
        let disponibilidadExistente: Disponibilidad[] = userDoc.exists() && userDoc.data()['disponibilidadHoraria']
          ? userDoc.data()['disponibilidadHoraria']
          : [];
  
        // Crear una nueva disponibilidad para la especialidad seleccionada
        const nuevaDisponibilidad: Disponibilidad = {
          especialidad: this.especialidadSeleccionada,
          horarios: []
        };
  
        // Añadir la disponibilidad para Lunes a Viernes
        if (this.lunesViernesRango) {
          nuevaDisponibilidad.horarios.push({
            dia: 'Lunes a Viernes',
            horarios: this.generarFranjaHorariaDesdeRango(this.lunesViernesRango)
          });
        }
  
        // Añadir la disponibilidad para los Sábados (si está habilitada)
        if (this.habilitarSabado && this.sabadoRango) {
          nuevaDisponibilidad.horarios.push({
            dia: 'Sábado',
            horarios: this.generarFranjaHorariaDesdeRango(this.sabadoRango)
          });
        }
  
        // Actualizar la disponibilidad manteniendo las ya existentes para otras especialidades
        const indexExistente = disponibilidadExistente.findIndex((d: Disponibilidad) => d.especialidad === this.especialidadSeleccionada);
        if (indexExistente !== -1) {
          // Actualizar la disponibilidad de la especialidad existente
          disponibilidadExistente[indexExistente] = nuevaDisponibilidad;
        } else {
          // Añadir una nueva especialidad
          disponibilidadExistente.push(nuevaDisponibilidad);
        }
  
        // Actualizar el documento en Firestore
        await updateDoc(userDocRef, { disponibilidadHoraria: disponibilidadExistente });
  
        Swal.fire('¡Gracias!', 'Disponibilidad horaria actualizada con éxito', 'success');
        this.cargarPerfil(); // Refrescar el perfil para mostrar los nuevos datos
      }
    }
  }
  


  generarFranjaHorariaDesdeRango(rango: string): { hora: string, estado: string }[] {
    const horarios: { hora: string, estado: string }[] = [];
    const [inicio, fin] = rango.split(' - ');
    const [inicioHoras, inicioMinutos] = inicio.split(':').map(Number);
    const [finHoras, finMinutos] = fin.split(':').map(Number);

    let currentHora = inicioHoras;
    let currentMinuto = inicioMinutos;

    while (currentHora < finHoras || (currentHora === finHoras && currentMinuto < finMinutos)) {
      horarios.push({ 
        hora: `${currentHora}:${currentMinuto < 10 ? '0' : ''}${currentMinuto}`,
        estado: 'disponible' // Los horarios iniciales siempre estarán disponibles
      });
      currentMinuto += 30;
      if (currentMinuto >= 60) {
        currentHora++;
        currentMinuto = 0;
      }
    }

    return horarios;
  }

  descargarHistoriaClinicaPDF() {
    if (!this.historiaClinica || this.historiaClinica.length === 0) {
      alert("No hay historia clínica para descargar");
      return;
    }

    const pdfDoc = new jsPDF();
    pdfDoc.setFontSize(18);
    pdfDoc.addImage('../assets/logo-clinica.png', 'PNG', 85, 10, 50, 20); // Agregar el logo de la clínica
    pdfDoc.text('\n\n\n\nClínica XYZ', 90, 20);
    pdfDoc.setFontSize(14);
    pdfDoc.text('\nHistoria Clínica', 10, 50);
    pdfDoc.setFontSize(11);
    pdfDoc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 10, 60);

    let yOffset = 80;
    this.historiaClinica.forEach((atencion: any, index: number) => {
      pdfDoc.setFontSize(13);
      pdfDoc.text(`Atención #${index + 1}`, 10, yOffset);
      yOffset += 10;

      pdfDoc.setFontSize(11);
      pdfDoc.text(`Fecha de atención: ${atencion.fecha}`, 10, yOffset);
      yOffset += 10;
      pdfDoc.text(`Altura: ${atencion.altura} cm`, 10, yOffset);
      yOffset += 10;
      pdfDoc.text(`Peso: ${atencion.peso} kg`, 10, yOffset);
      yOffset += 10;
      pdfDoc.text(`Temperatura: ${atencion.temperatura} °C`, 10, yOffset);
      yOffset += 10;
      pdfDoc.text(`Presión: ${atencion.presion}`, 10, yOffset);
      yOffset += 10;

      if (atencion.datosDinamicos) {
        atencion.datosDinamicos.forEach((dato: any) => {
          pdfDoc.text(`${dato.clave}: ${dato.valor}`, 10, yOffset);
          yOffset += 10;
        });
      }

      yOffset += 10;
    });

    pdfDoc.save('historia_clinica.pdf');
  }

  async cargarHistoriaClinica(pacienteId: string) {
    // Buscar todas las historias clínicas asociadas al paciente
    const historiasClinicasRef = collection(this.firestore, 'historiasClinicas');
    const historiasQuery = query(historiasClinicasRef, where('pacienteId', '==', pacienteId));
    const querySnapshot = await getDocs(historiasQuery);

    this.historiaClinica = querySnapshot.docs.map(doc => doc.data());
  }

}
