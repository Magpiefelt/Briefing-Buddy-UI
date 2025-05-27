import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { ProjectsComponent } from './projects.component';
import { ProjectService, MinistryProject } from '../../services/project.service';

describe('ProjectsComponent', () => {
  let component: ProjectsComponent;
  let fixture: ComponentFixture<ProjectsComponent>;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;

  beforeEach(async () => {
    projectServiceSpy = jasmine.createSpyObj('ProjectService', ['getMinistryProjects']);
    
    await TestBed.configureTestingModule({
      declarations: [ProjectsComponent],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        FormsModule
      ],
      providers: [
        { provide: ProjectService, useValue: projectServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default ministries', () => {
    // Mock the getMinistryProjects method to return sample data
    const mockProjects: MinistryProject[] = [
      { ministry: 'Education', count: 5 },
      { ministry: 'Energy', count: 4 },
      { ministry: 'Forestry', count: 2 }
    ];
    
    projectServiceSpy.getMinistryProjects.and.returnValue(of(mockProjects));
    
    fixture.detectChanges();
    
    expect(component.ministries.length).toBeGreaterThan(0);
  });

  it('should fetch ministry project counts on initialization', () => {
    const mockProjects: MinistryProject[] = [
      { ministry: 'Health', count: 15 },
      { ministry: 'Education', count: 10 },
      { ministry: 'Transportation', count: 5 }
    ];
    
    projectServiceSpy.getMinistryProjects.and.returnValue(of(mockProjects));
    
    fixture.detectChanges();
    
    expect(projectServiceSpy.getMinistryProjects).toHaveBeenCalled();
  });

  it('should update ministry project counts from webhook response', () => {
    const mockProjects: MinistryProject[] = [
      { ministry: 'Health', count: 15 },
      { ministry: 'Education', count: 10 },
      { ministry: 'Transportation', count: 5 }
    ];
    
    projectServiceSpy.getMinistryProjects.and.returnValue(of(mockProjects));
    
    fixture.detectChanges();
    
    // Find the ministries in the component's array
    const health = component.ministries.find(m => m.name === 'Health');
    const education = component.ministries.find(m => m.name === 'Education');
    const transportation = component.ministries.find(m => m.name === 'Transportation');
    
    expect(health?.initiatives.count).toBe(15);
    expect(education?.initiatives.count).toBe(10);
    expect(transportation?.initiatives.count).toBe(5);
  });

  it('should handle webhook errors and use fallback data', () => {
    projectServiceSpy.getMinistryProjects.and.returnValue(throwError(() => new Error('Network error')));
    
    spyOn(console, 'error');
    
    fixture.detectChanges();
    
    expect(console.error).toHaveBeenCalled();
    expect(component.ministries.length).toBeGreaterThan(0);
    // Verify that ministries still have default project counts
    expect(component.ministries[0].initiatives.count).toBeGreaterThanOrEqual(0);
  });

  it('should apply sorting correctly', () => {
    const mockProjects: MinistryProject[] = [
      { ministry: 'Health', count: 15 },
      { ministry: 'Education', count: 10 },
      { ministry: 'Transportation', count: 5 }
    ];
    
    projectServiceSpy.getMinistryProjects.and.returnValue(of(mockProjects));
    
    fixture.detectChanges();
    
    // Test alphabetical sorting
    component.onSortChange('alphabetical');
    expect(component.ministries[0].name.localeCompare(component.ministries[1].name)).toBeLessThanOrEqual(0);
    
    // Test count sorting
    component.onSortChange('count');
    expect(component.ministries[0].initiatives.count).toBeGreaterThanOrEqual(component.ministries[1].initiatives.count);
  });

  it('should apply filtering correctly', () => {
    const mockProjects: MinistryProject[] = [
      { ministry: 'Health', count: 15 },
      { ministry: 'Education', count: 10 },
      { ministry: 'Transportation', count: 5 },
      { ministry: 'Agriculture', count: 3 }
    ];
    
    projectServiceSpy.getMinistryProjects.and.returnValue(of(mockProjects));
    
    fixture.detectChanges();
    
    // Test 5+ filter
    component.onFilterChange('5+');
    expect(component.ministries.every(m => m.initiatives.count >= 5)).toBeTrue();
    
    // Test 10+ filter
    component.onFilterChange('10+');
    expect(component.ministries.every(m => m.initiatives.count >= 10)).toBeTrue();
    
    // Test all filter
    component.onFilterChange('all');
    expect(component.ministries.length).toBeGreaterThan(3);
  });

  it('should have navigation links', () => {
    projectServiceSpy.getMinistryProjects.and.returnValue(of([]));
    fixture.detectChanges();
    
    const navItems = fixture.nativeElement.querySelectorAll('.nav-item');
    expect(navItems.length).toBeGreaterThan(0);
    
    navItems.forEach((item: Element) => {
      expect(item.getAttribute('routerLink')).toBeTruthy();
    });
  });
});
