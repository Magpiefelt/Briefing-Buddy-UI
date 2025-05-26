# Briefing Buddy UI

Briefing Buddy is an AI chatbot tool for the Government of Alberta that centralizes staff data and allows managers to ask questions about projects and initiatives.

## Features

- Get quick answers about Government of Alberta projects and initiatives
- Access centralized staff data and information
- Generate briefing notes and reports based on available data

## Technology Stack

- Frontend: Angular 17.3.12
- UI Components: Alberta Government Design System (@abgov/web-components)
- Authentication: Prepared for Keycloak integration
- Deployment: Netlify (current), Azure Red Hat OpenShift (future)

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/Magpiefelt/Briefing-Buddy-UI.git
cd Briefing-Buddy-UI
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:4200`

## Building for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/ui-components-angular-template/browser` directory.

## Deployment

### Netlify Deployment

This project is configured for deployment on Netlify. The `netlify.toml` file contains the necessary configuration.

Key points for Netlify deployment:
- Build command: `npm install --legacy-peer-deps --force && npm run build`
- Publish directory: `dist/ui-components-angular-template/browser`
- Redirects are configured to support Angular routing

### Azure Red Hat OpenShift (ARO) Deployment

For future deployment to Azure Red Hat OpenShift:

1. Ensure you have the OpenShift CLI (`oc`) installed
2. Log in to your OpenShift cluster
3. Create a new project or use an existing one
4. Use the provided Dockerfile and deployment configurations in the `openshift` directory

## Authentication

The application is prepared for Keycloak integration. For development and demo purposes, a mock authentication service is provided.

Demo credentials:
- Email: any valid email format
- Password: Communication101

## Project Structure

- `src/app/components`: UI components organized by feature
- `src/app/services`: Application services including authentication and chat
- `src/app/guards`: Route guards for protected routes
- `src/app/interceptors`: HTTP interceptors for authentication

## Accessibility

This application follows the Government of Alberta accessibility guidelines and WCAG 2.1 AA standards:

- Semantic HTML structure
- Proper ARIA attributes
- Keyboard navigation support
- Color contrast compliance
- Screen reader compatibility

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

## License

© 2025 Government of Alberta
