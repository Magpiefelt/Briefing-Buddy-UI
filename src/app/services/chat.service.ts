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
    // Clear chat history on each session start
    this.clearMessages();
    
    // Add a welcome message
    const welcomeMessage: ChatMessage = {
      id: '1',
      from: 'assistant',
      text: 'Hi, I am BriefingBuddy — your AI Agent for GoA projects. How can I help you today?',
      timestamp: new Date()
    };
    this.addMessage(welcomeMessage);
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
   * Send a message to the n8  /**
   * Send a message to the webhook
   * @param text Message text to send
   * @returns Observable of the assistant's response message
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
    
    // Use the webhook URL from environment
    const webhookUrl = environment.webhookUrl;
    
    // Log the request for debugging
    console.log('Sending request to webhook:', webhookUrl, { message: text });
    
    // Define headers to ensure proper content type
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    // Send the message to the webhook with proper headers
    return this.http.post<any>(webhookUrl, { message: text }, { headers }).pipe(
      timeout(30000), // 30 second timeout
      retry(1), // Retry once on failure
      map(response => {
        // Log the full response for debugging
        console.log('Received webhook response:', response);
        
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
