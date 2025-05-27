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
  private maxMessageLength = 250; // Character limit for messages to prevent database errors
  
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
    
    // Check message length to prevent database errors
    if (text.length > this.maxMessageLength) {
      return this.handleMessageTooLong(text);
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
      instruction: "Please provide a detailed response based on GoA project information. Format your answer as a JSON object with an 'answer' field containing your complete response. Include specific project details when available."
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
        
        let responseText = '';
        
        // Check for various response formats
        if (response) {
          if (typeof response === 'string') {
            responseText = response;
          } else {
            // Safely cast to our interface type
            const typedResponse = response as WebhookResponse;
            
            // Check for error response
            if (typedResponse.error) {
              console.error('Error from webhook:', typedResponse.error);
              if (typedResponse.error.includes('value too long')) {
                return this.createFallbackMessage('Your message is too long for our system to process. Please try a shorter message (under 250 characters).');
              }
              return this.createFallbackMessage(`Error from server: ${typedResponse.error}`);
            }
            
            // Check for nested response structures that might contain the answer
            responseText = 
              // Direct fields
              typedResponse.answer || 
              typedResponse.message || 
              typedResponse.text || 
              typedResponse.content ||
              typedResponse.output ||
              // Common nested structures
              (typedResponse.data && (
                typedResponse.data.answer || 
                typedResponse.data.message || 
                typedResponse.data.text || 
                typedResponse.data.content ||
                typedResponse.data.output
              )) ||
              // If we couldn't find expected fields, stringify the whole response
              JSON.stringify(response);
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
            if (typeof error.error === 'object' && error.error !== null) {
              const errorObj = error.error as any;
              if (errorObj.error && typeof errorObj.error === 'string') {
                if (errorObj.error.includes('value too long')) {
                  return of(this.createFallbackMessage('Your message is too long for our system to process. Please try a shorter message (under 250 characters).'));
                }
              }
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
   * Handle messages that exceed the character limit
   */
  private handleMessageTooLong(text: string): Observable<ChatMessage> {
    // Create user message with truncated text for display
    const userMessage: ChatMessage = {
      from: 'user',
      text: text.substring(0, this.maxMessageLength) + '...',
      timestamp: new Date()
    };
    
    // Add to messages
    this.addMessage(userMessage);
    
    // Create error message
    const errorMessage = this.createFallbackMessage(
      'Your message is too long for our system to process. Please try a shorter message (under 250 characters).'
    );
    
    // Add to messages
    this.addMessage(errorMessage);
    
    // Return as observable
    return of(errorMessage);
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
