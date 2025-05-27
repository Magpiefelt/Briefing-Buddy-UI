import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable( )
export class AuthInterceptor implements HttpInterceptor {
  constructor() {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip adding auth token for webhook requests
    if (request.url === environment.webhookUrl) {
      return next.handle(request);
    }
    
    // Get the auth token from localStorage
    const token = localStorage.getItem('auth_token');
    
    // Clone the request and add the authorization header if token exists
    if (token) {
      const authReq = request.clone({
        headers: request.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(authReq);
    }
    
    // If no token, proceed with the original request
    return next.handle(request);
  }
}
