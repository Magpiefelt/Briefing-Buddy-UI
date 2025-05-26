import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticated = false;
  private currentUser: User | null = null;
  private readonly storageKey = 'briefing_buddy_auth';
  private readonly sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(private router: Router) {
    // Check if user is already logged in from localStorage
    this.loadAuthState();
  }

  /**
   * Attempt to log in with the provided credentials
   */
  login(email: string, password: string): Observable<User> {
    // Input validation
    if (!email || !email.trim()) {
      return throwError(() => new Error('Email is required'));
    }
    
    if (!password || !password.trim()) {
      return throwError(() => new Error('Password is required'));
    }
    
    // For demo purposes, accept any email with the correct password
    // In production, this would call an authentication API
    if (password === 'Communication101') {
      // Create a mock user based on the email
      const user: User = {
        id: this.generateUserId(email),
        email: email,
        name: this.generateNameFromEmail(email),
        role: 'user'
      };
      
      // Simulate API delay
      return of(user).pipe(
        delay(800),
        tap(user => {
          this.isAuthenticated = true;
          this.currentUser = user;
          this.saveAuthState();
        })
      );
    } else {
      return throwError(() => new Error('Invalid credentials. Please try again.'));
    }
  }

  /**
   * Log the current user out
   */
  logout(): Observable<boolean> {
    return of(true).pipe(
      delay(300),
      tap(() => {
        this.isAuthenticated = false;
        this.currentUser = null;
        localStorage.removeItem(this.storageKey);
      })
    );
  }

  /**
   * Check if the user is currently logged in
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Get the current user information
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Save authentication state to localStorage
   */
  private saveAuthState(): void {
    if (this.currentUser) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify({
          isAuthenticated: this.isAuthenticated,
          user: this.currentUser,
          timestamp: new Date().getTime() // Add timestamp for session expiry check
        }));
      } catch (error) {
        console.error('Error saving auth state to localStorage:', error);
      }
    }
  }

  /**
   * Load authentication state from localStorage
   */
  private loadAuthState(): void {
    try {
      const savedAuth = localStorage.getItem(this.storageKey);
      if (savedAuth) {
        const authData = JSON.parse(savedAuth);
        const timestamp = authData.timestamp || 0;
        const now = new Date().getTime();
        
        // Check if session is still valid
        if (now - timestamp < this.sessionDuration) {
          this.isAuthenticated = authData.isAuthenticated;
          this.currentUser = authData.user;
        } else {
          // Session expired
          this.isAuthenticated = false;
          this.currentUser = null;
          localStorage.removeItem(this.storageKey);
          console.log('Session expired. Please log in again.');
        }
      }
    } catch (error) {
      console.error('Error loading auth state from localStorage:', error);
      // If there's an error, reset the auth state
      this.isAuthenticated = false;
      this.currentUser = null;
      localStorage.removeItem(this.storageKey);
    }
  }

  /**
   * Generate a consistent user ID from email
   */
  private generateUserId(email: string): string {
    return btoa(email).substring(0, 12);
  }

  /**
   * Generate a display name from email
   */
  private generateNameFromEmail(email: string): string {
    // Extract name part from email and capitalize
    const namePart = email.split('@')[0];
    return namePart
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  
  /**
   * Refresh the current session
   */
  refreshSession(): void {
    if (this.isAuthenticated && this.currentUser) {
      this.saveAuthState();
    }
  }
}
