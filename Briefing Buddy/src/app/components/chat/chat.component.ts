import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ChatService, ChatMessage } from '../../services/chat.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  
  messageForm: FormGroup;
  messages: ChatMessage[] = [];
  isTyping: boolean = false;
  currentUser: any;
  errorMessage: string = '';
  
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private chatService: ChatService
  ) {
    this.messageForm = this.formBuilder.group({
      message: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/sign-in']);
      return;
    }
    
    // Get current user
    this.currentUser = this.authService.getCurrentUser();
    
    // Load existing messages
    this.messages = this.chatService.getMessages();
    
    // Scroll to bottom of chat
    setTimeout(() => this.scrollToBottom(), 100);
  }
  
  sendMessage(): void {
    if (this.messageForm.invalid || this.isTyping) {
      return;
    }
    
    const messageText = this.messageForm.get('message')?.value;
    
    // Clear the input
    this.messageForm.get('message')?.setValue('');
    
    // Show typing indicator
    this.isTyping = true;
    
    // Send message to service
    this.chatService.sendMessage(messageText).subscribe({
      next: (response) => {
        // Message is already added to the list by the service
        this.isTyping = false;
        this.scrollToBottom();
      },
      error: (error) => {
        this.isTyping = false;
        this.errorMessage = 'Failed to send message. Please try again.';
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
    
    // Scroll to bottom
    this.scrollToBottom();
  }
  
  scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
  
  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/sign-in']);
    });
  }
  
  exportChat(): void {
    // Implementation for exporting chat
    alert('Export functionality will be implemented in a future update.');
  }
  
  shareChat(): void {
    // Implementation for sharing chat
    alert('Share functionality will be implemented in a future update.');
  }
}
