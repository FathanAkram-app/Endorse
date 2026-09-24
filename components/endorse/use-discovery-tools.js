'use client';

import { useEffect } from 'react';
import { flushSync } from 'react-dom';
import { creators } from '@/lib/endorse/data';
import { discoverCreators } from '@/lib/endorse/discovery';

export function useDiscoveryTools({ setTab, setQuery, setCategory, setSort }) {
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tool = {
      name: 'filter_sample_creators',
      title: 'Find sample creators',
      description: 'Update the visible sample creator directory by category, search text, and price or rating sort. Does not book or contact anyone.',
      inputSchema: {
        type: 'object', additionalProperties: false,
        properties: {
          query: { type: 'string' },
          category: { type: 'string', enum: ['All creators', 'Lifestyle', 'Beauty', 'Travel'] },
          sort: { type: 'string', enum: ['recommended', 'price-low', 'price-high', 'rating'] },
        },
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected filter options.');
        const { query = '', category = 'All creators', sort = 'recommended' } = input;
        if (Object.keys(input).some((key) => !['query', 'category', 'sort'].includes(key)) || typeof query !== 'string' || !['All creators', 'Lifestyle', 'Beauty', 'Travel'].includes(category) || !['recommended', 'price-low', 'price-high', 'rating'].includes(sort)) throw new Error('Invalid creator filter.');
        flushSync(() => { setTab('creators'); setQuery(query); setCategory(category); setSort(sort); });
        document.getElementById('discover')?.scrollIntoView();
        return { sampleData: true, creators: discoverCreators(creators, { query, category, sort }).map(({ id, name, price, tier }) => ({ id, name, startingPriceUSD: price, experience: tier })) };
      },
    };
    try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional browser capability; UI remains fully usable. */ }
    return () => lifecycle.abort();
  }, [setTab, setQuery, setCategory, setSort]);
}
