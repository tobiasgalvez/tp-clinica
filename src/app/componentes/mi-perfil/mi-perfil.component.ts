import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  disponibilidad: { dia: string, horarios: { hora: string, estado: string }[] }[] = [];

  constructor(private firestore: Firestore, private auth: Auth) {}

  ngOnInit(): void {
    this.cargarPerfil();
  }

  async cargarPerfil() {
    const user = this.auth.currentUser;
    if (user) {
      // Buscar en la colección de especialistas
      const userDocRef = doc(this.firestore, 'especialistas', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        this.usuario = userDoc.data();
        this.usuario.tipo = 'especialista';
        this.disponibilidad = this.usuario.disponibilidadHoraria || [];
        return;
      }
    }
  }

  async actualizarDisponibilidadHoraria() {
    if (this.usuario?.tipo === 'especialista') {
      const nuevaDisponibilidad = [];

      // Disponibilidad de lunes a viernes
      if (this.lunesViernesRango) {
        nuevaDisponibilidad.push({
          dia: 'Lunes a Viernes',
          horarios: this.generarFranjaHorariaDesdeRango(this.lunesViernesRango)
        });
      }

      // Disponibilidad de sábados (solo si está habilitada)
      if (this.habilitarSabado && this.sabadoRango) {
        nuevaDisponibilidad.push({
          dia: 'Sábado',
          horarios: this.generarFranjaHorariaDesdeRango(this.sabadoRango)
        });
      }

      // Actualizar la disponibilidad horaria en Firestore
      const user = this.auth.currentUser;
      if (user) {
        const userDocRef = doc(this.firestore, 'especialistas', user.uid);
        await updateDoc(userDocRef, { disponibilidadHoraria: nuevaDisponibilidad });
        Swal.fire('¡Gracias!', 'Disponibilidad horaria actualizada con éxito', 'success');
        this.cargarPerfil();
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
    pdfDoc.addImage('assets/logo-clinica.png', 'PNG', 10, 10, 50, 20); // Agregar el logo de la clínica
    pdfDoc.text('Clínica XYZ', 70, 20);
    pdfDoc.setFontSize(14);
    pdfDoc.text('Historia Clínica', 10, 50);
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
        for (const key in atencion.datosDinamicos) {
          if (Object.prototype.hasOwnProperty.call(atencion.datosDinamicos, key)) {
            pdfDoc.text(`${key}: ${atencion.datosDinamicos[key]}`, 10, yOffset);
            yOffset += 10;
          }
        }
      }

      yOffset += 10;
    });

    pdfDoc.save('historia_clinica.pdf');
  }
}
