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
  errorMessage: string = '';  // Nueva variable para almacenar el mensaje de error
  usuariosAccesoRapido: any[] = [
    { nombre: 'Paciente 1', mail: 'marimonz@yopmail.com', contrasena: '101010' },
    { nombre: 'Paciente 2', mail: 'paciente2@example.com', contrasena: 'password2' },
    { nombre: 'Paciente 3', mail: 'paciente3@example.com', contrasena: 'password3' },
    { nombre: 'Especialista 1', mail: 'gusgomez@yopmail.com', contrasena: '101010' },
    { nombre: 'Especialista 2', mail: 'especialista2@example.com', contrasena: 'password5' },
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

  async cargarUsuariosAccesoRapido() {
    // Código para cargar usuarios
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

  loginConAccesoRapido(usuario: any) {
    this.loginForm.setValue({ mail: usuario.mail, contrasena: usuario.contrasena });
  }
}