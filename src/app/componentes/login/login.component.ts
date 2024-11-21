import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, getAuth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, getDoc, collection, addDoc } from '@angular/fire/firestore';
import { getDownloadURL, ref, Storage } from '@angular/fire/storage';
import { CommonModule } from '@angular/common';
import { RotateOnHoverDirective } from '../../directives/rotate-on-hover.directive';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RotateOnHoverDirective],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';  // Nueva variable para almacenar el mensaje de error
  usuariosAccesoRapido: any[] = [
    { nombre: 'Paciente 1', mail: 'marimonz@yopmail.com', contrasena: '101010' },
    { nombre: 'Paciente 2', mail: 'carlosgalvez@yopmail.com', contrasena: '101010' },
    { nombre: 'Paciente 3', mail: 'victorayala@yopmail.com', contrasena: '101010' },
    { nombre: 'Especialista 1', mail: 'gusgomez@yopmail.com', contrasena: '101010' },
    { nombre: 'Especialista 2', mail: 'maudom@yopmail.com', contrasena: '101010' },
    { nombre: 'Admin', mail: 'admin2@admin2.com', contrasena: '101010' }
  ];
  isLoading: boolean = true;

  constructor(private fb: FormBuilder, private auth: Auth, private firestore: Firestore, private router: Router, private storage: Storage) {
    this.loginForm = this.fb.group({
      mail: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    this.cargarUsuariosAccesoRapido();
    setTimeout(() => {
      this.isLoading = false;
    }, 2000);
  }

  cargarUsuariosAccesoRapido() {
    // Asignar imágenes estáticas a cada tipo de usuario
    for (const usuario of this.usuariosAccesoRapido) {
      if (usuario.nombre.includes('Admin')) {
        usuario.imagenPerfil = 'assets/admin.png'; // Imagen para administradores
      } else if (usuario.nombre.includes('Especialista')) {
        usuario.imagenPerfil = 'assets/especialista.png'; // Imagen para especialistas
      } else {
        usuario.imagenPerfil = 'assets/paciente.png'; // Imagen para pacientes
      }
    }
  }

  async login() {
    if (this.loginForm.valid) {
      const { mail, contrasena } = this.loginForm.value;
      try {
        const userCredential = await signInWithEmailAndPassword(this.auth, mail, contrasena);
        const user = userCredential.user;
        const adminDocRef = doc(this.firestore, 'administradores', user.uid);
        const adminDoc = await getDoc(adminDocRef);

        // Registrar log de inicio de sesión
        await this.registrarLogIngreso(user.uid);

        if (adminDoc.exists()) {
          this.router.navigate(['/home']);
        } else if (user.emailVerified) {
          const userDocRef = doc(this.firestore, 'especialistas', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const especialistaData = userDoc.data();
            if (especialistaData && especialistaData['aprobado']) {
              this.router.navigate(['/home']);
            } else {
              this.errorMessage = 'Su cuenta aún no ha sido aprobada por un administrador.';
            }
          } else {
            this.router.navigate(['/home']);
          }
        } else {
          this.errorMessage = 'Por favor verifique su correo electrónico antes de iniciar sesión.';
        }
      } catch (error) {
        console.error('Error al iniciar sesión: ', error);
        this.errorMessage = 'Error al iniciar sesión, verifique sus credenciales e intente nuevamente.';
      }
    } else {
      this.errorMessage = 'Por favor complete todos los campos correctamente';
    }
  }

  async registrarLogIngreso(uid: string) {
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

    try {
      await addDoc(collection(this.firestore, 'logs'), {
        usuarioId: uid,
        fecha: `${fechaFormateada} ${horaFormateada}`
      });
    } catch (error) {
      console.error('Error al registrar el log de ingreso: ', error);
    }
  }

  loginConAccesoRapido(usuario: any) {
    this.loginForm.setValue({ mail: usuario.mail, contrasena: usuario.contrasena });
  }
}
