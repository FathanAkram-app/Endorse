export function discoverCreators(records, { category = 'All creators', query = '', sort = 'recommended' } = {}) {
  const term = query.trim().toLowerCase();
  const filtered = records.filter((creator) =>
    (category === 'All creators' || creator.category === category) &&
    `${creator.name} ${creator.handle} ${creator.category} ${creator.location}`.toLowerCase().includes(term)
  );
  if (sort === 'price-low') filtered.sort((a, b) => a.price - b.price);
  if (sort === 'price-high') filtered.sort((a, b) => b.price - a.price);
  if (sort === 'rating') filtered.sort((a, b) => b.rating - a.rating);
  return filtered;
}
