import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { ChatComponent } from './chat.component';
import { ChatService } from '../../services/chat.service';
import { AuthService, User } from '../../services/auth.service';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;
  let chatServiceSpy: jasmine.SpyObj<ChatService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    chatServiceSpy = jasmine.createSpyObj('ChatService', ['sendMessage', 'getMessages', 'clearMessages', 'exportChatAsText']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'getCurrentUser', 'logout']);
    
    await TestBed.configureTestingModule({
      declarations: [ChatComponent],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        FormsModule,
        ReactiveFormsModule
      ],
      providers: [
        { provide: ChatService, useValue: chatServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
    
    // Mock auth service methods with proper User type
    authServiceSpy.isLoggedIn.and.returnValue(true);
    const mockUser: User = {
      id: 'test-user-id',
      email: 'test@gov.ab.ca',
      name: 'Test User',
      role: 'user'
    };
    authServiceSpy.getCurrentUser.and.returnValue(mockUser);
    
    // Mock chat service methods
    chatServiceSpy.getMessages.and.returnValue([]);
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty messages array', () => {
    expect(component.messages).toEqual([]);
  });

  it('should send message when form is valid', () => {
    const testMessage = 'Test message';
    component.messageForm.get('message')?.setValue(testMessage);
    chatServiceSpy.sendMessage.and.returnValue(of({ id: '1', from: 'assistant', text: 'Response' }));
    
    component.sendMessage();
    
    expect(chatServiceSpy.sendMessage).toHaveBeenCalledWith(testMessage);
  });

  it('should not send message when form is invalid', () => {
    component.messageForm.get('message')?.setValue('');
    
    component.sendMessage();
    
    expect(chatServiceSpy.sendMessage).not.toHaveBeenCalled();
  });

  it('should handle errors when sending a message', () => {
    const testMessage = 'Test message';
    component.messageForm.get('message')?.setValue(testMessage);
    chatServiceSpy.sendMessage.and.returnValue(throwError(() => new Error('Test error')));
    
    spyOn(console, 'error');
    
    component.sendMessage();
    
    expect(console.error).toHaveBeenCalled();
    expect(component.errorMessage).toBeTruthy();
  });

  it('should clear conversation', () => {
    component.clearConversation();
    
    expect(chatServiceSpy.clearMessages).toHaveBeenCalled();
    expect(chatServiceSpy.getMessages).toHaveBeenCalled();
  });

  it('should copy conversation to clipboard', () => {
    const mockText = 'Conversation text';
    chatServiceSpy.exportChatAsText.and.returnValue(mockText);
    
    // Mock clipboard API
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    
    component.copyConversation();
    
    expect(chatServiceSpy.exportChatAsText).toHaveBeenCalled();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockText);
  });

  it('should export chat', () => {
    const mockText = 'Conversation text';
    chatServiceSpy.exportChatAsText.and.returnValue(mockText);
    
    // Mock document methods
    const mockBlob = new Blob([mockText], { type: 'text/plain' });
    const mockUrl = 'blob:test';
    spyOn(window.URL, 'createObjectURL').and.returnValue(mockUrl);
    spyOn(window.URL, 'revokeObjectURL');
    
    const mockAnchor = document.createElement('a');
    spyOn(document, 'createElement').and.returnValue(mockAnchor);
    spyOn(document.body, 'appendChild');
    spyOn(document.body, 'removeChild');
    spyOn(mockAnchor, 'click');
    
    component.exportChat();
    
    expect(chatServiceSpy.exportChatAsText).toHaveBeenCalled();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(mockAnchor.download).toContain('briefing-buddy-chat');
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it('should have navigation links', () => {
    const navItems = fixture.nativeElement.querySelectorAll('.nav-item');
    expect(navItems.length).toBeGreaterThan(0);
    
    navItems.forEach((item: Element) => {
      expect(item.getAttribute('routerLink')).toBeTruthy();
    });
  });
});
