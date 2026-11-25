import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usefetchCustomizedProducts } from '../hooks/query';
import TopicText from '../UI/TopicText';
import Card, { type Product } from '../components/Home/Card';
import SkeletonCard from '../UI/SkeletonCard';
import './Customized.css';

const PRESET_TAGS = [
  { id: 'all', label: 'All Customized', icon: '🥻' },
  { id: 'new', label: 'New Arrivals', icon: '✨' },
  { id: 'offer', label: 'Special Offers', icon: '🏷️' },
  { id: 'trend', label: 'Trending', icon: '🔥' },
];

export const Customized: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTagParam = searchParams.get('tag')?.toLowerCase() || 'all';

  const [selectedTag, setSelectedTag] = useState<string>(currentTagParam);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  const { data = [], isLoading, isError, error } = usefetchCustomizedProducts();

  const customizedProducts: Product[] = Array.isArray(data) ? data : [];

  // Sync state if URL query param changes
  React.useEffect(() => {
    const param = searchParams.get('tag')?.toLowerCase() || 'all';
    setSelectedTag(param);
  }, [searchParams]);

  // Compute tag counts dynamically
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { all: customizedProducts.length };
    customizedProducts.forEach((p) => {
      const tag = p.tag?.toLowerCase();
      if (tag) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    });
    return counts;
  }, [customizedProducts]);

  // Dynamically collect all available tags
  const availableTags = useMemo(() => {
    const tagMap = new Map<string, { id: string; label: string; icon: string }>();

    PRESET_TAGS.forEach((t) => tagMap.set(t.id, t));

    customizedProducts.forEach((p) => {
      const tag = p.tag?.toLowerCase();
      if (tag && !tagMap.has(tag)) {
        tagMap.set(tag, {
          id: tag,
          label: tag.charAt(0).toUpperCase() + tag.slice(1),
          icon: '✨',
        });
      }
    });

    return Array.from(tagMap.values());
  }, [customizedProducts]);

  // Filter products by selected tag
  const filteredProducts = useMemo(() => {
    let result = customizedProducts;

    if (selectedTag !== 'all') {
      result = result.filter(
        (p) => p.tag?.toLowerCase() === selectedTag.toLowerCase()
      );
    }

    // Sort products
    if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => {
        const priceA = a.offer && a.newPrice ? a.newPrice : a.price;
        const priceB = b.offer && b.newPrice ? b.newPrice : b.price;
        return priceA - priceB;
      });
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => {
        const priceA = a.offer && a.newPrice ? a.newPrice : a.price;
        const priceB = b.offer && b.newPrice ? b.newPrice : b.price;
        return priceB - priceA;
      });
    }

    return result;
  }, [customizedProducts, selectedTag, sortBy]);

  const handleTagChange = (tagId: string) => {
    setSelectedTag(tagId);
    if (tagId === 'all') {
      searchParams.delete('tag');
    } else {
      searchParams.set('tag', tagId);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="customized-page page-container">
      {/* Breadcrumb */}
      <nav className="customized-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="separator">/</span>
        <span className="current">Customized Collection</span>
      </nav>

      {/* Header Section */}
      <TopicText
        topic="Customized & Bespoke Collection"
        subtitle="Every saree is tailor-made to your measurements with personalized zari, fall/pico, and bespoke designer blouse stitching."
        badge="Bespoke Collection"
        count={customizedProducts.length}
      />

      {/* Bespoke Perks Bar */}
      <div className="customized-perks-bar">
        <div className="perk-item">
          <span className="perk-icon">✂️</span>
          <div className="perk-text">
            <strong>Custom Tailoring</strong>
            Made to your exact measurements
          </div>
        </div>
        <div className="perk-item">
          <span className="perk-icon">🧵</span>
          <div className="perk-text">
            <strong>Fall & Pico Included</strong>
            Handcrafted borders & finishing
          </div>
        </div>
        <div className="perk-item">
          <span className="perk-icon">✨</span>
          <div className="perk-text">
            <strong>100% Pure Silks</strong>
            Certified authentic handloom fabrics
          </div>
        </div>
        <div className="perk-item">
          <span className="perk-icon">📦</span>
          <div className="perk-text">
            <strong>Free Insured Shipping</strong>
            Delivered securely across India
          </div>
        </div>
      </div>

      {/* Filter & Sort Toolbar */}
      <div className="customized-toolbar">
        <div className="filter-header-row">
          <div className="filter-label-group">
            <span className="filter-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              Filter by Tag
            </span>
            <span className="filter-count-label">
              ({filteredProducts.length} {filteredProducts.length === 1 ? 'saree' : 'sarees'})
            </span>
          </div>

          <div className="sort-select-wrapper">
            <label htmlFor="custom-sort">Sort By:</label>
            <select
              id="custom-sort"
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="featured">Featured & Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Tag Filter Pills */}
        <div className="tag-pills-container" role="tablist" aria-label="Filter products by tag">
          {availableTags.map((tag) => {
            const count = tagCounts[tag.id] ?? 0;
            const isActive = selectedTag === tag.id;

            return (
              <button
                key={tag.id}
                type="button"
                className={`tag-pill-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleTagChange(tag.id)}
                role="tab"
                aria-selected={isActive}
              >
                <span>{tag.icon}</span>
                <span>{tag.label}</span>
                <span className="tag-pill-badge">{count}</span>
              </button>
            );
          })}

          {selectedTag !== 'all' && (
            <button
              type="button"
              className="clear-tag-btn"
              onClick={() => handleTagChange('all')}
              title="Clear tag filter"
            >
              ✕ Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="product-grid">
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <SkeletonCard key={key} />
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <div className="customized-empty-state">
          <div className="empty-icon-wrap">⚠️</div>
          <h3 className="empty-title">Failed to Load Customized Products</h3>
          <p className="empty-desc">
            {(error as any)?.response?.data?.message || 'Could not fetch the customized collection. Please check your connection and try again.'}
          </p>
          <button
            type="button"
            className="empty-reset-btn"
            onClick={() => window.location.reload()}
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredProducts.length === 0 && (
        <div className="customized-empty-state">
          <div className="empty-icon-wrap">🥻</div>
          <h3 className="empty-title">
            {selectedTag !== 'all'
              ? `No customized sarees found with tag "${selectedTag}"`
              : 'No Customized Sarees Found'}
          </h3>
          <p className="empty-desc">
            {selectedTag !== 'all'
              ? 'Try selecting "All Customized" or a different tag to explore other bespoke sarees.'
              : 'Our master weavers are currently crafting new customized sarees. Check back shortly or explore our full saree collection.'}
          </p>
          {selectedTag !== 'all' ? (
            <button
              type="button"
              className="empty-reset-btn"
              onClick={() => handleTagChange('all')}
            >
              Show All Customized Sarees
            </button>
          ) : (
            <Link to="/" className="empty-reset-btn">
              Explore All Sarees
            </Link>
          )}
        </div>
      )}

      {/* Products Grid */}
      {!isLoading && !isError && filteredProducts.length > 0 && (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <Card key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Customized;
