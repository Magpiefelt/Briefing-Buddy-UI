# Environment Configuration Management

This document outlines the environment configuration setup for the Briefing Buddy UI application.

## Environment Files

The application uses the following environment configuration files:

- `environment.ts` - Development environment
- `environment.test.ts` - Test environment
- `environment.prod.ts` - Production environment

## Secrets Management

For secure handling of sensitive information like API keys, webhook URLs, and other secrets, we recommend using Azure Key Vault in conjunction with environment variables.

### Local Development

For local development, create a `.env` file (not committed to version control) with the following structure:

```
WEBHOOK_URL=your_webhook_url
API_KEY=your_api_key
```

### Azure DevOps Pipeline

In the Azure DevOps pipeline, secrets should be stored as pipeline variables or variable groups, and injected during the build process.

## Configuration in angular.json

Update the angular.json file to include the test environment configuration:

```json
"configurations": {
  "production": {
    "fileReplacements": [
      {
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.prod.ts"
      }
    ],
    ...
  },
  "test": {
    "fileReplacements": [
      {
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.test.ts"
      }
    ],
    ...
  }
}
```

## Kubernetes ConfigMaps and Secrets

For ARO deployment, sensitive information should be stored in Kubernetes Secrets, while non-sensitive configuration should use ConfigMaps.

### Example ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: briefing-buddy-ui-config
data:
  API_URL: "https://api.example.com"
  FEATURE_FLAGS: "feature1=true,feature2=false"
```

### Example Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: briefing-buddy-ui-secrets
type: Opaque
data:
  WEBHOOK_URL: <base64-encoded-value>
  API_KEY: <base64-encoded-value>
```

## Best Practices

1. Never commit secrets to version control
2. Use environment-specific configurations for all environments
3. Implement a secrets rotation policy
4. Use Azure Key Vault for storing sensitive information
5. Inject secrets at runtime or build time, not in source code
