import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
  ministries = [
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

  currentDate: string = new Date().toISOString().split('T')[0];
  fiscalYear: string = '2024-25';

  constructor() { }

  ngOnInit(): void {
  }
}
