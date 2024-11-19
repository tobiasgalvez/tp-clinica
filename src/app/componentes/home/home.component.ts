import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Auth, getAuth, onAuthStateChanged, signOut } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  isAdmin: boolean = false;
  isEspecialista: boolean = false;
  isPaciente: boolean = false;
  isLoggedIn: boolean = false;
  isLoading: boolean = true;

  constructor(public router: Router, private auth: Auth, private firestore: Firestore) {}

  ngOnInit(): void {
    // Mostrar el spinner por 2 segundos
    setTimeout(() => {
      this.isLoading = false;
    }, 2000);

    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.isLoggedIn = true;

        // Revisar si el usuario es administrador
        const adminDocRef = doc(this.firestore, 'administradores', user.uid);
        const adminDoc = await getDoc(adminDocRef);
        if (adminDoc.exists()) {
          this.isAdmin = true;
        } else {
          // Revisar si el usuario es especialista
          const especialistaDocRef = doc(this.firestore, 'especialistas', user.uid);
          const especialistaDoc = await getDoc(especialistaDocRef);
          if (especialistaDoc.exists()) {
            this.isEspecialista = true;
          } else {
            // Si no es especialista ni administrador, debe ser paciente
            const pacienteDocRef = doc(this.firestore, 'pacientes', user.uid);
            const pacienteDoc = await getDoc(pacienteDocRef);
            if (pacienteDoc.exists()) {
              this.isPaciente = true;
            }
          }
        }
      } else {
        this.isLoggedIn = false;
        this.isAdmin = false;
        this.isEspecialista = false;
        this.isPaciente = false;
      }
    });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  async cerrarSesion() {
    try {
      await signOut(this.auth);
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Error al cerrar sesión: ', error);
    }
  }
}
