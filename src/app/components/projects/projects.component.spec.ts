import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { ProjectsComponent } from './projects.component';
import { ProjectService } from '../../services/project.service';

describe('ProjectsComponent', () => {
  let component: ProjectsComponent;
  let fixture: ComponentFixture<ProjectsComponent>;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ProjectService', ['getMinistryProjects']);

    await TestBed.configureTestingModule({
      declarations: [ProjectsComponent],
      imports: [
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: ProjectService, useValue: spy }
      ]
    }).compileComponents();

    projectServiceSpy = TestBed.inject(ProjectService) as jasmine.SpyObj<ProjectService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectsComponent);
    component = fixture.componentInstance;
    
    // Mock successful response
    projectServiceSpy.getMinistryProjects.and.returnValue(of({
      answer: 'Education: 5 projects\nEnergy: 4 projects\nForestry: 2 projects'
    }));
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load ministry projects on init', () => {
    // Verify service was called
    expect(projectServiceSpy.getMinistryProjects).toHaveBeenCalled();
    
    // Verify loading state was handled correctly
    expect(component.isLoading).toBe(false);
    
    // Verify ministries were parsed correctly
    expect(component.ministries.length).toBe(3);
    expect(component.ministries[0].name).toBe('Education');
    expect(component.ministries[0].initiatives.count).toBe(5);
    expect(component.ministries[1].name).toBe('Energy');
    expect(component.ministries[1].initiatives.count).toBe(4);
    expect(component.ministries[2].name).toBe('Forestry');
    expect(component.ministries[2].initiatives.count).toBe(2);
  });

  it('should handle error when loading projects', () => {
    // Reset component
    component.ministries = [];
    component.isLoading = true;
    component.loadError = false;
    
    // Mock error response
    projectServiceSpy.getMinistryProjects.and.returnValue(throwError(() => new Error('Test error')));
    
    // Call method directly
    component.loadMinistryProjects();
    
    // Verify error handling
    expect(component.isLoading).toBe(false);
    expect(component.loadError).toBe(true);
    
    // Verify fallback data was loaded
    expect(component.ministries.length).toBeGreaterThan(0);
  });

  it('should parse ministry projects correctly', () => {
    const testResponse = 'Ministry A: 10 projects\nMinistry B: 5 projects';
    const result = component.parseMinistryProjects(testResponse);
    
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Ministry A');
    expect(result[0].initiatives.count).toBe(10);
    expect(result[1].name).toBe('Ministry B');
    expect(result[1].initiatives.count).toBe(5);
  });

  it('should handle empty or invalid response', () => {
    const emptyResult = component.parseMinistryProjects('');
    expect(emptyResult.length).toBe(0);
    
    const invalidResult = component.parseMinistryProjects('Invalid format data');
    expect(invalidResult.length).toBe(0);
  });

  it('should calculate percentage spent correctly', () => {
    const ministry = component.ministries[0];
    const expectedPercentage = (parseInt(ministry.initiatives.spentBudget.replace('$', '').replace('M', '')) / 
                               parseInt(ministry.initiatives.totalBudget.replace('$', '').replace('M', ''))) * 100;
    
    expect(ministry.initiatives.percentSpent).toBeCloseTo(expectedPercentage);
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

  // Test for read-only UI (no New Project button)
  it('should not have New Project button in the UI', () => {
    const newProjectButton = fixture.nativeElement.querySelector('button:contains("New Project")');
    expect(newProjectButton).toBeFalsy();
  });

  // Test for info note about read-only nature
  it('should display info note about read-only nature', () => {
    const infoNote = fixture.nativeElement.querySelector('.info-note');
    expect(infoNote).toBeTruthy();
    expect(infoNote.textContent).toContain('read-only view');
  });
});
