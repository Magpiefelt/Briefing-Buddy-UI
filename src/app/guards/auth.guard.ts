import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.authService.isLoggedIn()) {
      // User is logged in, allow access
      return true;
    }
    
    // Store the attempted URL for redirecting after login
    // We'll store this in the router queryParams instead since redirectUrl doesn't exist
    
    // User is not logged in, redirect to sign-in page
    this.router.navigate(['/sign-in'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }
}
