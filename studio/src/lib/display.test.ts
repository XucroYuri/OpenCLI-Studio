import { describe, expect, it } from 'vitest';
import { buildLocalizedCommandId, buildLocalizedCommandTitle } from './display';

describe('buildLocalizedCommandId', () => {
  it('keeps raw command ids in English and localizes the action segment in Chinese', () => {
    expect(buildLocalizedCommandId('google/news', { locale: 'en', siteLabel: 'Google' })).toBe('google/news');
    expect(buildLocalizedCommandId('google/news', { locale: 'zh-CN', siteLabel: 'Google' })).toBe('Google/新闻');
  });

  it('falls back to translated token composition for unmapped actions', () => {
    expect(buildLocalizedCommandId('reddit/search-suggestions', { locale: 'zh-CN', siteLabel: 'Reddit' })).toBe('Reddit/搜索建议');
  });
});

describe('buildLocalizedCommandTitle', () => {
  it('prefers the explicit mapped Chinese title when available', () => {
    expect(buildLocalizedCommandTitle('google/news', 'Top stories', {
      locale: 'zh-CN',
      siteLabel: '谷歌',
      mappedTitle: 'Google 新闻头条',
      siteAliases: ['Google'],
    })).toBe('谷歌 新闻头条');
  });

  it('replaces known English site aliases inside mapped Chinese titles', () => {
    expect(buildLocalizedCommandTitle('google/news', 'Top stories', {
      locale: 'zh-CN',
      siteLabel: '谷歌',
      mappedTitle: '获取 Google 新闻头条',
      siteAliases: ['Google'],
    })).toBe('获取 谷歌 新闻头条');
  });

  it('builds a Chinese title from the site label and action when no mapping exists', () => {
    expect(buildLocalizedCommandTitle('google/news', 'Top stories', {
      locale: 'zh-CN',
      siteLabel: 'Google',
    })).toBe('Google 新闻');
  });

  it('keeps existing Chinese descriptions and English descriptions in their own locales', () => {
    expect(buildLocalizedCommandTitle('bilibili/ranking', 'B站视频排行榜', {
      locale: 'zh-CN',
      siteLabel: '哔哩哔哩',
    })).toBe('B站视频排行榜');

    expect(buildLocalizedCommandTitle('google/news', 'Top stories', {
      locale: 'en',
      siteLabel: 'Google',
    })).toBe('Top stories');
  });
});
