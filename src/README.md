# Briefing Buddy
## Overview
Briefing Buddy is an AI-powered application designed for the Government of Alberta that helps staff centralize data, convert it into vectors, and allows managers to ask questions about projects and initiatives. The application features a chat interface where executives can ask questions, with the system identifying knowledge gaps and suggesting briefing note creation based on discussions.
## Tech Stack
- **Frontend**: Angular 17+
- **Backend**: .NET
- **AI Integration**: n8n webhook for LLM interaction
- **Deployment**: Azure Red Hat OpenShift (ARO)
- **Authentication**: Temporary authentication (Keycloak planned for production)
- **Design System**: Alberta Government Design System
## Features
- **Sign-in**: Secure authentication for GoA employees
- **Get Started**: Introduction and onboarding for new users
- **Chat Interface**: AI-powered conversation with BriefingBuddy
- **Export/Share**: Save and share conversation history
- **Responsive Design**: Works on desktop and mobile devices
- **Sidebar Navigation**: Easy access to all application features
## Prerequisites
- Node.js 18+
- npm 9+
- Angular CLI 17+
## Installation
### Clone the repository
```bash
git clone https://github.com/Magpiefelt/Briefing-Buddy-UI.git
cd Briefing-Buddy-UI
```
### Install dependencies
```bash
npm install --legacy-peer-deps
```

### Configure environment
Update the webhook URL in `src/environments/environment.ts` and `src/environments/environment.prod.ts` with your n8n webhook endpoint:

```typescript
export const environment = {
  production: false, // or true for production
  webhookUrl: 'https://your-n8n-webhook-url/webhook/id'
};
```

### Development
### Start development server
```bash
npm run start
```
Navigate to `http://localhost:4200/` to access the application.
### Build for production
```bash
npm run build
```
The build artifacts will be stored in the `dist/` directory..

## Usage

### Authentication
- Use any email address with the password `Communication101` for demo purposes
- In production, this will be replaced with Keycloak authentication

### Chat Interface
- Type questions in the message input field
- BriefingBuddy will respond based on available information
- Use the Export button to save conversation history
- Use the Share button to share conversations with colleagues

## Deployment

### Local Testing
1. Build the application: `ng build`
2. Test the production build locally: `npx http-server dist/ui-components-angular-template`

### Netlify Deployment
1. Build the application: `ng build --configuration production`
2. Deploy the `dist/ui-components-angular-template` folder to Netlify

### Azure Red Hat OpenShift (ARO) Deployment
1. Build the application: `ng build --configuration production`
2. Package the build artifacts for deployment
3. Deploy to ARO using your organization's CI/CD pipeline

## Project Structure
- `src/app/components/` - Main application components
  - `sign-in/` - Authentication component
  - `get-started/` - Onboarding component
  - `chat/` - Main chat interface
- `src/app/services/` - Application services
  - `auth.service.ts` - Authentication service
  - `chat.service.ts` - Chat and webhook integration
- `src/environments/` - Environment configuration
- `src/assets/` - Static assets

## Alberta Design System
This application uses the Alberta Government Design System for consistent branding and user experience. For more information, visit:
- [Alberta Design System](https://design.alberta.ca/components)

## Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request


