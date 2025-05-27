import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SignInComponent } from './components/sign-in/sign-in.component';
import { GetStartedComponent } from './components/get-started/get-started.component';
import { ChatComponent } from './components/chat/chat.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'sign-in', component: SignInComponent },
  { path: 'get-started', component: GetStartedComponent },
  { path: 'chat', component: ChatComponent, canActivate: [AuthGuard] },
  { path: 'projects', component: ProjectsComponent, canActivate: [AuthGuard] },
  { path: 'pending-approvals', redirectTo: '/chat', pathMatch: 'full' }, // Placeholder for future implementation
  { path: 'requests', redirectTo: '/chat', pathMatch: 'full' }, // Placeholder for future implementation
  { path: 'bookmarks', redirectTo: '/chat', pathMatch: 'full' }, // Placeholder for future implementation
  { path: '', redirectTo: '/get-started', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
