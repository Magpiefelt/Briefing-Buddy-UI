import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, retry, timeout, finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  id?: string;
  from: 'user' | 'assistant';
  text: string;
  timestamp?: Date;
  error?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messages: ChatMessage[] = [];
  private retryCount = 2; // Number of retries for failed requests
  private timeoutDuration = 30000; // 30 seconds timeout
  private isOffline = false;
  
  constructor(private http: HttpClient) {
    // Load any saved messages from localStorage
    this.loadMessages();
    
    // Check network status
    this.checkNetworkStatus();
    
    // If no messages exist, add a welcome message
    if (this.messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: '1',
        from: 'assistant',
        text: 'Hi, I am BriefingBuddy — your AI Agent for GoA projects. How can I help you today?',
        timestamp: new Date()
      };
      this.addMessage(welcomeMessage);
    }
    
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
   * Get all messages in the current chat session
   */
  getMessages(): ChatMessage[] {
    return this.messages;
  }
  
  /**
   * Add a message to the chat
   */
  addMessage(message: ChatMessage): void {
    // Generate ID if not provided
    if (!message.id) {
      message.id = Date.now().toString();
    }
    
    // Add timestamp if not provided
    if (!message.timestamp) {
      message.timestamp = new Date();
    }
    
    this.messages.push(message);
    this.saveMessages();
  }
  
  /**
   * Send a message to the AI service and get a response
   */
  sendMessage(text: string): Observable<ChatMessage> {
    // Check if offline
    if (this.isOffline) {
      return this.handleOfflineMode(text);
    }
    
    // Create user message
    const userMessage: ChatMessage = {
      from: 'user',
      text: text,
      timestamp: new Date()
    };
    
    // Add to messages
    this.addMessage(userMessage);
    
    // Prepare request to webhook
    // Use the proxy URL if we're in a browser environment
    let webhookUrl = environment.webhookUrl;
    console.log('Original webhook URL:', webhookUrl);
    
    if (typeof window !== 'undefined') {
      // Extract the webhook ID from the full URL
      const webhookId = webhookUrl.split('/').pop();
      console.log('Extracted webhook ID:', webhookId);
      
      // Use the Netlify proxy path instead of the direct URL
      // Modified to use /api/webhook/ to match Netlify redirect pattern
      webhookUrl = `/api/webhook/${webhookId}`;
      console.log('Using proxied webhook URL:', webhookUrl);
    }
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    console.log('Request headers:', headers);
    
    // Add structured prompt instruction for consistent output
    const promptWithInstruction = {
      message: text,
      instruction: "Please provide a detailed response based on GoA project information. Format your answer as a JSON object with an 'answer' field containing your complete response. Include specific project details when available."
    };
    
    console.log('Sending prompt to webhook:', promptWithInstruction);
    
    // Try direct webhook call first with detailed logging
    return this.http.post(webhookUrl, promptWithInstruction, { 
      headers: headers,
      observe: 'response'  // Get full response including headers
    }).pipe(
      timeout(this.timeoutDuration),
      retry(this.retryCount),
      map(response => {
        console.log('Webhook response status:', response.status);
        console.log('Webhook response headers:', response.headers);
        console.log('Webhook response body:', response.body);
        
        let responseText = '';
        const responseBody = response.body;
        
        // Check for nested response structures that might contain the answer
        if (responseBody) {
          try {
            responseText = 
              // Direct fields
              (responseBody as any).answer || 
              (responseBody as any).message || 
              (responseBody as any).text || 
              (responseBody as any).content ||
              (responseBody as any).output ||
              // Common nested structures
              ((responseBody as any).data && (
                (responseBody as any).data.answer || 
                (responseBody as any).data.message || 
                (responseBody as any).data.text || 
                (responseBody as any).data.content ||
                (responseBody as any).data.output
              )) ||
              // Handle array responses (some webhooks return arrays)
              (Array.isArray(responseBody) && responseBody.length > 0 && (
                (responseBody[0] as any).answer || 
                (responseBody[0] as any).message || 
                (responseBody[0] as any).text || 
                (responseBody[0] as any).content ||
                (responseBody[0] as any).output
              ));
              
            console.log('Extracted response text:', responseText);
          } catch (e) {
            console.error('Error extracting response fields:', e);
          }
        }
        
        if (!responseText) {
          // If we couldn't find expected fields, try to use the raw response
          console.warn('Could not find expected fields in response, using raw response');
          try {
            if (typeof responseBody === 'string') {
              // If it's already a string, use it directly
              responseText = responseBody;
            } else {
              // Otherwise stringify it
              responseText = JSON.stringify(responseBody);
            }
            console.log('Using stringified response:', responseText);
          } catch (e) {
            console.error('Error stringifying response:', e);
            responseText = String(responseBody);
          }
        }
        
        if (!responseText) {
          console.warn('Webhook response missing expected content:', responseBody);
          return this.createFallbackMessage('I received a response but couldn\'t parse it properly. Please try rephrasing your question.');
        }
        
        // Create assistant message from response
        const assistantMessage: ChatMessage = {
          from: 'assistant',
          text: responseText,
          timestamp: new Date()
        };
        
        // Add to messages
        this.addMessage(assistantMessage);
        
        return assistantMessage;
      }),
      catchError((error: HttpErrorResponse | Error) => {
        console.error('Error sending message to webhook:', error);
        
        // Create appropriate error message based on error type
        let errorMessage: ChatMessage;
        
        if (error instanceof HttpErrorResponse) {
          // Log detailed error information for HttpErrorResponse
          console.error('HTTP Error Status:', error.status);
          console.error('HTTP Error Status Text:', error.statusText);
          console.error('HTTP Error URL:', error.url);
          console.error('HTTP Error Type:', error.type);
          console.error('HTTP Error Headers:', error.headers);
          
          if (error.error instanceof ErrorEvent) {
            // Client-side error
            console.error('Client error:', error.error.message);
            console.error('Client error stack:', error.error.error?.stack);
          } else {
            // Server-side error
            console.error(`Server error: ${error.status}, body:`, error.error);
          }
          
          if (error.status === 0) {
            // Network error or CORS issue
            errorMessage = this.createFallbackMessage('Network error or CORS issue. Please check your internet connection and ensure the webhook allows cross-origin requests from this domain.');
          } else if (error.status === 408) {
            // HTTP timeout error
            errorMessage = this.createFallbackMessage('The request timed out. The server might be experiencing high load. Please try again later.');
          } else if (error.status >= 500) {
            // Server error
            errorMessage = this.createFallbackMessage('The server encountered an error. Our team has been notified and is working on it. Please try again later.');
          } else {
            // Other HTTP errors
            errorMessage = this.createFallbackMessage(`Sorry, I encountered an error processing your request (HTTP ${error.status}). Please try again later.`);
          }
        } else {
          // Handle generic Error objects (including timeout from rxjs)
          console.error('Generic error name:', error.name);
          console.error('Generic error message:', error.message);
          console.error('Generic error stack:', error.stack);
          
          if (error.name === 'TimeoutError') {
            errorMessage = this.createFallbackMessage('The request timed out. The server might be experiencing high load. Please try again later.');
          } else {
            errorMessage = this.createFallbackMessage(`Sorry, I encountered an error processing your request (${error.name}). Please try again later.`);
          }
        }
        
        // Add error message to chat
        this.addMessage(errorMessage);
        
        // Return the error message as an observable
        return of(errorMessage);
      })
    );
  }
  
  /**
   * Handle offline mode with a graceful fallback
   */
  private handleOfflineMode(text: string): Observable<ChatMessage> {
    // Create a fallback message for offline mode
    const offlineMessage = this.createFallbackMessage(
      'You appear to be offline. Your message has been saved and will be processed when you reconnect to the internet.'
    );
    
    // Add to messages
    this.addMessage(offlineMessage);
    
    // Return as observable
    return of(offlineMessage);
  }
  
  /**
   * Create a fallback message with error flag
   */
  private createFallbackMessage(text: string): ChatMessage {
    return {
      from: 'assistant',
      text: text,
      timestamp: new Date(),
      error: true
    };
  }
  
  /**
   * Clear all messages in the current chat session
   */
  clearMessages(): void {
    this.messages = [];
    localStorage.removeItem('chatMessages');
    
    // Add welcome message back
    const welcomeMessage: ChatMessage = {
      id: '1',
      from: 'assistant',
      text: 'Hi, I am BriefingBuddy — your AI Agent for GoA projects. How can I help you today?',
      timestamp: new Date()
    };
    this.addMessage(welcomeMessage);
  }
  
  /**
   * Export chat history as text
   */
  exportChatAsText(): string {
    let exportText = 'Briefing Buddy Chat Export\n';
    exportText += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    this.messages.forEach(message => {
      const sender = message.from === 'user' ? 'You' : 'BriefingBuddy';
      const time = message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : '';
      exportText += `[${time}] ${sender}: ${message.text}\n\n`;
    });
    
    return exportText;
  }
  
  /**
   * Export chat history as JSON
   */
  exportChatAsJson(): string {
    return JSON.stringify({
      metadata: {
        generated: new Date().toISOString(),
        count: this.messages.length
      },
      messages: this.messages
    }, null, 2);
  }
  
  /**
   * Load messages from localStorage
   */
  private loadMessages(): void {
    try {
      const savedMessages = localStorage.getItem('chatMessages');
      if (savedMessages) {
        this.messages = JSON.parse(savedMessages);
      }
    } catch (error) {
      console.error('Error parsing saved messages:', error);
      // If there's an error parsing, start with empty messages
      this.messages = [];
      localStorage.removeItem('chatMessages');
    }
  }
  
  /**
   * Save messages to localStorage
   */
  private saveMessages(): void {
    try {
      // Limit message history to last 100 messages to prevent localStorage overflow
      const messagesToSave = this.messages.slice(-100);
      localStorage.setItem('chatMessages', JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Error saving messages to localStorage:', error);
      // If localStorage is full or unavailable, show a warning
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded. Chat history may not be saved.');
        // Try to save fewer messages
        try {
          const reducedMessages = this.messages.slice(-50);
          localStorage.setItem('chatMessages', JSON.stringify(reducedMessages));
        } catch (innerError) {
          console.error('Failed to save reduced message set:', innerError);
        }
      }
    }
  }
}

