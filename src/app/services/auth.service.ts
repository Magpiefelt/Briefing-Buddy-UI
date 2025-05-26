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
  private isAuthenticated = false;
  private currentUser: User | null = null;
  private readonly storageKey = 'briefing_buddy_auth';
  private readonly tokenStorageKey = 'briefing_buddy_tokens';
  private readonly sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  // Observable for auth state changes
  private authStateSubject = new BehaviorSubject<boolean>(false);
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
    // Check if user is already logged in from localStorage
    this.loadAuthState();
  }

  /**
   * Attempt to log in with the provided credentials
   * 
   * In production, this would use Keycloak's authentication flow
   */
  login(email: string, password: string): Observable<User> {
    // Input validation
    if (!email || !email.trim()) {
      return throwError(() => new Error('Email is required'));
    }
    
    if (!password || !password.trim()) {
      return throwError(() => new Error('Password is required'));
    }
    
    // DEMO MODE: For demo purposes, accept any email with the correct password
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
          this.setAuthState(true, user);
          this.simulateTokenStorage(); // Store mock tokens for demo
        })
      );
    } else {
      return throwError(() => new Error('Invalid credentials. Please try again.'));
    }
    
    /* KEYCLOAK IMPLEMENTATION (commented for future implementation)
    
    // This would be the actual Keycloak implementation
    const tokenEndpoint = `${this.keycloakConfig.url}/realms/${this.keycloakConfig.realm}/protocol/openid-connect/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', this.keycloakConfig.clientId);
    params.append('grant_type', 'password');
    params.append('username', email);
    params.append('password', password);
    
    return this.http.post<KeycloakTokens>(tokenEndpoint, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).pipe(
      tap(tokens => {
        // Store tokens
        this.storeTokens(tokens);
        
        // Parse user info from tokens or fetch from userinfo endpoint
        const user = this.parseUserFromToken(tokens.access_token);
        this.setAuthState(true, user);
      }),
      catchError(error => {
        console.error('Login failed:', error);
        return throwError(() => new Error('Authentication failed. Please check your credentials.'));
      })
    );
    */
  }

  /**
   * Log the current user out
   */
  logout(): Observable<boolean> {
    /* KEYCLOAK IMPLEMENTATION (commented for future implementation)
    
    // This would be the actual Keycloak logout implementation
    const tokens = this.getStoredTokens();
    const logoutEndpoint = `${this.keycloakConfig.url}/realms/${this.keycloakConfig.realm}/protocol/openid-connect/logout`;
    
    if (tokens) {
      const params = new URLSearchParams();
      params.append('client_id', this.keycloakConfig.clientId);
      params.append('refresh_token', tokens.refresh_token);
      
      return this.http.post(logoutEndpoint, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }).pipe(
        tap(() => {
          this.clearAuthData();
        }),
        catchError(error => {
          console.error('Logout error:', error);
          // Still clear local auth data even if server logout fails
          this.clearAuthData();
          return of(true);
        })
      );
    }
    */
    
    // DEMO MODE: Simple logout for demo
    return of(true).pipe(
      delay(300),
      tap(() => {
        this.clearAuthData();
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
   * Get the current access token
   */
  getAccessToken(): string | null {
    const tokens = this.getStoredTokens();
    return tokens ? tokens.access_token : null;
  }

  /**
   * Refresh the access token using the refresh token
   */
  refreshToken(): Observable<KeycloakTokens | null> {
    const tokens = this.getStoredTokens();
    
    if (!tokens || !tokens.refresh_token) {
      return of(null);
    }
    
    /* KEYCLOAK IMPLEMENTATION (commented for future implementation)
    
    const tokenEndpoint = `${this.keycloakConfig.url}/realms/${this.keycloakConfig.realm}/protocol/openid-connect/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', this.keycloakConfig.clientId);
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', tokens.refresh_token);
    
    return this.http.post<KeycloakTokens>(tokenEndpoint, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).pipe(
      tap(newTokens => {
        this.storeTokens(newTokens);
      }),
      catchError(error => {
        console.error('Token refresh failed:', error);
        // If refresh fails, user needs to login again
        this.clearAuthData();
        this.router.navigate(['/sign-in']);
        return of(null);
      })
    );
    */
    
    // DEMO MODE: Simulate token refresh for demo
    return of({
      access_token: 'refreshed-mock-access-token-' + new Date().getTime(),
      refresh_token: tokens.refresh_token,
      id_token: 'refreshed-mock-id-token',
      expires_in: 3600,
      refresh_expires_in: 7200
    }).pipe(
      delay(300),
      tap(newTokens => {
        if (newTokens) {
          this.storeTokens(newTokens);
        }
      })
    );
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
    this.isAuthenticated = false;
    this.currentUser = null;
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.tokenStorageKey);
    this.authStateSubject.next(false);
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
          this.authStateSubject.next(this.isAuthenticated);
        } else {
          // Session expired
          this.clearAuthData();
          console.log('Session expired. Please log in again.');
        }
      }
    } catch (error) {
      console.error('Error loading auth state from localStorage:', error);
      // If there's an error, reset the auth state
      this.clearAuthData();
    }
  }

  /**
   * Parse user information from JWT token
   * This is a simplified version - in production would use proper JWT decoding
   */
  private parseUserFromToken(token: string): User {
    // DEMO MODE: This is a mock implementation
    // In production, would decode the JWT and extract user info
    return {
      id: 'user-id-from-token',
      email: 'user@example.com',
      name: 'User From Token',
      role: 'user'
    };
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
