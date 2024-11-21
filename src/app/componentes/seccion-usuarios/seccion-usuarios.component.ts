import { Component, OnInit } from '@angular/core';
import { Firestore, collection, getDocs, updateDoc, doc, setDoc } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, getAuth, createUserWithEmailAndPassword, sendEmailVerification } from '@angular/fire/auth';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import * as XLSX from 'xlsx';
import { HoverColorDirective } from '../../directives/hover-color.directive';
const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';

@Component({
  selector: 'app-seccion-usuarios',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, HoverColorDirective],
  templateUrl: './seccion-usuarios.component.html',
  styleUrls: ['./seccion-usuarios.component.scss']
})

export class SeccionUsuariosComponent implements OnInit {
  usuarios: any[] = [];
  usuarioForm: FormGroup;
  mostrarFormulario: boolean = false;
  errorMessage: string | undefined;
  isLoading: boolean = true; // Nueva variable para mostrar el spinner

  constructor(
    private firestore: Firestore,
    private fb: FormBuilder,
    private router: Router,
    private auth: Auth,
    private storage: Storage
  ) {
    this.usuarioForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      edad: ['', [Validators.required, Validators.min(1), Validators.max(120)]],
      dni: ['', [Validators.required, Validators.pattern(/^[0-9]{7,8}$/)]],
      mail: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]],
      imagenPerfil: [null, Validators.required]
    });
  }

  async ngOnInit() {
    await this.cargarUsuarios();
    setTimeout(() => {
      this.isLoading = false;
    }, 2000);
  }

  async cargarUsuarios() {
    this.isLoading = true; // Mostrar el spinner mientras se cargan los usuarios
    const administradoresSnapshot = await getDocs(collection(this.firestore, 'administradores'));
    const especialistasSnapshot = await getDocs(collection(this.firestore, 'especialistas'));
    const pacientesSnapshot = await getDocs(collection(this.firestore, 'pacientes'));

    this.usuarios = [];
    administradoresSnapshot.forEach(doc => {
      this.usuarios.push({ id: doc.id, ...doc.data(), tipo: 'Administrador' });
    });
    especialistasSnapshot.forEach(doc => {
      this.usuarios.push({ id: doc.id, ...doc.data(), tipo: 'Especialista' });
    });
    pacientesSnapshot.forEach(doc => {
      this.usuarios.push({ id: doc.id, ...doc.data(), tipo: 'Paciente' });
    });
    this.isLoading = false; // Ocultar el spinner una vez que los usuarios hayan sido cargados
  }

  async cambiarEstadoEspecialista(id: string, estadoActual: boolean) {
    const especialistaDocRef = doc(this.firestore, 'especialistas', id);
    await updateDoc(especialistaDocRef, { aprobado: !estadoActual });
    await this.cargarUsuarios();
  }

  mostrarFormularioNuevoUsuario() {
    this.mostrarFormulario = true;
  }

  onFileChange(event: Event, controlName: string) {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      this.usuarioForm.get(controlName)?.setValue(input.files);
    }
  }

  async registrarUsuario() {
    if (this.usuarioForm.valid) {
      const datos = this.usuarioForm.value;
      try {
        // Registrar el nuevo usuario en Authentication
        const userCredential = await createUserWithEmailAndPassword(this.auth, datos.mail, datos.contrasena);
        await sendEmailVerification(userCredential.user);

        // Subir imagen de perfil si existe
        let imagenPerfilUrl = '';
        if (datos.imagenPerfil && datos.imagenPerfil.length > 0) {
          const file = datos.imagenPerfil[0];
          const filePath = `administradores/${userCredential.user.uid}/imagenPerfil/${file.name}`;
          const storageRef = ref(this.storage, filePath);
          await uploadBytes(storageRef, file);
          imagenPerfilUrl = await getDownloadURL(storageRef);
        }

        // Crear datos para guardar en Firestore
        const dataToSave = {
          nombre: datos.nombre,
          apellido: datos.apellido,
          edad: datos.edad,
          dni: datos.dni,
          mail: datos.mail,
          aprobado: true, // Administradores no necesitan aprobación
          imagenPerfil: imagenPerfilUrl || null
        };

        // Usar setDoc para asegurar que el UID sea el mismo que el del usuario autenticado
        await setDoc(doc(this.firestore, 'administradores', userCredential.user.uid), dataToSave);
        this.errorMessage = 'Usuario registrado con éxito';
        this.mostrarFormulario = false;
        await this.cargarUsuarios();
      } catch (error) {
        console.error('Error al registrar: ', error);
        this.errorMessage = 'Hubo un error al registrar, por favor intente nuevamente';
      }
    } else {
      this.errorMessage = 'Por favor complete todos los campos correctamente';
    }
  }



  descargarUsuariosExcel() {
    // Crear una hoja de trabajo (worksheet) de Excel a partir de los datos de los usuarios
    const worksheet = XLSX.utils.json_to_sheet(this.usuarios.map(usuario => {
      return {
        Nombre: usuario.nombre,
        Apellido: usuario.apellido,
        Edad: usuario.edad,
        DNI: usuario.dni,
        Email: usuario.mail,
        Tipo: usuario.tipo,
        Estado: usuario.tipo === 'Especialista' ? (usuario.aprobado ? 'Habilitado' : 'Inhabilitado') : 'N/A'
      };
    }));
  
    // Crear el libro de Excel (workbook) que contendrá la hoja de trabajo
    const workbook = { Sheets: { 'Datos Usuarios': worksheet }, SheetNames: ['Datos Usuarios'] };
  
    // Convertir el libro de Excel a un buffer binario
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
    // Crear un archivo Blob con los datos y especificar el tipo MIME
    const data: Blob = new Blob([excelBuffer], { type: EXCEL_TYPE });
  
    // Crear un enlace temporal para forzar la descarga del archivo
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(data);
    link.download = `usuarios_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
  }
  
}
