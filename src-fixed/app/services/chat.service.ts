import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
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
  }

  /**
   * Get all messages in the current chat session
   */
  getMessages(): ChatMessage[] {
    return this.messages;
  }

  /**
   * Add a new message to the chat
   */
  addMessage(message: ChatMessage): void {
    // Add timestamp if not provided
    if (!message.timestamp) {
      message.timestamp = new Date();
    }
    
    // Add unique ID if not provided
    if (!message.id) {
      message.id = Date.now().toString();
    }
    
    this.messages.push(message);
    
    // Save to localStorage
    this.saveMessages();
  }

  /**
   * Send a message to the n8n webhook and get a response
   */
  sendMessage(text: string): Observable<ChatMessage> {
    if (!text || text.trim() === '') {
      return throwError(() => new Error('Message cannot be empty'));
    }

    // First add the user message to the chat
    const userMessage: ChatMessage = {
      from: 'user',
      text: text,
      timestamp: new Date()
    };
    
    this.addMessage(userMessage);
    
    // Then send to the webhook
    return this.http.post<any>(environment.webhookUrl, { question: text }).pipe(
      retry(2), // Retry twice if there's a network error
      timeout(30000), // Add 30-second timeout
      map(response => {
        // Check for error in response
        if (response.error) {
          throw new Error(response.error);
        }
        
        // Create assistant message from response
        const assistantMessage: ChatMessage = {
          from: 'assistant',
          text: response.answer || 'Sorry, I could not process your request.',
          timestamp: new Date()
        };
        
        // Add to messages
        this.addMessage(assistantMessage);
        
        return assistantMessage;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error sending message to webhook:', error);
        
        let errorMessage = 'Sorry, there was an error processing your request.';
        
        // Provide more specific error messages based on the error type
        if (error.name === 'TimeoutError') {
          errorMessage = 'The request timed out. Please try again later.';
        } else if (error.status === 0) {
          errorMessage += ' Please check your internet connection.';
        } else if (error.status === 404) {
          errorMessage += ' The webhook endpoint could not be found.';
        } else if (error.status >= 500) {
          errorMessage += ' The server is currently unavailable. Please try again later.';
        }
        
        // Create error message
        const errorResponse: ChatMessage = {
          from: 'assistant',
          text: errorMessage,
          timestamp: new Date()
        };
        
        // Add to messages
        this.addMessage(errorResponse);
        
        return of(errorResponse);
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
