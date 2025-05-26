import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap, finalize } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip token attachment for certain URLs (like auth endpoints)
    if (this.shouldSkipTokenAttachment(request.url)) {
      return next.handle(request);
    }

    // Get the access token from AuthService
    const token = this.authService.getAccessToken();
    
    // If token exists, clone the request and add the authorization header
    if (token) {
      request = this.addTokenToRequest(request, token);
    }

    // Handle the request and catch any errors
    return next.handle(request).pipe(
      catchError(error => {
        // Handle 401 Unauthorized errors which might indicate an expired token
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401Error(request, next);
        }
        
        // For other errors, just pass them along
        return throwError(() => error);
      })
    );
  }

  /**
   * Add the authorization token to the request headers
   */
  private addTokenToRequest(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  /**
   * Handle 401 Unauthorized errors by attempting to refresh the token
   */
  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      // Attempt to refresh the token
      return this.authService.refreshToken().pipe(
        switchMap(tokens => {
          this.isRefreshing = false;
          
          if (tokens) {
            this.refreshTokenSubject.next(tokens.access_token);
            return next.handle(this.addTokenToRequest(request, tokens.access_token));
          }
          
          // If token refresh fails, redirect to login
          this.authService.logout().subscribe(() => {
            // Redirect handled by AuthService
          });
          
          return throwError(() => new Error('Token refresh failed'));
        }),
        catchError(error => {
          this.isRefreshing = false;
          
          // If refresh fails, logout and redirect to login
          this.authService.logout().subscribe(() => {
            // Redirect handled by AuthService
          });
          
          return throwError(() => error);
        }),
        finalize(() => {
          this.isRefreshing = false;
        })
      );
    } else {
      // If a refresh is already in progress, wait for it to complete
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          return next.handle(this.addTokenToRequest(request, token));
        })
      );
    }
  }

  /**
   * Determine if token attachment should be skipped for certain URLs
   */
  private shouldSkipTokenAttachment(url: string): boolean {
    // Skip token attachment for authentication endpoints
    const skipUrls = [
      'openid-connect/token',
      'openid-connect/logout',
      'auth/login',
      'auth/register'
    ];
    
    return skipUrls.some(skipUrl => url.includes(skipUrl));
  }
}
