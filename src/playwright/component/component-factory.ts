// src/components/component.factory.ts
import { type Locator, type Page } from '@playwright/test';
import { Component, ProxiedComponent } from './component';

type Source = Page | Locator;

export const ComponentFactory = {
  base(input: Locator | string, alias?: string): ProxiedComponent {
    return Component.from(input, alias);
  },
};
