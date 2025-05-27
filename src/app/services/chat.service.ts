import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  id?: string;
  from: 'user' | 'assistant';
  text: string;
  timestamp?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messages: ChatMessage[] = [];
  
  constructor(private http: HttpClient) {
    // Load any saved messages from localStorage
    this.loadMessages();
    
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
    // Create user message
    const userMessage: ChatMessage = {
      from: 'user',
      text: text,
      timestamp: new Date()
    };
    
    // Add to messages
    this.addMessage(userMessage);
    
    // Prepare request to webhook
    const webhookUrl = environment.webhookUrl;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    // Send to webhook and process response
    return this.http.post<any>(webhookUrl, { message: text }, { headers }).pipe(
      timeout(30000), // 30 second timeout
      retry(1), // Retry once on failure
      map(response => {
        console.log('Webhook response:', response);
        
        // Parse response text from any of the possible fields
        // Check for nested response structures that might contain the answer
        const responseText = 
          // Direct fields
          response.answer || 
          response.message || 
          response.text || 
          response.content ||
          response.output ||  // Added output field based on actual webhook response
          // Common nested structures
          (response.data && (
            response.data.answer || 
            response.data.message || 
            response.data.text || 
            response.data.content ||
            response.data.output
          )) ||
          // Handle array responses (some webhooks return arrays)
          (Array.isArray(response) && response.length > 0 && (
            response[0].answer || 
            response[0].message || 
            response[0].text || 
            response[0].content ||
            response[0].output
          )) ||
          // Handle stringified JSON responses
          (typeof response === 'string' ? response : null);
        
        if (!responseText) {
          console.warn('Webhook response missing expected fields:', response);
        }
        
        // Create assistant message from response
        const assistantMessage: ChatMessage = {
          from: 'assistant',
          text: responseText || 'Sorry, I received an empty response. Please try again.',
          timestamp: new Date()
        };
        
        // Add to messages
        this.addMessage(assistantMessage);
        
        return assistantMessage;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error sending message to webhook:', error);
        
        // Log detailed error information
        if (error.error instanceof ErrorEvent) {
          // Client-side error
          console.error('Client error:', error.error.message);
        } else {
          // Server-side error
          console.error(`Server error: ${error.status}, body:`, error.error);
        }
        
        // Create a fallback message for errors
        const errorMessage: ChatMessage = {
          from: 'assistant',
          text: 'Sorry, I encountered an error processing your request. Please try again later.',
          timestamp: new Date()
        };
        
        // Add error message to chat
        this.addMessage(errorMessage);
        
        // Propagate the error
        return throwError(() => new Error('Failed to get response from AI service. Please try again later.'));
      })
    );
  }
  
  /**
   * Clear all messages in the current chat session
   */
  clearMessages(): void {
    this.messages = [];
    localStorage.removeItem('chatMessages');
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
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      try {
        this.messages = JSON.parse(savedMessages);
      } catch (error) {
        console.error('Error parsing saved messages:', error);
        // If there's an error parsing, start with empty messages
        this.messages = [];
        localStorage.removeItem('chatMessages');
      }
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
