import { Component, OnInit } from '@angular/core';
import { Firestore, collection, getDocs, updateDoc, doc, setDoc } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, getAuth, createUserWithEmailAndPassword, sendEmailVerification } from '@angular/fire/auth';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Component({
  selector: 'app-seccion-usuarios',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './seccion-usuarios.component.html',
  styleUrls: ['./seccion-usuarios.component.scss']
})
export class SeccionUsuariosComponent implements OnInit {
  usuarios: any[] = [];
  usuarioForm: FormGroup;
  mostrarFormulario: boolean = false;
  errorMessage: string | undefined;

  constructor(private firestore: Firestore, private fb: FormBuilder, private router: Router, private auth: Auth, private storage: Storage) {
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
  }

  async cargarUsuarios() {
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
}