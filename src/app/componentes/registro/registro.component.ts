import { Component } from '@angular/core';
import { Firestore, setDoc, doc } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Auth, getAuth, createUserWithEmailAndPassword, sendEmailVerification } from '@angular/fire/auth';
import { Storage, getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Router } from '@angular/router';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss'],
  animations: [
    trigger('formAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ])
  ]
})
export class RegistroComponent {
  registroForm: FormGroup;
  tipoUsuario: 'Paciente' | 'Especialista' | null = null;
  especialidades: string[] = ['Cardiología', 'Pediatría', 'Neurología'];
  errorMessage: string = '';
  mostrarNuevaEspecialidad: boolean = false;

  constructor(private fb: FormBuilder, private firestore: Firestore, private auth: Auth, private storage: Storage, private router: Router) {
    this.registroForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      edad: ['', [Validators.required, Validators.min(1), Validators.max(120)]],
      dni: ['', [Validators.required, Validators.pattern(/^[0-9]{7,8}$/)]],
      mail: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]],
      obraSocial: [''], // Solo para pacientes
      especialidad: ['', this.tipoUsuario === 'Especialista' ? Validators.required : []], // Solo para especialistas
      imagenes: [null, this.tipoUsuario === 'Paciente' ? Validators.required : []],
      imagenPerfil: [null, this.tipoUsuario === 'Especialista' ? Validators.required : []] // Solo para especialistas
    });
  }

  onFileChange(event: Event, controlName: string) {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      this.registroForm.get(controlName)?.setValue(input.files);
    }
  }

  async registrar() {
    if (this.registroForm.valid) {
      const datos = this.registroForm.value;

      try {
        const userCredential = await createUserWithEmailAndPassword(this.auth, datos.mail, datos.contrasena);
        await sendEmailVerification(userCredential.user);

        // Subir archivos a Firebase Storage
        const fileUrls: string[] = [];
        if (datos.imagenes && datos.imagenes.length > 0) {
          for (let i = 0; i < datos.imagenes.length; i++) {
            const file = datos.imagenes[i];
            const filePath = `pacientes/${userCredential.user.uid}/imagenes/${file.name}`;
            const storageRef = ref(this.storage, filePath);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            fileUrls.push(downloadURL);
          }
        }

        // Subir imagen de perfil si es un especialista
        let imagenPerfilUrl = '';
        if (this.tipoUsuario === 'Especialista' && datos.imagenPerfil && datos.imagenPerfil.length > 0) {
          const file = datos.imagenPerfil[0]; // Tomar el primer archivo del FileList
          const filePath = `especialistas/${userCredential.user.uid}/imagenPerfil/${file.name}`;
          const storageRef = ref(this.storage, filePath);
          await uploadBytes(storageRef, file);
          imagenPerfilUrl = await getDownloadURL(storageRef);
        }

        // Crear datos para guardar en Firestore
        const dataToSave = {
          ...datos,
          imagenes: fileUrls.length > 0 ? fileUrls : null, // Guardar las URLs en lugar del FileList
          imagenPerfil: imagenPerfilUrl || null // Guardar la URL de la imagen de perfil si existe
        };

        // Usar setDoc para asegurarse de que el UID sea el mismo que el del usuario autenticado
        if (this.tipoUsuario === 'Paciente') {
          await setDoc(doc(this.firestore, 'pacientes', userCredential.user.uid), dataToSave);
          this.errorMessage = 'Paciente registrado con éxito. Por favor verifique su correo electrónico.';
          this.router.navigate(['/home']);
        } else {
          await setDoc(doc(this.firestore, 'especialistas', userCredential.user.uid), { ...dataToSave, aprobado: false });
          this.errorMessage = 'Especialista registrado con éxito. Por favor verifique su correo electrónico.';
          this.router.navigate(['/home']);
        }
      } catch (error) {
        console.error('Error al registrar: ', error);
        this.errorMessage = 'Hubo un error al registrar, por favor intente nuevamente';
      }
    } else {
      this.errorMessage = 'Por favor complete todos los campos correctamente';
    }
  }

  agregarEspecialidad(nuevaEspecialidad: string) {
    if (nuevaEspecialidad && !this.especialidades.includes(nuevaEspecialidad)) {
      this.especialidades.push(nuevaEspecialidad);
    }
  }
}
