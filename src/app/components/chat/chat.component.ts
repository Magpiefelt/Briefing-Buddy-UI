import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ChatService, ChatMessage } from '../../services/chat.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush // Reduce re-rendering
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  
  messageForm: FormGroup;
  messages: ChatMessage[] = [];
  userMessages: string[] = ['Tell me about FSOS', 'This didn\'t seem to do anything', 'One two'];
  isTyping: boolean = false;
  currentUser: any;
  errorMessage: string = '';
  
  selectUserMessage(message: string): void {
    this.messageForm.get('message')?.setValue(message);
    this.sendMessage();
  }
  
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef
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
    
    // Clear previous chat messages for a fresh session
    this.chatService.clearMessages();
    this.messages = [];
    
    // Scroll to bottom of chat
    setTimeout(() => this.scrollToBottom(), 100);
  }
  
  ngAfterViewChecked() {
    // Ensure scroll position is maintained after view updates
    this.scrollToBottom();
  }
  
  // Track messages by ID for optimized rendering
  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id || index.toString();
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
    this.errorMessage = '';
    this.cdr.markForCheck(); // Trigger change detection
    
    // Send message to service
    this.chatService.sendMessage(messageText).subscribe({
      next: (response) => {
        // Message is already added to the list by the service
        this.isTyping = false;
        this.messages = this.chatService.getMessages();
        this.cdr.markForCheck(); // Trigger change detection
        this.scrollToBottom();
      },
      error: (error) => {
        this.isTyping = false;
        this.errorMessage = error.message || 'Failed to send message. Please try again.';
        this.cdr.markForCheck(); // Trigger change detection
        setTimeout(() => {
          this.errorMessage = '';
          this.cdr.markForCheck();
        }, 5000);
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
  
  // Navigate to home page
  navigateToHome(): void {
    this.router.navigate(['/get-started']);
  }
  
  exportChat(): void {
    // Using text format by default
    const content = this.chatService.exportChatAsText();
    const filename = `briefing-buddy-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    const type = 'text/plain';
    
    // JSON format could be added as an option in the future
    // Example:
    // if (someConfigOption === 'json') {
    //   content = this.chatService.exportChatAsJson();
    //   filename = `briefing-buddy-chat-${new Date().toISOString().slice(0, 10)}.json`;
    //   type = 'application/json';
    // }
    
    // Create download link
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
  
  shareChat(): void {
    // Implementation for sharing chat
    if (navigator.share) {
      navigator.share({
        title: 'Briefing Buddy Chat',
        text: this.chatService.exportChatAsText().substring(0, 500) + '...',
        url: window.location.href
      }).catch(error => {
        console.error('Error sharing:', error);
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      const textArea = document.createElement('textarea');
      textArea.value = this.chatService.exportChatAsText();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Chat copied to clipboard!');
    }
  }
  
  @HostListener('keydown.tab', ['$event'])
  handleTabKey(event: KeyboardEvent): void {
    // Ensure tab navigation works correctly
    const focusableElements = this.elementRef.nativeElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      if (event.shiftKey && document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }
}
