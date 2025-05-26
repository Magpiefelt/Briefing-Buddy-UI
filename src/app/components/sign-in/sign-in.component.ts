import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
})
export class SignInComponent implements OnInit {
  loginForm!: FormGroup; // Using definite assignment assertion
  loading = false;
  submitted = false;
  errorMessage = '';
  returnUrl: string = '/chat'; // Default to chat if no returnUrl specified

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Redirect to chat if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/chat']);
      return;
    }

    // Get return url from route parameters or default to '/chat'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/chat';

    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // Convenience getter for easy access to form fields
  get f() { 
    return this.loginForm.controls as {
      [key: string]: any
    }; 
  }

  onSubmit(): void {
    this.submitted = true;

    // Stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(
      this.loginForm.value.email,
      this.loginForm.value.password
    ).subscribe({
      next: () => {
        // Navigate to returnUrl (chat by default) instead of get-started
        this.router.navigate([this.returnUrl]);
      },
      error: (error) => {
        this.errorMessage = error.message || 'An error occurred during sign in. Please try again.';
        this.loading = false;
      }
    });
  }
}
