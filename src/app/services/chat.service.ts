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
    
    // Use the webhook URL
    const webhookUrl = 'https://govab.app.n8n.cloud/webhook/10e3909d-3a60-41b5-9b2f-a6c3bc149d9d';
    
    // For now, use mock response for demo until webhook is fully tested
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
