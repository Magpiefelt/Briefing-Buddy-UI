// cypress/e2e/navigation.cy.ts
describe('Application Navigation', () => {
  beforeEach(() => {
    // Start at the root URL
    cy.visit('/');
  });

  it('should redirect to projects page from root URL', () => {
    cy.url().should('include', '/projects');
  });

  it('should have working navigation links in header', () => {
    // Check that header navigation exists
    cy.get('header nav').should('exist');
    
    // Check for projects link
    cy.get('header nav a[href="/projects"]').should('exist');
    
    // Navigate to projects page
    cy.get('header nav a[href="/projects"]').click();
    cy.url().should('include', '/projects');
  });

  it('should navigate from projects to chat and back', () => {
    // Intercept API calls to the webhook
    cy.intercept('POST', '**/webhook/**', {
      statusCode: 200,
      body: {
        response: 'Ministry of Health: 15 projects\nMinistry of Education: 10 projects'
      }
    }).as('getProjects');
    
    // Wait for projects to load
    cy.wait('@getProjects');
    
    // Click on a ministry tile
    cy.get('.ministry-tile').first().click();
    
    // Should navigate to chat page
    cy.url().should('include', '/chat/');
    
    // Navigate back to projects
    cy.get('a[href="/projects"]').click();
    
    // Should be back on projects page
    cy.url().should('include', '/projects');
  });

  it('should handle sign-in flow correctly', () => {
    // Assuming there's a sign-in link or button
    cy.get('a[href="/login"]').click();
    
    // Should navigate to login page
    cy.url().should('include', '/login');
    
    // Fill in login form
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Should redirect to projects page after login
    cy.url().should('include', '/projects');
  });

  it('should have a consistent header across pages', () => {
    // Check header on projects page
    cy.get('header').should('be.visible');
    cy.get('header img.logo').should('be.visible');
    
    // Navigate to chat page
    cy.intercept('POST', '**/webhook/**', {
      statusCode: 200,
      body: {
        response: 'Ministry of Health: 15 projects'
      }
    }).as('getProjects');
    
    cy.wait('@getProjects');
    cy.get('.ministry-tile').first().click();
    
    // Check header on chat page
    cy.get('header').should('be.visible');
    cy.get('header img.logo').should('be.visible');
  });
});
