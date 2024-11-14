import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, getAuth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { getDownloadURL, ref, Storage } from '@angular/fire/storage';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  usuariosAccesoRapido: any[] = [
    { nombre: 'Paciente 1', mail: 'marimonz@yopmail.com', contrasena: '101010' },
    { nombre: 'Paciente 2', mail: 'paciente2@example.com', contrasena: 'password2' },
    { nombre: 'Paciente 3', mail: 'paciente3@example.com', contrasena: 'password3' },
    { nombre: 'Especialista 1', mail: 'gusgomez@yopmail.com', contrasena: '101010' },
    { nombre: 'Especialista 2', mail: 'especialista2@example.com', contrasena: 'password5' },
    { nombre: 'Admin', mail: 'admin2@admin2.com', contrasena: '101010' }
  ];
  isLoading: boolean = true; // Nueva variable para controlar la carga

  constructor(private fb: FormBuilder, private auth: Auth, private firestore: Firestore, private router: Router, private storage: Storage) {
    this.loginForm = this.fb.group({
      mail: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    this.cargarUsuariosAccesoRapido();

    // Mostrar el spinner por 2 segundos
    setTimeout(() => {
      this.isLoading = false; // Ocultar el spinner después de 2 segundos
    }, 2000);
  }

  async cargarUsuariosAccesoRapido() {
    try {
      for (let usuario of this.usuariosAccesoRapido) {
        const userDocRef = doc(this.firestore, 'usuarios', usuario.mail);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Asegúrate de que la imagen de perfil esté definida en Firestore
          if (userData['imagenPerfil']) {
            const storageRef = ref(this.storage, userData['imagenPerfil']);
            
            try {
              const imageUrl = await getDownloadURL(storageRef);
              usuario.imagenPerfil = imageUrl;  // Asignar la URL de descarga al objeto usuario
            } catch (error) {
              console.error('Error al obtener la URL de la imagen: ', error);
              usuario.imagenPerfil = 'assets/images/default.jpg';  // Asignar una imagen por defecto en caso de error
            }
          } else {
            usuario.imagenPerfil = 'assets/images/default.jpg';  // Asignar una imagen por defecto si no tiene imagenPerfil
          }
        } else {
          console.warn(`No se encontró el documento para el usuario con el mail ${usuario.mail}`);
          usuario.imagenPerfil = 'assets/images/default.jpg';  // Imagen por defecto si no se encuentra el documento del usuario
        }
      }
    } catch (error) {
      console.error('Error al cargar usuarios de acceso rápido: ', error);
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

        if (adminDoc.exists()) {
          // Si es un administrador, no necesita verificación de correo
          this.router.navigate(['/home']);
        } else if (user.emailVerified) {
          // Verificar si es especialista
          const userDocRef = doc(this.firestore, 'especialistas', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const especialistaData = userDoc.data();
            if (especialistaData && especialistaData['aprobado']) {
              this.router.navigate(['/home']);
            } else {
              alert('Su cuenta aún no ha sido aprobada por un administrador.');
            }
          } else {
            this.router.navigate(['/home']);
          }
        } else {
          alert('Por favor verifique su correo electrónico antes de iniciar sesión.');
        }
      } catch (error) {
        console.error('Error al iniciar sesión: ', error);
        alert('Error al iniciar sesión, verifique sus credenciales e intente nuevamente.');
      }
    } else {
      alert('Por favor complete todos los campos correctamente');
    }
  }

  loginConAccesoRapido(usuario: any) {
    this.loginForm.setValue({ mail: usuario.mail, contrasena: usuario.contrasena });
  }
}
