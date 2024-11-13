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

  constructor(public router: Router, private auth: Auth, private firestore: Firestore) {}

  ngOnInit(): void {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(this.firestore, 'administradores', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          this.isAdmin = true;
        }
      }
    });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  async cerrarSesion() {
    try {
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión: ', error);
    }
  }
}