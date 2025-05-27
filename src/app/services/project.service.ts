import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, retry, timeout } from 'rxjs/operators';

export interface MinistryProject {
  ministry: string;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private webhookUrl = 'https://govab.app.n8n.cloud/webhook/10e3909d-3a60-41b5-9b2f-a6c3bc149d9d';
  
  // Fallback static data in case the webhook fails
  private fallbackData: MinistryProject[] = [
    { ministry: 'Advanced Education', count: 10 },
    { ministry: 'Affordability and Utilities', count: 2 },
    { ministry: 'Agriculture and Irrigation', count: 3 },
    { ministry: 'Arts, Culture and Status of Women', count: 3 },
    { ministry: 'Children and Family Services', count: 3 },
    { ministry: 'Communications and Public Engagement', count: 0 },
    { ministry: 'Education', count: 6 },
    { ministry: 'Energy and Minerals', count: 6 },
    { ministry: 'Environment and Protected Areas', count: 11 },
    { ministry: 'Executive Council', count: 1 },
    { ministry: 'Forestry and Parks', count: 12 },
    { ministry: 'Health', count: 1 }
  ];
  
  constructor(private http: HttpClient) { }
  
  /**
   * Fetch ministry project counts from the webhook
   */
  getMinistryProjects(): Observable<MinistryProject[]> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    // Send the specified prompt to the webhook
    return this.http.post<any>(
      this.webhookUrl, 
      { message: 'Display the number of projects for each ministry' }, 
      { headers }
    ).pipe(
      timeout(30000), // 30 second timeout
      retry(1), // Retry once on failure
      map(response => {
        console.log('Webhook response for projects:', response);
        
        // Parse response text from any of the possible fields
        const responseText = 
          response.answer || 
          response.message || 
          response.text || 
          response.content ||
          response.output ||
          (response.data && (
            response.data.answer || 
            response.data.message || 
            response.data.text || 
            response.data.content ||
            response.data.output
          )) ||
          (Array.isArray(response) && response.length > 0 && (
            response[0].answer || 
            response[0].message || 
            response[0].text || 
            response[0].content ||
            response[0].output
          )) ||
          (typeof response === 'string' ? response : null);
        
        if (!responseText) {
          console.warn('Webhook response missing expected fields:', response);
          return this.fallbackData;
        }
        
        // Parse the response text to extract ministry and project counts
        return this.parseMinistryProjectsFromText(responseText);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching ministry projects:', error);
        
        // Log detailed error information
        if (error.error instanceof ErrorEvent) {
          console.error('Client error:', error.error.message);
        } else {
          console.error(`Server error: ${error.status}, body:`, error.error);
        }
        
        // Return fallback data on error
        console.warn('Using fallback ministry project data due to API error');
        return of(this.fallbackData);
      })
    );
  }
  
  /**
   * Parse ministry project counts from text response
   * Expected format examples:
   * - "Education: 5 projects"
   * - "Energy: 4 projects"
   */
  private parseMinistryProjectsFromText(text: string): MinistryProject[] {
    try {
      // Split the text by newlines to get each ministry line
      const lines = text.split('\n');
      const ministryProjects: MinistryProject[] = [];
      
      // Regular expression to match ministry and count
      // This handles formats like "Ministry Name: X projects" or "Ministry Name - X projects"
      const regex = /([^:]+)[:|-]\s*(\d+)\s*projects?/i;
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const match = line.match(regex);
        if (match && match.length >= 3) {
          const ministry = match[1].trim();
          const count = parseInt(match[2], 10);
          
          if (!isNaN(count)) {
            ministryProjects.push({ ministry, count });
          }
        }
      }
      
      // If we couldn't parse any ministry projects, return fallback data
      if (ministryProjects.length === 0) {
        console.warn('Failed to parse ministry projects from text:', text);
        return this.fallbackData;
      }
      
      return ministryProjects;
    } catch (error) {
      console.error('Error parsing ministry projects from text:', error);
      return this.fallbackData;
    }
  }
}
