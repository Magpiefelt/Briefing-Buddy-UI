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
  
  currentDate: string = new Date().toLocaleDateString('en-CA');
  fiscalYear: string = '2024-25';
  lastUpdated: string = '';
  
  // Sorting and filtering options
  sortOptions = [
    { value: 'alphabetical', label: 'Alphabetical' },
    { value: 'count', label: 'By Count' }
  ];
  selectedSort = 'alphabetical';
  
  filterOptions = [
    { value: 'all', label: 'All Projects' },
    { value: '5+', label: '5+ Projects' },
    { value: '10+', label: '10+ Projects' }
  ];
  selectedFilter = 'all';

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
    
    // Check localStorage for cached data
    this.loadCachedData();
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
          this.lastUpdated = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        })
      )
      .subscribe({
        next: (ministryProjects: MinistryProject[]) => {
          // Map the ministry projects to the ministry array format
          this.updateMinistriesWithProjectCounts(ministryProjects);
          
          // Cache the data in localStorage
          this.cacheData(ministryProjects);
          
          // Apply current sort and filter
          this.applySort();
          this.applyFilter();
        },
        error: (error) => {
          console.error('Error loading ministry projects:', error);
          this.loadError = true;
          this.ministries = this.fallbackMinistries;
          
          // Apply current sort and filter
          this.applySort();
          this.applyFilter();
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
  
  /**
   * Refresh data by calling the webhook again
   */
  refreshData(): void {
    this.loadMinistryProjects();
  }
  
  /**
   * Cache ministry project data in localStorage
   */
  private cacheData(ministryProjects: MinistryProject[]): void {
    try {
      const cacheData = {
        timestamp: new Date().toISOString(),
        data: ministryProjects
      };
      localStorage.setItem('briefingBuddy_ministryProjects', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache ministry projects in localStorage:', error);
    }
  }
  
  /**
   * Load cached data from localStorage if available
   */
  private loadCachedData(): void {
    try {
      const cachedData = localStorage.getItem('briefingBuddy_ministryProjects');
      if (cachedData) {
        const { timestamp, data } = JSON.parse(cachedData);
        
        // Check if cache is less than 1 hour old
        const cacheTime = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - cacheTime.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        if (diffHours < 1) {
          console.log('Using cached ministry projects data');
          this.updateMinistriesWithProjectCounts(data);
          this.lastUpdated = new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          this.isLoading = false;
          
          // Apply current sort and filter
          this.applySort();
          this.applyFilter();
        }
      }
    } catch (error) {
      console.warn('Failed to load cached ministry projects from localStorage:', error);
    }
  }
  
  /**
   * Export ministry data as CSV
   */
  exportCsv(): void {
    // Create CSV content
    let csvContent = 'Ministry,Project Count,Total Budget,Spent Budget,Percent Spent\n';
    
    this.ministries.forEach(ministry => {
      csvContent += `"${ministry.name}",${ministry.initiatives.count},${ministry.initiatives.totalBudget},${ministry.initiatives.spentBudget},${ministry.initiatives.percentSpent}%\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ministry-projects-${this.currentDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  /**
   * Handle sort change
   */
  onSortChange(sortValue: string): void {
    this.selectedSort = sortValue;
    this.applySort();
  }
  
  /**
   * Apply current sort to ministries array
   */
  private applySort(): void {
    if (this.selectedSort === 'alphabetical') {
      this.ministries.sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.selectedSort === 'count') {
      this.ministries.sort((a, b) => b.initiatives.count - a.initiatives.count);
    }
  }
  
  /**
   * Handle filter change
   */
  onFilterChange(filterValue: string): void {
    this.selectedFilter = filterValue;
    this.applyFilter();
  }
  
  /**
   * Apply current filter to ministries array
   */
  private applyFilter(): void {
    // Create a copy of all ministries
    const allMinistries = [...this.ministries];
    
    // Apply filter
    if (this.selectedFilter === '5+') {
      this.ministries = allMinistries.filter(m => m.initiatives.count >= 5);
    } else if (this.selectedFilter === '10+') {
      this.ministries = allMinistries.filter(m => m.initiatives.count >= 10);
    } else {
      // 'all' filter - no filtering needed
      this.ministries = allMinistries;
    }
  }
}
