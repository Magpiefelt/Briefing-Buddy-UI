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

interface WebhookResponse {
  answer?: string;
  message?: string;
  text?: string;
  content?: string;
  output?: string;
  error?: string;
  data?: {
    answer?: string;
    message?: string;
    text?: string;
    content?: string;
    output?: string;
  };
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
    
    // Use the direct webhook URL instead of trying to proxy through Netlify
    const webhookUrl = environment.webhookUrl;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    // Add structured prompt instruction for consistent output
    const promptWithInstruction = {
      message: text,
      instruction: "Please provide a concise response based on GoA project information. Keep your answer under 250 characters to avoid database constraints. Format your answer as a JSON object with an 'answer' field."
    };
    
    console.log('Sending request to webhook:', webhookUrl);
    
    // Send to webhook and process response
    return this.http.post(webhookUrl, promptWithInstruction, { 
      headers: headers
    }).pipe(
      timeout(this.timeoutDuration),
      retry(this.retryCount),
      map(response => {
        console.log('Webhook response:', response);
        
        // First check if the response is an error object with the specific database length error
        if (this.isLengthErrorResponse(response)) {
          return this.handleLengthError();
        }
        
        let responseText = '';
        
        // Check for various response formats
        if (response) {
          if (typeof response === 'string') {
            // Check if the string response is a JSON error about length
            try {
              const parsedResponse = JSON.parse(response);
              if (this.isLengthErrorResponse(parsedResponse)) {
                return this.handleLengthError();
              }
              responseText = this.extractResponseText(parsedResponse);
            } catch (e) {
              // If parsing fails, use the raw string response
              responseText = response;
            }
          } else {
            // Safely cast to our interface type
            const typedResponse = response as WebhookResponse;
            
            // Check for error response
            if (typedResponse.error) {
              console.error('Error from webhook:', typedResponse.error);
              if (this.isLengthError(typedResponse.error)) {
                return this.handleLengthError();
              }
              return this.createFallbackMessage(`Error from server: ${typedResponse.error}`);
            }
            
            responseText = this.extractResponseText(typedResponse);
          }
        }
        
        if (!responseText) {
          console.warn('Webhook response missing expected content:', response);
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
          if (error.error instanceof ErrorEvent) {
            // Client-side error
            console.error('Client error:', error.error.message);
          } else {
            // Server-side error
            console.error(`Server error: ${error.status}, body:`, error.error);
            
            // Check for specific error messages in the response
            if (this.isLengthErrorResponse(error.error)) {
              return of(this.handleLengthError());
            }
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
            errorMessage = this.createFallbackMessage('Sorry, I encountered an error processing your request. Please try again later.');
          }
        } else {
          // Handle generic Error objects (including timeout from rxjs)
          if (error.name === 'TimeoutError') {
            errorMessage = this.createFallbackMessage('The request timed out. The server might be experiencing high load. Please try again later.');
          } else {
            errorMessage = this.createFallbackMessage('Sorry, I encountered an error processing your request. Please try again later.');
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
   * Check if the response is a length error response
   */
  private isLengthErrorResponse(response: any): boolean {
    if (!response) return false;
    
    // Check direct error object
    if (typeof response === 'object' && response.error && this.isLengthError(response.error)) {
      return true;
    }
    
    // Check string representation
    if (typeof response === 'string') {
      return response.includes('value too long for type character varying');
    }
    
    // Check stringified object
    const stringified = JSON.stringify(response);
    return stringified.includes('value too long for type character varying');
  }
  
  /**
   * Check if the error message is about length
   */
  private isLengthError(error: string): boolean {
    return error.includes('value too long for type character') || 
           error.includes('varying(255)');
  }
  
  /**
   * Handle the specific length error from the backend
   */
  private handleLengthError(): ChatMessage {
    const message = this.createFallbackMessage(
      'The AI generated a response that was too long for our system to process. ' +
      'I\'ll try to provide a shorter answer: The information you requested is available, ' +
      'but requires a more detailed explanation than our system can currently handle. ' +
      'Please try asking a more specific question for a more focused response.'
    );
    
    this.addMessage(message);
    return message;
  }
  
  /**
   * Extract response text from various response formats
   */
  private extractResponseText(response: any): string {
    if (!response) return '';
    
    // Direct fields
    if (response.answer) return response.answer;
    if (response.message) return response.message;
    if (response.text) return response.text;
    if (response.content) return response.content;
    if (response.output) return response.output;
    
    // Common nested structures
    if (response.data) {
      if (response.data.answer) return response.data.answer;
      if (response.data.message) return response.data.message;
      if (response.data.text) return response.data.text;
      if (response.data.content) return response.data.content;
      if (response.data.output) return response.data.output;
    }
    
    // Handle array responses (some webhooks return arrays)
    if (Array.isArray(response) && response.length > 0) {
      const firstItem = response[0];
      if (firstItem.answer) return firstItem.answer;
      if (firstItem.message) return firstItem.message;
      if (firstItem.text) return firstItem.text;
      if (firstItem.content) return firstItem.content;
      if (firstItem.output) return firstItem.output;
    }
    
    // If we couldn't find expected fields, stringify the whole response
    return JSON.stringify(response);
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
