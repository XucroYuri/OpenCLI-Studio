import { describe, expect, it } from 'vitest';
import {
  buildInsightQuery,
  buildRegistryQuery,
  buildWorkbenchQuery,
  parseInsightQuery,
  parseRegistryQuery,
  parseWorkbenchQuery,
} from './routes';

describe('parseRegistryQuery', () => {
  it('hydrates registry filters from route query values', () => {
    expect(parseRegistryQuery({
      q: 'trend',
      site: 'google',
      surface: 'plugin',
      mode: 'public',
      capability: 'discovery',
      risk: 'safe',
      charts: '1',
      advanced: '1',
    })).toEqual({
      search: 'trend',
      site: 'google',
      surface: 'plugin',
      mode: 'public',
      capability: 'discovery',
      risk: 'safe',
      supportsChartsOnly: true,
      advancedMode: true,
    });
  });
});

describe('buildRegistryQuery', () => {
  it('serializes only non-default registry state into the route query', () => {
    expect(buildRegistryQuery({
      search: 'trend',
      site: 'google',
      surface: 'plugin',
      mode: 'public',
      capability: 'all',
      risk: 'all',
      supportsChartsOnly: true,
      advancedMode: true,
    })).toEqual({
      q: 'trend',
      site: 'google',
      surface: 'plugin',
      mode: 'public',
      charts: '1',
      advanced: '1',
    });
  });
});

describe('workbench route helpers', () => {
  it('round-trips command selection and advanced mode', () => {
    expect(parseWorkbenchQuery({
      command: 'google/trends',
      advanced: '1',
    })).toEqual({
      command: 'google/trends',
      advancedMode: true,
    });

    expect(buildWorkbenchQuery({
      command: 'google/trends',
      advancedMode: false,
    })).toEqual({
      command: 'google/trends',
    });
  });
});

describe('insight route helpers', () => {
  it('round-trips recipe selection and advanced mode', () => {
    expect(parseInsightQuery({
      recipe: 'google-trends-daily',
      advanced: '1',
    })).toEqual({
      recipeId: 'google-trends-daily',
      advancedMode: true,
    });

    expect(buildInsightQuery({
      recipeId: 'google-trends-daily',
      advancedMode: false,
    })).toEqual({
      recipe: 'google-trends-daily',
    });
  });
});
