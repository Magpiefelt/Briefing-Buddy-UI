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
    // Removed auto-redirect to chat to ensure splash page always appears first
    // This follows the PDF instructions to fix the navigation flow
  }
  
  navigateToSignIn(): void {
    // Navigate to sign-in
    this.router.navigate(['/sign-in']);
  }
}
