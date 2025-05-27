import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HealthService {
  private readonly healthEndpoint = '/healthz';
  
  constructor(private http: HttpClient) { }

  /**
   * Check application health status
   * @returns Observable with health status
   */
  checkHealth(): Observable<HealthStatus> {
    return this.http.get<HealthCheckResponse>(`${this.healthEndpoint}`).pipe(
      map(response => ({
        status: 'healthy',
        uptime: response.uptime,
        version: response.version,
        timestamp: new Date().toISOString(),
        webhookStatus: response.webhookStatus
      })),
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
   * @returns Observable with webhook status
   */
  checkWebhookStatus(): Observable<WebhookStatus> {
    // This is a simple ping to check if the webhook URL is reachable
    // In a real implementation, you might want to do a more sophisticated check
    return this.http.get<any>(`${environment.webhookUrl}/ping`, { observe: 'response' }).pipe(
      map(response => ({
        available: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        timestamp: new Date().toISOString()
      })),
      catchError(error => {
        return of({
          available: false,
          statusCode: error.status || 0,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      })
    );
  }
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  uptime?: number;
  version?: string;
  timestamp: string;
  webhookStatus?: WebhookStatus;
  error?: string;
}

export interface WebhookStatus {
  available: boolean;
  statusCode: number;
  timestamp: string;
  error?: string;
}

export interface HealthCheckResponse {
  uptime: number;
  version: string;
  webhookStatus: WebhookStatus;
}
