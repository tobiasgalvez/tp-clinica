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
  isLoggedIn: boolean = false;
  isLoading: boolean = true; // Nueva variable para el estado de carga

  constructor(public router: Router, private auth: Auth, private firestore: Firestore) {}

  ngOnInit(): void {
    // Mostrar el spinner por 2 segundos
    setTimeout(() => {
      this.isLoading = false; // Ocultar el spinner después de 2 segundos
    }, 2000);

    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.isLoggedIn = true;
        const userDocRef = doc(this.firestore, 'administradores', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          this.isAdmin = true;
        }
      } else {
        this.isLoggedIn = false;
        this.isAdmin = false;
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
