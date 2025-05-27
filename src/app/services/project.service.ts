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
  private retryCount = 2; // Number of retries for failed requests
  private timeoutDuration = 30000; // 30 seconds timeout
  private isOffline = false;
  
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
  
  constructor(private http: HttpClient) {
    // Check network status
    this.checkNetworkStatus();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOffline = false;
      console.log('Application is online');
    });
    
    window.addEventListener('offline', () => {
      this.isOffline = true;
      console.log('Application is offline');
    });
  }
  
  /**
   * Check if the application is online
   */
  private checkNetworkStatus(): void {
    this.isOffline = !navigator.onLine;
  }
  
  /**
   * Fetch ministry project counts from the webhook
   */
  getMinistryProjects(): Observable<MinistryProject[]> {
    // Check if offline
    if (this.isOffline) {
      console.warn('Application is offline. Using fallback data.');
      return of(this.loadCachedData() || this.fallbackData);
    }
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    // Add structured prompt instruction for consistent output
    const promptWithInstruction = {
      message: 'Display the number of projects for each ministry',
      instruction: "Please return a JSON object where each key is a ministry name and each value is the number of in-flight projects. Example: {\"Education\": 5, \"Energy\": 3, ...}"
    };
    
    // Send the specified prompt to the webhook
    return this.http.post<any>(
      this.webhookUrl, 
      promptWithInstruction, 
      { headers }
    ).pipe(
      timeout(this.timeoutDuration),
      retry(this.retryCount),
      map(response => {
        console.log('Webhook response for projects:', response);
        
        // Try to parse as JSON first
        try {
          // Check if response is already a parsed object with ministry data
          if (typeof response === 'object' && response !== null && !Array.isArray(response)) {
            // Check if it's in the expected format (ministry keys with number values)
            const ministryEntries = Object.entries(response);
            if (ministryEntries.length > 0 && typeof ministryEntries[0][1] === 'number') {
              console.log('Parsed JSON ministry data:', ministryEntries);
              const ministryProjects = ministryEntries.map(([ministry, count]) => ({
                ministry,
                count: Number(count)
              }));
              
              // Cache the successful response
              this.cacheData(ministryProjects);
              
              return ministryProjects;
            }
          }
          
          // If we get here, the response wasn't in the expected format
          // Try to extract from nested fields
          const responseData = 
            response.data || 
            response.result || 
            response.output || 
            response.ministries ||
            response;
          
          if (typeof responseData === 'object' && responseData !== null) {
            const ministryEntries = Object.entries(responseData);
            if (ministryEntries.length > 0 && typeof ministryEntries[0][1] === 'number') {
              console.log('Parsed nested JSON ministry data:', ministryEntries);
              const ministryProjects = ministryEntries.map(([ministry, count]) => ({
                ministry,
                count: Number(count)
              }));
              
              // Cache the successful response
              this.cacheData(ministryProjects);
              
              return ministryProjects;
            }
          }
        } catch (error) {
          console.warn('Error parsing JSON response:', error);
        }
        
        // If JSON parsing fails, try to parse from text
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
          return this.loadCachedData() || this.fallbackData;
        }
        
        // Parse the response text to extract ministry and project counts
        const ministryProjects = this.parseMinistryProjectsFromText(responseText);
        
        // Cache the successful response
        this.cacheData(ministryProjects);
        
        return ministryProjects;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching ministry projects:', error);
        
        // Log detailed error information
        if (error.error instanceof ErrorEvent) {
          console.error('Client error:', error.error.message);
        } else {
          console.error(`Server error: ${error.status}, body:`, error.error);
        }
        
        // Return cached data if available, otherwise fallback data
        console.warn('Using cached or fallback ministry project data due to API error');
        return of(this.loadCachedData() || this.fallbackData);
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
      // Try to parse as JSON first
      try {
        const jsonObject = JSON.parse(text);
        if (typeof jsonObject === 'object' && jsonObject !== null) {
          const ministryEntries = Object.entries(jsonObject);
          if (ministryEntries.length > 0) {
            return ministryEntries.map(([ministry, count]) => ({
              ministry,
              count: Number(count)
            }));
          }
        }
      } catch (e) {
        // Not valid JSON, continue with text parsing
      }
      
      // Split the text by newlines to get each ministry line
      const lines = text.split('\n');
      const ministryProjects: MinistryProject[] = [];
      
      // Regular expressions to match different formats
      const formats = [
        /([^:]+)[:|-]\s*(\d+)\s*projects?/i,  // "Ministry: X projects" or "Ministry - X projects"
        /([^:]+)[:|-]\s*(\d+)/i,              // "Ministry: X" or "Ministry - X"
        /(\w+(?:\s+\w+)*)\s*[:|-]?\s*(\d+)/i  // "Ministry X" (more flexible)
      ];
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        let matched = false;
        
        // Try each format until one matches
        for (const regex of formats) {
          const match = line.match(regex);
          if (match && match.length >= 3) {
            const ministry = match[1].trim();
            const count = parseInt(match[2], 10);
            
            if (!isNaN(count)) {
              ministryProjects.push({ ministry, count });
              matched = true;
              break;
            }
          }
        }
        
        // If no format matched, try to extract any ministry name and number
        if (!matched) {
          // Look for any word followed by a number
          const generalMatch = line.match(/([A-Za-z\s&]+).*?(\d+)/);
          if (generalMatch && generalMatch.length >= 3) {
            const ministry = generalMatch[1].trim();
            const count = parseInt(generalMatch[2], 10);
            
            if (ministry.length > 2 && !isNaN(count)) {
              ministryProjects.push({ ministry, count });
            }
          }
        }
      }
      
      // If we couldn't parse any ministry projects, return fallback data
      if (ministryProjects.length === 0) {
        console.warn('Failed to parse ministry projects from text:', text);
        return this.loadCachedData() || this.fallbackData;
      }
      
      return ministryProjects;
    } catch (error) {
      console.error('Error parsing ministry projects from text:', error);
      return this.loadCachedData() || this.fallbackData;
    }
  }
  
  /**
   * Cache ministry project data in localStorage
   */
  private cacheData(ministryProjects: MinistryProject[]): void {
    try {
      const cacheData = {
        timestamp: new Date().toISOString(),
        data: ministryProjects
      };
      localStorage.setItem('briefingBuddy_ministryProjects', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache ministry projects in localStorage:', error);
    }
  }
  
  /**
   * Load cached data from localStorage
   */
  private loadCachedData(): MinistryProject[] | null {
    try {
      const cachedData = localStorage.getItem('briefingBuddy_ministryProjects');
      if (cachedData) {
        const { data } = JSON.parse(cachedData);
        return data;
      }
    } catch (error) {
      console.warn('Failed to load cached ministry projects from localStorage:', error);
    }
    return null;
  }
}
