import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
@Component({
  selector: 'app-get-started',
  templateUrl: './get-started.component.html',
  styleUrls: ['./get-started.component.scss']
})
export class GetStartedComponent implements OnInit {
  
  constructor(
    private router: Router,
    private authService: AuthService
  ) { }
  
  ngOnInit(): void {
    // No longer checking login status or redirecting on this page
    // This is the splash page that should be accessible to all users
  }
  
  navigateToSignIn(): void {
    // Changed to navigate to sign-in instead of directly to chat
    this.router.navigate(['/sign-in']);
  }
}
