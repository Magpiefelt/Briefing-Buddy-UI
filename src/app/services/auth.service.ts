import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { delay, tap, catchError } from 'rxjs/operators';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface KeycloakTokens {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  refresh_expires_in: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticated = true; // Set to true for testing
  private currentUser: User | null = {
    id: 'test-user-id',
    email: 'test@gov.ab.ca',
    name: 'Test User',
    role: 'user'
  }; // Mock user for testing
  private readonly storageKey = 'briefing_buddy_auth';
  private readonly tokenStorageKey = 'briefing_buddy_tokens';
  private readonly sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  // Observable for auth state changes
  private authStateSubject = new BehaviorSubject<boolean>(true); // Set to true for testing
  public authState$ = this.authStateSubject.asObservable();
  
  // Keycloak configuration
  private keycloakConfig = {
    // These would be populated from environment variables in production
    url: 'https://keycloak.example.com/auth',
    realm: 'briefing-buddy',
    clientId: 'briefing-buddy-ui'
  };

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    // Set mock authentication state for testing
    this.setAuthState(true, this.currentUser);
    this.simulateTokenStorage();
  }

  /**
   * Attempt to log in with the provided credentials
   * 
   * In production, this would use Keycloak's authentication flow
   */
  login(email: string, password: string): Observable<User> {
    // For testing, always return success
    return of(this.currentUser as User).pipe(
      delay(300),
      tap(user => {
        this.setAuthState(true, user);
        this.simulateTokenStorage();
      })
    );
  }

  /**
   * Log the current user out
   */
  logout(): Observable<boolean> {
    // For testing, don't actually log out
    return of(true).pipe(
      delay(300)
    );
  }

  /**
   * Check if the user is currently logged in
   */
  isLoggedIn(): boolean {
    return true; // Always return true for testing
  }

  /**
   * Get the current user information
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return 'mock-access-token-for-testing';
  }

  /**
   * Refresh the access token using the refresh token
   */
  refreshToken(): Observable<KeycloakTokens | null> {
    // Mock token refresh for testing
    return of({
      access_token: 'refreshed-mock-access-token-' + new Date().getTime(),
      refresh_token: 'mock-refresh-token',
      id_token: 'refreshed-mock-id-token',
      expires_in: 3600,
      refresh_expires_in: 7200
    });
  }

  /**
   * Store authentication tokens
   */
  private storeTokens(tokens: KeycloakTokens): void {
    try {
      localStorage.setItem(this.tokenStorageKey, JSON.stringify({
        ...tokens,
        issued_at: new Date().getTime()
      }));
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  }

  /**
   * Get stored authentication tokens
   */
  private getStoredTokens(): KeycloakTokens | null {
    try {
      const tokensJson = localStorage.getItem(this.tokenStorageKey);
      return tokensJson ? JSON.parse(tokensJson) : null;
    } catch (error) {
      console.error('Error retrieving tokens:', error);
      return null;
    }
  }

  /**
   * Clear all authentication data
   */
  private clearAuthData(): void {
    // For testing, don't actually clear auth data
    console.log('Auth data clear requested but ignored for testing');
  }

  /**
   * Set authentication state
   */
  private setAuthState(isAuthenticated: boolean, user: User | null): void {
    this.isAuthenticated = isAuthenticated;
    this.currentUser = user;
    this.saveAuthState();
    this.authStateSubject.next(isAuthenticated);
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
    // For testing, always set authenticated state
    this.isAuthenticated = true;
    if (!this.currentUser) {
      this.currentUser = {
        id: 'test-user-id',
        email: 'test@gov.ab.ca',
        name: 'Test User',
        role: 'user'
      };
    }
    this.authStateSubject.next(true);
  }

  /**
   * Generate a consistent user ID from email (for demo only)
   */
  private generateUserId(email: string): string {
    return btoa(email).substring(0, 12);
  }

  /**
   * Generate a display name from email (for demo only)
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
   * Simulate token storage for demo purposes
   */
  private simulateTokenStorage(): void {
    const mockTokens: KeycloakTokens = {
      access_token: 'mock-access-token-' + new Date().getTime(),
      refresh_token: 'mock-refresh-token',
      id_token: 'mock-id-token',
      expires_in: 3600,
      refresh_expires_in: 7200
    };
    
    this.storeTokens(mockTokens);
  }
}
