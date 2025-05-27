// cypress/e2e/projects.cy.ts
describe('Projects Dashboard', () => {
  beforeEach(() => {
    // Intercept API calls to the webhook
    cy.intercept('POST', '**/webhook/**', {
      statusCode: 200,
      body: {
        response: 'Ministry of Health: 15 projects\nMinistry of Education: 10 projects\nMinistry of Transportation: 5 projects'
      }
    }).as('getProjects');
    
    // Visit the projects page
    cy.visit('/projects');
  });

  it('should display the projects dashboard', () => {
    cy.get('h1').should('contain', 'Projects');
    cy.wait('@getProjects');
  });

  it('should display ministry tiles with project counts', () => {
    cy.wait('@getProjects');
    cy.get('.ministry-tile').should('have.length.greaterThan', 0);
    
    // Check specific ministries from our mock data
    cy.contains('.ministry-tile', 'Ministry of Health')
      .should('contain', '15 projects');
    
    cy.contains('.ministry-tile', 'Ministry of Education')
      .should('contain', '10 projects');
  });

  it('should navigate to chat when clicking on a ministry', () => {
    cy.wait('@getProjects');
    
    // Find the first ministry tile and click it
    cy.get('.ministry-tile').first().click();
    
    // Should navigate to the chat page
    cy.url().should('include', '/chat/');
  });

  it('should handle API errors gracefully', () => {
    // Override the intercept to simulate an error
    cy.intercept('POST', '**/webhook/**', {
      statusCode: 500,
      body: 'Server error'
    }).as('getProjectsError');
    
    // Reload the page to trigger the new intercept
    cy.reload();
    
    // Should still display ministry tiles with fallback data
    cy.get('.ministry-tile').should('have.length.greaterThan', 0);
  });
});
