/* Mock data for testing */
const mockMessages = [
  {
    id: '1',
    from: 'assistant' as 'assistant',
    text: 'Hi, I am BriefingBuddy — your AI Agent for GoA projects. How can I help you today?',
    timestamp: new Date('2025-05-26T10:01:00')
  },
  {
    id: '2',
    from: 'user' as 'user',
    text: 'Tell me about the current projects in the department.',
    timestamp: new Date('2025-05-26T10:02:00')
  },
  {
    id: '3',
    from: 'assistant' as 'assistant',
    text: 'Based on the available information, there are several active projects in the department. The main initiatives include the Digital Transformation Program, the Regulatory Modernization Project, and the Citizen Service Enhancement Initiative. Would you like more details about any specific project?',
    timestamp: new Date('2025-05-26T10:02:30')
  }
];

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
    // Load any saved messages from localStorage or use mock data for demo
    this.loadMessages();
    
    // If no messages are loaded, use mock data for demonstration
    if (this.messages.length === 0) {
      this.messages = [...mockMessages];
      this.saveMessages();
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
    
    // For demo purposes, create a mock response
    const mockResponse = {
      answer: `Thank you for your message: "${text}". This is a simulated response as the webhook is currently unavailable. In a production environment, this would connect to the n8n webhook for real AI responses.`
    };
    
    // Then send to the webhook (or use mock for demo)
    // Comment out the HTTP call and use the mock response instead
    /*
    return this.http.post<any>(environment.webhookUrl, { question: text }).pipe(
      retry(2), // Retry twice if there's a network error
      timeout(30000), // Add 30-second timeout
      map(response => {
        // Check for error in response
        if (response.error) {
          // Handle specific error from n8n webhook
          const errorMsg = typeof response.error === 'string' 
            ? response.error 
            : 'An error occurred while processing your request.';
            
          throw new Error(errorMsg);
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
        if (error instanceof Error && error.name.includes('Timeout')) {
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
    */
    
    // Use mock response for demo
    return of(mockResponse).pipe(
      map(response => {
        // Create assistant message from mock response
        const assistantMessage: ChatMessage = {
          from: 'assistant',
          text: response.answer,
          timestamp: new Date()
        };
        
        // Add to messages
        this.addMessage(assistantMessage);
        
        return assistantMessage;
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
