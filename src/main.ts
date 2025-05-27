import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// Define and register custom elements
// We'll handle this differently since the loader isn't found
// Will use a more generic approach for web components

if (environment.production) {
  enableProdMode();
}

// Wait for the DOM to be ready before bootstrapping
document.addEventListener('DOMContentLoaded', () => {
  platformBrowserDynamic().bootstrapModule(AppModule)
    .catch(err => console.error(err));
});
