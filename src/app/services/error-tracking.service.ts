import { ErrorHandler, Injectable } from '@angular/core';
import * as Sentry from '@sentry/angular-ivy';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ErrorTrackingService implements ErrorHandler {
  constructor() {
    this.initSentry();
  }

  /**
   * Initialize Sentry error tracking
   */
  private initSentry(): void {
    if (environment.production) {
      Sentry.init({
        dsn: environment.sentryDsn,
        environment: environment.test ? 'test' : 'production',
        tracesSampleRate: 1.0,
        integrations: [
          new Sentry.BrowserTracing({
            routingInstrumentation: Sentry.routingInstrumentation,
          }),
        ],
      });
    }
  }

  /**
   * Handle errors and report to Sentry
   */
  handleError(error: any): void {
    console.error('Error caught by error tracking service:', error);
    
    // Report to Sentry in production environments
    if (environment.production) {
      Sentry.captureException(error);
    }
    
    // Log to console in development
    if (!environment.production) {
      console.error('Error details:', error);
    }
  }

  /**
   * Set user context for error tracking
   */
  setUserContext(user: any): void {
    if (environment.production) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.name
      });
    }
  }

  /**
   * Clear user context
   */
  clearUserContext(): void {
    if (environment.production) {
      Sentry.setUser(null);
    }
  }

  /**
   * Add breadcrumb for tracking user actions
   */
  addBreadcrumb(category: string, message: string, level: Sentry.Severity = Sentry.Severity.Info): void {
    if (environment.production) {
      Sentry.addBreadcrumb({
        category,
        message,
        level
      });
    }
  }

  /**
   * Track specific errors with custom context
   */
  captureError(error: any, context: Record<string, any> = {}): void {
    console.error('Captured error:', error);
    
    if (environment.production) {
      Sentry.withScope(scope => {
        // Add extra context
        Object.keys(context).forEach(key => {
          scope.setExtra(key, context[key]);
        });
        
        Sentry.captureException(error);
      });
    }
  }
}
