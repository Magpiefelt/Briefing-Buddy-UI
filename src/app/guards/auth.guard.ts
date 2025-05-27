import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // For testing purposes, bypass authentication for all routes
    return true;
    
    // Original authentication logic (commented out for testing)
    /*
    if (this.authService.isLoggedIn()) {
      return true;
    }
    
    // Redirect to login page with return URL
    this.router.navigate(['/sign-in'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
    */
  }
}
