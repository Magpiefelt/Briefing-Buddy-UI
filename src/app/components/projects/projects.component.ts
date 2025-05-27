import { Component, OnInit } from '@angular/core';
import { ProjectService, MinistryProject } from '../../services/project.service';
import { finalize } from 'rxjs/operators';

interface Ministry {
  name: string;
  initiatives: {
    count: number;
    totalBudget: string;
    spentBudget: string;
    percentSpent: number;
  }
}

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
  ministries: Ministry[] = [];
  isLoading = true;
  loadError = false;
  
  currentDate: string = new Date().toISOString().split('T')[0];
  fiscalYear: string = '2024-25';

  // Fallback data in case the webhook fails
  private fallbackMinistries: Ministry[] = [
    {
      name: 'Advanced Education',
      initiatives: {
        count: 10,
        totalBudget: '$3,523,203',
        spentBudget: '$1,438,456',
        percentSpent: 40
      }
    },
    {
      name: 'Affordability and Utilities',
      initiatives: {
        count: 2,
        totalBudget: '$2,022,382',
        spentBudget: '$819,025',
        percentSpent: 40
      }
    },
    {
      name: 'Agriculture and Irrigation',
      initiatives: {
        count: 3,
        totalBudget: '$287,853',
        spentBudget: '$159,385',
        percentSpent: 55
      }
    },
    {
      name: 'Arts, Culture and Status of Women',
      initiatives: {
        count: 3,
        totalBudget: '$282,587',
        spentBudget: '$173,275',
        percentSpent: 61
      }
    },
    {
      name: 'Children and Family Services',
      initiatives: {
        count: 3,
        totalBudget: '$6,352,834',
        spentBudget: '$4,825,945',
        percentSpent: 76
      }
    },
    {
      name: 'Communications and Public Engagement',
      initiatives: {
        count: 0,
        totalBudget: '$0',
        spentBudget: '$0',
        percentSpent: 0
      }
    },
    {
      name: 'Education',
      initiatives: {
        count: 6,
        totalBudget: '$2,745,348',
        spentBudget: '$1,721,897',
        percentSpent: 63
      }
    },
    {
      name: 'Energy and Minerals',
      initiatives: {
        count: 6,
        totalBudget: '$2,860,774',
        spentBudget: '$1,087,022',
        percentSpent: 38
      }
    },
    {
      name: 'Environment and Protected Areas',
      initiatives: {
        count: 11,
        totalBudget: '$12,418,407',
        spentBudget: '$5,221,174',
        percentSpent: 42
      }
    },
    {
      name: 'Executive Council',
      initiatives: {
        count: 1,
        totalBudget: '$1,173,835',
        spentBudget: '$1,080,456',
        percentSpent: 92
      }
    },
    {
      name: 'Forestry and Parks',
      initiatives: {
        count: 12,
        totalBudget: '$3,246,942',
        spentBudget: '$2,126,426',
        percentSpent: 65
      }
    },
    {
      name: 'Health',
      initiatives: {
        count: 1,
        totalBudget: '$182,239',
        spentBudget: '$128,035',
        percentSpent: 70
      }
    }
  ];

  constructor(private projectService: ProjectService) { }

  ngOnInit(): void {
    this.loadMinistryProjects();
  }

  /**
   * Load ministry projects from the webhook
   */
  loadMinistryProjects(): void {
    this.isLoading = true;
    this.loadError = false;

    this.projectService.getMinistryProjects()
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (ministryProjects: MinistryProject[]) => {
          // Map the ministry projects to the ministry array format
          this.updateMinistriesWithProjectCounts(ministryProjects);
        },
        error: (error) => {
          console.error('Error loading ministry projects:', error);
          this.loadError = true;
          this.ministries = this.fallbackMinistries;
        }
      });
  }

  /**
   * Update ministries array with project counts from the webhook
   */
  private updateMinistriesWithProjectCounts(ministryProjects: MinistryProject[]): void {
    // Start with the fallback data to ensure we have budget information
    const updatedMinistries = [...this.fallbackMinistries];
    
    // Update counts based on the webhook response
    ministryProjects.forEach(project => {
      // Find the matching ministry in our fallback data
      const ministryIndex = updatedMinistries.findIndex(
        m => m.name.toLowerCase() === project.ministry.toLowerCase()
      );
      
      if (ministryIndex !== -1) {
        // Update the count for existing ministries
        updatedMinistries[ministryIndex].initiatives.count = project.count;
      } else {
        // Add new ministries that weren't in our fallback data
        updatedMinistries.push({
          name: project.ministry,
          initiatives: {
            count: project.count,
            totalBudget: 'N/A',
            spentBudget: 'N/A',
            percentSpent: 0
          }
        });
      }
    });
    
    this.ministries = updatedMinistries;
  }
}
