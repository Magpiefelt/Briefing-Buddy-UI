import { Component, OnInit, AfterViewChecked, ViewChild, ElementRef, ChangeDetectorRef, HostListener, Renderer2 } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef; // Added definite assignment assertion
  
  messageForm!: FormGroup; // Added definite assignment assertion
  messages: ChatMessage[] = [];
  isTyping = false;
  errorMessage = '';
  currentUser: any;
  maxMessageLength = 250; // Reduced to match backend constraint
  remainingChars = this.maxMessageLength;
  showToast = false;
  toastMessage = '';
  sidebarOpen = false; // For mobile sidebar toggle
  
  // Sample user messages for quick selection (optional feature)
  userMessages: string[] = [
    'What projects are currently active?',
    'Tell me about the Digital Transformation Program',
    'What are the key milestones for this quarter?'
  ];
  
  constructor(
    private chatService: ChatService,
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {
    // Initialize form in constructor to ensure it's available before template renders
    this.initializeForm();
  }
  
  // Separate method for form initialization to improve clarity
  private initializeForm(): void {
    this.messageForm = this.formBuilder.group({
      message: ['', [Validators.required, Validators.maxLength(this.maxMessageLength)]]
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
    
    // Get existing messages
    this.messages = this.chatService.getMessages();
    
    // Scroll to bottom of chat
    setTimeout(() => this.scrollToBottom(), 100);
    
    // Set up character counter with null check
    const messageControl = this.messageForm.get('message');
    if (messageControl) {
      messageControl.valueChanges.subscribe(value => {
        this.remainingChars = this.maxMessageLength - (value ? value.length : 0);
      });
    }
    
    // Add event listener for escape key to close sidebar on mobile
    this.renderer.listen('window', 'keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.sidebarOpen) {
        this.toggleSidebar();
      }
    });
  }
  
  ngAfterViewChecked() {
    // Ensure scroll position is maintained after view updates
    this.scrollToBottom();
  }
  
  // Toggle sidebar for mobile view
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    const sidebar = this.elementRef.nativeElement.querySelector('.sidebar');
    if (sidebar) {
      if (this.sidebarOpen) {
        this.renderer.addClass(sidebar, 'open');
      } else {
        this.renderer.removeClass(sidebar, 'open');
      }
    }
  }
  
  // Track messages by ID for optimized rendering
  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id || index.toString();
  }
  
  // Quick select a predefined user message
  selectUserMessage(message: string): void {
    const messageControl = this.messageForm.get('message');
    if (messageControl) {
      messageControl.setValue(message);
    }
  }
  
  // Check if message is from the same sender as previous message
  isSameSenderAsPrevious(index: number): boolean {
    if (index === 0) return false;
    return this.messages[index].from === this.messages[index - 1].from;
  }
  
  // Clear conversation
  clearConversation(): void {
    this.chatService.clearMessages();
    this.messages = this.chatService.getMessages(); // This will include the welcome message
    this.displayToast('Conversation cleared');
  }
  
  // Copy conversation to clipboard
  copyConversation(): void {
    const content = this.chatService.exportChatAsText();
    navigator.clipboard.writeText(content)
      .then(() => {
        this.displayToast('Conversation copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy conversation:', err);
        this.displayToast('Failed to copy conversation');
      });
  }
  
  // Show toast notification
  displayToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
      this.cdr.markForCheck();
    }, 3000);
  }
  
  sendMessage(): void {
    if (this.messageForm.invalid || this.isTyping) {
      return;
    }
    
    const messageControl = this.messageForm.get('message');
    if (!messageControl) {
      console.error('Message form control is not available');
      return;
    }
    
    const messageText = messageControl.value;
    if (!messageText || messageText.trim() === '') {
      return;
    }
    
    // Check message length to prevent backend errors
    if (messageText.length > this.maxMessageLength) {
      this.errorMessage = `Message exceeds maximum length of ${this.maxMessageLength} characters.`;
      setTimeout(() => {
        this.errorMessage = '';
        this.cdr.markForCheck();
      }, 5000);
      return;
    }
    
    // Clear the input
    messageControl.setValue('');
    
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
  
  // Navigate to projects page
  navigateToProjects(): void {
    this.router.navigate(['/projects']);
  }
  
  exportChat(): void {
    // Using text format by default
    const content = this.chatService.exportChatAsText();
    const filename = `briefing-buddy-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    const type = 'text/plain';
    
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
    
    this.displayToast('Chat exported successfully');
  }
  
  shareChat(): void {
    // Implementation for sharing chat
    if (navigator.share) {
      navigator.share({
        title: 'Briefing Buddy Chat',
        text: this.chatService.exportChatAsText().substring(0, 500) + '...',
        url: window.location.href
      }).then(() => {
        this.displayToast('Chat shared successfully');
      }).catch(error => {
        console.error('Error sharing:', error);
        this.displayToast('Failed to share chat');
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      const textArea = document.createElement('textarea');
      textArea.value = this.chatService.exportChatAsText();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.displayToast('Chat copied to clipboard!');
    }
  }
  
  // Copy individual message
  copyMessage(message: ChatMessage): void {
    navigator.clipboard.writeText(message.text)
      .then(() => {
        this.displayToast('Message copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy message:', err);
        this.displayToast('Failed to copy message');
      });
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
