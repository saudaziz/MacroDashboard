import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<h1>BOOTSTRAP COMPONENT SUCCESS</h1>',
})
export class BootstrapComponent {}

export function bootstrap() {
  bootstrapApplication(BootstrapComponent);
}
