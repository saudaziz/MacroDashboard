import '@angular/compiler';
import './styles.css';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

console.log('Main.ts starting in Zoneless mode...');
bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideHttpClient(),
    provideAnimations()
  ]
}).then(() => console.log('Bootstrap success!'))
  .catch(err => console.error('Bootstrap failed!', err));
