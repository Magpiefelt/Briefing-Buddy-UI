import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HealthController {
  constructor(private http: HttpClient) { }

  /**
   * Health check endpoint handler
   * This would be used by a server-side controller in a real implementation
   * For Angular SPA, this is a client-side simulation
   */
  getHealthStatus(): Observable<HealthStatus> {
    const startTime = performance.now();
    
    return this.checkWebhookStatus().pipe(
      map(webhookStatus => {
        const responseTime = performance.now() - startTime;
        
        return {
          status: webhookStatus.available ? 'healthy' : 'degraded',
          uptime: this.getUptime(),
          version: this.getAppVersion(),
          responseTime: Math.round(responseTime),
          timestamp: new Date().toISOString(),
          webhookStatus: webhookStatus,
          components: [
            {
              name: 'ui',
              status: 'healthy'
            },
            {
              name: 'webhook',
              status: webhookStatus.available ? 'healthy' : 'unhealthy'
            }
          ]
        };
      }),
      catchError(error => {
        console.error('Health check failed', error);
        return of({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      })
    );
  }

  /**
   * Check if webhook is available
   */
  private checkWebhookStatus(): Observable<WebhookStatus> {
    // In a real implementation, you would make an actual HTTP request to the webhook
    // For demo purposes, we're simulating a response
    return of({
      available: true,
      statusCode: 200,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get application uptime
   */
  private getUptime(): number {
    // In a real implementation, this would be the server uptime
    // For client-side, we can use the time since page load
    if (typeof performance !== 'undefined' && performance.timeOrigin) {
      return Math.round((Date.now() - performance.timeOrigin) / 1000);
    }
    return 0;
  }

  /**
   * Get application version
   */
  private getAppVersion(): string {
    // In a real implementation, this would come from a version file or environment
    return '1.0.0';
  }
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime?: number;
  version?: string;
  responseTime?: number;
  timestamp: string;
  webhookStatus?: WebhookStatus;
  components?: HealthComponent[];
  error?: string;
}

export interface HealthComponent {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: any;
}

export interface WebhookStatus {
  available: boolean;
  statusCode: number;
  timestamp: string;
  error?: string;
}
