import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      this.messages = JSON.parse(savedMessages);
    }
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
    // First add the user message to the chat
    const userMessage: ChatMessage = {
      from: 'user',
      text: text,
      timestamp: new Date()
    };
    
    this.addMessage(userMessage);
    
    // Then send to the webhook
    return this.http.post<any>(environment.webhookUrl, { question: text }).pipe(
      map(response => {
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
      catchError(error => {
        console.error('Error sending message to webhook:', error);
        
        // Create error message
        const errorMessage: ChatMessage = {
          from: 'assistant',
          text: 'Sorry, there was an error processing your request. Please try again later.',
          timestamp: new Date()
        };
        
        // Add to messages
        this.addMessage(errorMessage);
        
        return of(errorMessage);
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
   * Save messages to localStorage
   */
  private saveMessages(): void {
    localStorage.setItem('chatMessages', JSON.stringify(this.messages));
  }
}
