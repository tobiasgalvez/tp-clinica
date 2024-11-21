import { Component, OnInit } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-informes-administrador',
  templateUrl: './informes-administrador.component.html',
  styleUrls: ['./informes-administrador.component.scss']
})
export class InformesAdministradorComponent implements OnInit {

  logIngresos: any[] = [];
  turnosEspecialidad: any[] = [];
  turnosPorDia: any[] = [];
  turnosMedicoSolicitados: any[] = [];
  turnosMedicoFinalizados: any[] = [];
  especialistas: any = {}; // Objeto para almacenar los especialistas (key: UID)
  usuarios: any = {}; // Objeto para almacenar usuarios (key: UID)

  constructor(private firestore: Firestore) {
    // Registrar todos los elementos de Chart.js
    Chart.register(...registerables);
  }

  async ngOnInit() {
    await this.cargarDatos();
    this.generarGraficos();
  }

  async cargarDatos() {
    // Cargar la lista de especialistas
    const especialistasSnapshot = await getDocs(collection(this.firestore, 'especialistas'));
    especialistasSnapshot.docs.forEach(doc => {
      const data = doc.data();
      this.especialistas[doc.id] = `${data['nombre']} ${data['apellido']}`;
      this.usuarios[doc.id] = { nombre: data['nombre'], apellido: data['apellido'], tipo: 'Especialista' };
    });

    // Cargar la lista de administradores
    const administradoresSnapshot = await getDocs(collection(this.firestore, 'administradores'));
    administradoresSnapshot.docs.forEach(doc => {
      const data = doc.data();
      this.usuarios[doc.id] = { nombre: data['nombre'], apellido: data['apellido'], tipo: 'Administrador' };
    });

    // Cargar la lista de pacientes
    const pacientesSnapshot = await getDocs(collection(this.firestore, 'pacientes'));
    pacientesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      this.usuarios[doc.id] = { nombre: data['nombre'], apellido: data['apellido'], tipo: 'Paciente' };
    });

    // Cargar log de ingresos
    const logsSnapshot = await getDocs(collection(this.firestore, 'logs'));
    this.logIngresos = logsSnapshot.docs.map(doc => {
      const log = doc.data();
      const usuario = this.usuarios[log['usuarioId']];
      return {
        ...log,
        nombre: usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Desconocido',
        tipo: usuario ? usuario.tipo : 'Desconocido'
      };
    });

    // Cargar turnos
    const turnosSnapshot = await getDocs(collection(this.firestore, 'turnos'));
    const turnosData = turnosSnapshot.docs.map(doc => doc.data());

    // Convertir el UID del especialista a su nombre completo
    this.turnosMedicoSolicitados = this.obtenerTurnosPorMedico(turnosData, 'pendiente');
    this.turnosMedicoFinalizados = this.obtenerTurnosPorMedico(turnosData, 'Realizado');

    this.turnosEspecialidad = this.obtenerTurnosPorEspecialidad(turnosData);
    this.turnosPorDia = this.obtenerTurnosPorDia(turnosData);
  }

  obtenerTurnosPorEspecialidad(turnos: any[]): any[] {
    const especialidades: { [key: string]: number } = {};
    turnos.forEach(turno => {
      if (turno.especialidad) {
        especialidades[turno.especialidad] = (especialidades[turno.especialidad] || 0) + 1;
      }
    });
    return Object.keys(especialidades).map(key => ({ especialidad: key, cantidad: especialidades[key] }));
  }

  obtenerTurnosPorDia(turnos: any[]): any[] {
    const turnosPorDia: { [key: string]: number } = {};
  
    turnos.forEach(turno => {
      if (turno.fechaHora) {
        try {
          // Extraer solo la parte de la fecha de 'fechaHora'
          const [diaSemana, resto] = turno.fechaHora.split(", ");
          const [fecha, _] = resto.split(" - ");
  
          // Reconstruir la fecha para un formato único (e.g., "jueves, 5 de diciembre de 2024")
          const fechaCompleta = `${diaSemana}, ${fecha}`;
  
          turnosPorDia[fechaCompleta] = (turnosPorDia[fechaCompleta] || 0) + 1;
        } catch (error) {
          console.warn(`Error procesando la fechaHora: ${turno.fechaHora}`, error);
        }
      }
    });
  
    return Object.keys(turnosPorDia).map(key => ({ dia: key, cantidad: turnosPorDia[key] }));
  }
  
  

  obtenerTurnosPorMedico(turnos: any[], estado: string): any[] {
    const turnosPorMedico: { [key: string]: number } = {};
    turnos.forEach(turno => {
      if (turno.estado && turno.estado.toLowerCase() === estado.toLowerCase() && turno.especialista) {
        const nombreMedico = this.especialistas[turno.especialista] || 'Desconocido';
        turnosPorMedico[nombreMedico] = (turnosPorMedico[nombreMedico] || 0) + 1;
      }
    });
    return Object.keys(turnosPorMedico).map(key => ({ medico: key, cantidad: turnosPorMedico[key] }));
  }

  generarGraficos() {
    // Log de Ingresos al Sistema
    new Chart('chartLogs', {
      type: 'bar',
      data: {
        labels: this.logIngresos.map(log => log.fecha),
        datasets: [{
          label: 'Ingresos al Sistema',
          data: this.logIngresos.map(log => 1),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      }
    });

    // Turnos por Especialidad
    new Chart('chartTurnosPorEspecialidad', {
      type: 'pie',
      data: {
        labels: this.turnosEspecialidad.map(te => te.especialidad),
        datasets: [{
          label: 'Turnos por Especialidad',
          data: this.turnosEspecialidad.map(te => te.cantidad),
          backgroundColor: ['rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)', 'rgba(255, 206, 86, 0.6)'],
          borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)'],
          borderWidth: 1
        }]
      }
    });


    // Turnos por Día
    if (this.turnosPorDia.length > 0) {
      new Chart('chartTurnosPorDia', {
        type: 'line',
        data: {
          labels: this.turnosPorDia.map(td => td.dia),
          datasets: [{
            label: 'Turnos por Día',
            data: this.turnosPorDia.map(td => td.cantidad),
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }]
        }
      });
    }

    // Turnos Solicitados por Médico
    if (this.turnosMedicoSolicitados.length > 0) {
      new Chart('chartTurnosPorMedicoSolicitados', {
        type: 'bar',
        data: {
          labels: this.turnosMedicoSolicitados.map(tm => tm.medico),
          datasets: [{
            label: 'Turnos Solicitados por Médico',
            data: this.turnosMedicoSolicitados.map(tm => tm.cantidad),
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1
          }]
        }
      });
    }

    // Turnos Finalizados por Médico
    if (this.turnosMedicoFinalizados.length > 0) {
      new Chart('chartTurnosPorMedicoFinalizados', {
        type: 'bar',
        data: {
          labels: this.turnosMedicoFinalizados.map(tm => tm.medico),
          datasets: [{
            label: 'Turnos Finalizados por Médico',
            data: this.turnosMedicoFinalizados.map(tm => tm.cantidad),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        }
      });
    }

    // Otros gráficos...
  }

  descargarExcel(data: any[], fileName: string) {
    const worksheetData = data.map(item => {
      if (item.nombre && item.apellido && item.tipo) {
        return {
          Fecha: item.fecha,
          Usuario: `${item.nombre} ${item.apellido}`,
          Tipo: item.tipo
        };
      }
      return item;
    });
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${fileName}_${new Date().getTime()}.xlsx`;
    link.click();
  }

  descargarPDF(data: any[], title: string) {
    const pdfDoc = new jsPDF();
    pdfDoc.setFontSize(18);
    pdfDoc.text(title, 10, 10);

    let yOffset = 20;
    data.forEach((item: any) => {
      pdfDoc.setFontSize(11);
      if (item.nombre && item.apellido && item.tipo) {
        pdfDoc.text(`Usuario: ${item.nombre} ${item.apellido} | Tipo: ${item.tipo} | Fecha: ${item.fecha}`, 10, yOffset);
      } 
      else if(item.nombre && item.tipo)
      {
        pdfDoc.text(`Usuario: ${item.nombre} | Tipo: ${item.tipo} | Fecha: ${item.fecha}`, 10, yOffset);
      }
      else if (item.especialidad && item.cantidad) {
        pdfDoc.text(`Especialidad: ${item.especialidad} | Cantidad: ${item.cantidad}`, 10, yOffset);
      } else if (item.dia && item.cantidad) {
        pdfDoc.text(`Día: ${item.dia} | Cantidad: ${item.cantidad}`, 10, yOffset);
      } else if (item.medico && item.cantidad) {
        pdfDoc.text(`Médico: ${item.medico} | Cantidad: ${item.cantidad}`, 10, yOffset);
      }
      yOffset += 10;
    });

    pdfDoc.save(`${title.replace(/ /g, '_')}_${new Date().getTime()}.pdf`);
  }
}
