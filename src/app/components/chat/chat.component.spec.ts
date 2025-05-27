import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { ChatComponent } from './chat.component';
import { ChatService } from '../../services/chat.service';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;
  let chatServiceSpy: jasmine.SpyObj<ChatService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ChatService', ['sendMessage']);

    await TestBed.configureTestingModule({
      declarations: [ChatComponent],
      imports: [
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        FormBuilder,
        { provide: ChatService, useValue: spy }
      ]
    }).compileComponents();

    chatServiceSpy = TestBed.inject(ChatService) as jasmine.SpyObj<ChatService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with a welcome message when no messages exist', () => {
    // Ensure messages array is empty first
    component.messages = [];
    
    // Call ngOnInit to trigger welcome message
    component.ngOnInit();
    
    // Check that a single welcome message was added
    expect(component.messages.length).toBe(1);
    expect(component.messages[0].from).toBe('assistant');
    expect(component.messages[0].text).toContain('Welcome to BriefingBuddy');
  });

  it('should not add welcome message if messages already exist', () => {
    // Setup existing messages
    component.messages = [
      { id: '1', from: 'user', text: 'Hello', timestamp: new Date() },
      { id: '2', from: 'assistant', text: 'Hi there', timestamp: new Date() }
    ];
    
    // Store the initial count
    const initialCount = component.messages.length;
    
    // Call ngOnInit
    component.ngOnInit();
    
    // Verify no additional messages were added
    expect(component.messages.length).toBe(initialCount);
  });

  it('should send message and handle successful response', () => {
    // Setup
    const testMessage = 'Test message';
    component.messageForm.controls['message'].setValue(testMessage);
    
    // Mock successful response
    chatServiceSpy.sendMessage.and.returnValue(of({
      answer: 'Response from assistant'
    }));
    
    // Execute
    component.sendMessage();
    
    // Verify
    expect(chatServiceSpy.sendMessage).toHaveBeenCalledWith(testMessage);
    expect(component.messages.length).toBe(2); // Welcome message + user message
    expect(component.messages[1].from).toBe('user');
    expect(component.messages[1].text).toBe(testMessage);
    
    // Verify assistant message was added after response
    expect(component.messages.length).toBe(3);
    expect(component.messages[2].from).toBe('assistant');
    expect(component.messages[2].text).toBe('Response from assistant');
    
    // Verify form was reset
    expect(component.messageForm.controls['message'].value).toBe('');
    
    // Verify loading state was handled correctly
    expect(component.isTyping).toBe(false);
  });

  it('should handle error when sending message', () => {
    // Setup
    const testMessage = 'Test message';
    component.messageForm.controls['message'].setValue(testMessage);
    
    // Mock error response
    chatServiceSpy.sendMessage.and.returnValue(throwError(() => new Error('Test error')));
    
    // Execute
    component.sendMessage();
    
    // Verify
    expect(chatServiceSpy.sendMessage).toHaveBeenCalledWith(testMessage);
    expect(component.errorMessage).toBeTruthy();
    expect(component.isTyping).toBe(false);
  });

  it('should select user message when clicked', () => {
    // Setup
    const testMessage = 'Test suggested message';
    component.userMessages = [testMessage];
    
    // Execute
    component.selectUserMessage(testMessage);
    
    // Verify message form was updated
    expect(component.messageForm.controls['message'].value).toBe(testMessage);
  });

  it('should track messages by id', () => {
    // Setup
    const message = { id: 'test-id', from: 'user', text: 'Hello', timestamp: new Date() };
    
    // Execute & Verify
    expect(component.trackByMessageId(0, message)).toBe('test-id');
  });

  it('should scroll to bottom when messages change', () => {
    // Setup
    spyOn(component, 'scrollToBottom');
    component.messages = [...component.messages, { 
      id: 'new-message', 
      from: 'user', 
      text: 'New message', 
      timestamp: new Date() 
    }];
    
    // Execute
    fixture.detectChanges();
    
    // Verify
    expect(component.scrollToBottom).toHaveBeenCalled();
  });

  // Test for routerLinkActive functionality
  it('should have proper routerLinkActive directive on navigation items', () => {
    const navItems = fixture.nativeElement.querySelectorAll('.nav-item');
    
    // Verify that all nav items have routerLinkActive attribute
    navItems.forEach(item => {
      expect(item.getAttribute('routerLinkActive')).toBe('active');
    });
  });

  // Test for responsive design
  it('should have responsive design media queries in the component styles', () => {
    // This is a basic check that would need to be expanded with actual DOM testing
    // in a real E2E test environment
    const componentStyles = (component as any).__proto__.constructor.ɵcmp.styles[0];
    
    expect(componentStyles).toContain('@media (max-width: 768px)');
    expect(componentStyles).toContain('@media (min-width: 769px) and (max-width: 1024px)');
    expect(componentStyles).toContain('@media (min-width: 1025px)');
  });
});
