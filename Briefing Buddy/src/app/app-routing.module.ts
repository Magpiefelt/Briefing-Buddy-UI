import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SignInComponent } from './components/sign-in/sign-in.component';
import { GetStartedComponent } from './components/get-started/get-started.component';
import { ChatComponent } from './components/chat/chat.component';

const routes: Routes = [
  { path: 'sign-in', component: SignInComponent },
  { path: 'get-started', component: GetStartedComponent },
  { path: 'chat', component: ChatComponent },
  { path: '', redirectTo: '/sign-in', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
