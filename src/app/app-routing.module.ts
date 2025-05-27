import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SignInComponent } from './components/sign-in/sign-in.component';
import { GetStartedComponent } from './components/get-started/get-started.component';
import { ChatComponent } from './components/chat/chat.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { AuthGuard } from './guards/auth.guard';
const routes: Routes = [
  { path: 'sign-in', component: SignInComponent },
  { path: 'get-started', component: GetStartedComponent }, // Removed AuthGuard to allow unauthenticated access
  { path: 'chat', component: ChatComponent }, // Removed AuthGuard temporarily for QA testing
  { path: 'projects', component: ProjectsComponent }, // Added new projects route
  { path: '', redirectTo: '/get-started', pathMatch: 'full' } // Changed to redirect to get-started
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
