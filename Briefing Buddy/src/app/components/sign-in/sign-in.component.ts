import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
})
export class SignInComponent implements OnInit {
  signInForm: FormGroup;
  errorMessage: string = '';
  isSubmitting: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.signInForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Check if user is already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/chat']);
    }
  }

  onSubmit(): void {
    if (this.signInForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const email = this.signInForm.get('email')?.value;
    const password = this.signInForm.get('password')?.value;

    this.authService.login(email, password).subscribe({
      next: (success) => {
        if (success) {
          this.router.navigate(['/get-started']);
        } else {
          this.errorMessage = 'Invalid email or password.';
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        this.errorMessage = 'An error occurred during sign in. Please try again.';
        this.isSubmitting = false;
      }
    });
  }
}
