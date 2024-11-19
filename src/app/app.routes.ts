import { Routes } from '@angular/router';
import { HomeComponent } from './componentes/home/home.component';
import { LoginComponent } from './componentes/login/login.component';
import { RegistroComponent } from './componentes/registro/registro.component';
import { SeccionUsuariosComponent } from './componentes/seccion-usuarios/seccion-usuarios.component';
import { MisTurnosComponent } from './componentes/mis-turnos/mis-turnos.component';
import { MisTurnosEspecialistaComponent } from './componentes/mis-turnos-especialista/mis-turnos-especialista.component';
import { SolicitarTurnoComponent } from './componentes/solicitar-turno/solicitar-turno.component';
import { MiPerfilComponent } from './componentes/mi-perfil/mi-perfil.component';
import { TurnosComponent } from './componentes/turnos/turnos.component';

export const routes: Routes = [

    { path: '', redirectTo: '/home', pathMatch: "full" },
    { path: 'home', component: HomeComponent },
    { path: 'registro', component: RegistroComponent },
    { path: 'login', component: LoginComponent },
    {path: 'seccion-usuarios', component: SeccionUsuariosComponent},
    { path: 'mis-turnos', component: MisTurnosComponent},
    {path: 'mis-turnos-especialista', component: MisTurnosEspecialistaComponent},
    { path: 'solicitar-turno', component: SolicitarTurnoComponent},
    {path: 'mi-perfil', component: MiPerfilComponent},
    {path: 'turnos', component: TurnosComponent},


];
