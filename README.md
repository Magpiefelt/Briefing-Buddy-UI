# Briefing Buddy UI

Briefing Buddy is an AI-powered tool for the Government of Alberta that centralizes staff data and allows managers to ask questions about projects and initiatives. The UI is built with Angular and follows the Government of Alberta design system.

## Features

- **Chat Interface**: Ask questions about GoA projects and initiatives
- **Projects Dashboard**: View real-time project counts by ministry
- **Authentication**: Secure login for GoA employees
- **Alberta Design System**: UI components following official GoA design guidelines

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Angular CLI (v17 or higher)

### Installation

1. Clone the repository
```bash
git clone https://github.com/Magpiefelt/Briefing-Buddy-UI.git
cd Briefing-Buddy-UI
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Navigate to `http://localhost:4200/` in your browser

## Architecture

The application consists of several key components:

- **Angular Frontend**: UI screens and components
- **n8n Webhook Integration**: Connects to LLM for AI interactions
- **.NET Backend**: Handles authentication and data management
- **Keycloak**: Long-term security solution (planned)

## AI-Powered Project Summary

The `/projects` page dynamically queries a backend AI model via the following endpoint:
```
https://govab.app.n8n.cloud/webhook/10e3909d-3a60-41b5-9b2f-a6c3bc149d9d
```

On page load, the app sends the prompt:
```
"Display the number of projects for each ministry"
```
and displays the response as live project counts per Alberta ministry.

## Removed Features

Project creation features were removed to reflect the correct role of the bot (summarization only, not CRUD). The Briefing Buddy application is strictly a read-only summarization tool for Government of Alberta initiatives and does not support user-generated projects or content editing.

## Dev Notes

- The `ProjectsComponent` now fetches real-time data from the AI model
- The service used for this is `project.service.ts` which handles API communication and response parsing
- Fallback logic is implemented to handle API failures gracefully
- The UI has been updated to remove any elements that imply write capabilities

## Deployment

The application is designed for deployment to Azure Red Hat OpenShift (ARO) in production.

For development and testing:
1. Build the application:
```bash
npm run build
```

2. The build artifacts will be stored in the `dist/` directory

## Contributing

Please follow the Government of Alberta design system guidelines when making UI changes:
- [Alberta Design System](https://design.alberta.ca/design-tokens)

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.
