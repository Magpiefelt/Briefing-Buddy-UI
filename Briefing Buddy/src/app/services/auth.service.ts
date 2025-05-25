import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticated = false;
  private currentUser: any = null;
  
  // Temporary password for demo purposes
  private readonly DEMO_PASSWORD = 'Communication101';

  constructor() {
    // Check if user is already logged in from localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUser = JSON.parse(storedUser);
      this.isAuthenticated = true;
    }
  }

  /**
   * Login method - currently using a simple password check
   * This will be replaced with Keycloak integration in the future
   */
  login(email: string, password: string): Observable<boolean> {
    // For demo purposes, we're just checking against a hardcoded password
    // In a real implementation, this would make an HTTP call to an auth endpoint
    const isValid = password === this.DEMO_PASSWORD;
    
    if (isValid) {
      this.isAuthenticated = true;
      this.currentUser = {
        email: email,
        name: 'Jane Doe', // Mock user name
        role: 'User'
      };
      
      // Store user info in localStorage for persistence
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }
    
    return of(isValid).pipe(
      tap(success => {
        if (!success) {
          // Clear any existing auth data on failed login
          this.logout();
        }
      })
    );
  }

  /**
   * Logout method
   */
  logout(): Observable<boolean> {
    this.isAuthenticated = false;
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    return of(true);
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Get current user information
   */
  getCurrentUser(): any {
    return this.currentUser;
  }
}
