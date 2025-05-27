// cypress/e2e/chat.cy.ts
describe('Chat Component', () => {
  beforeEach(() => {
    // Intercept API calls to the webhook
    cy.intercept('POST', '**/webhook/**', {
      statusCode: 200,
      body: {
        response: 'This is a test response from the AI assistant.'
      }
    }).as('sendMessage');
    
    // Visit the chat page with a ministry ID
    cy.visit('/chat/ministry-1');
  });

  it('should display the chat interface', () => {
    cy.get('.chat-container').should('be.visible');
    cy.get('.message-input').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('should send a message and display the response', () => {
    // Type a message
    const testMessage = 'Hello, this is a test message';
    cy.get('.message-input').type(testMessage);
    
    // Send the message
    cy.get('button[type="submit"]').click();
    
    // Wait for the API call
    cy.wait('@sendMessage');
    
    // Check that the user message is displayed
    cy.get('.message.user').should('contain', testMessage);
    
    // Check that the AI response is displayed
    cy.get('.message.ai').should('contain', 'This is a test response from the AI assistant.');
  });

  it('should not send empty messages', () => {
    // Try to send an empty message
    cy.get('button[type="submit"]').click();
    
    // No API call should be made
    cy.get('@sendMessage.all').should('have.length', 0);
  });

  it('should handle API errors gracefully', () => {
    // Override the intercept to simulate an error
    cy.intercept('POST', '**/webhook/**', {
      statusCode: 500,
      body: 'Server error'
    }).as('sendMessageError');
    
    // Type and send a message
    cy.get('.message-input').type('This will cause an error');
    cy.get('button[type="submit"]').click();
    
    // Wait for the API call
    cy.wait('@sendMessageError');
    
    // Should display an error message
    cy.get('.message.ai').should('contain', 'Error');
  });

  it('should show loading state while waiting for response', () => {
    // Delay the response to test loading state
    cy.intercept('POST', '**/webhook/**', {
      statusCode: 200,
      body: {
        response: 'Delayed response'
      },
      delay: 1000
    }).as('delayedResponse');
    
    // Type and send a message
    cy.get('.message-input').type('This will have a delayed response');
    cy.get('button[type="submit"]').click();
    
    // Loading indicator should be visible
    cy.get('.loading-indicator').should('be.visible');
    
    // Wait for the API call to complete
    cy.wait('@delayedResponse');
    
    // Loading indicator should disappear
    cy.get('.loading-indicator').should('not.exist');
  });

  it('should allow navigation back to projects', () => {
    // Check for a back button or navigation link
    cy.get('a[href="/projects"]').click();
    
    // Should navigate to the projects page
    cy.url().should('include', '/projects');
  });
});
