import { useState, useMemo } from "react";
import { usefetchAllProduct, usefetchlatestProduct } from "../../hooks/query";
import SkeletonCard from "../../UI/SkeletonCard";
import SkeletonCardLatest from "../../UI/SkeletonCardLatest";
import TopicText from "../../UI/TopicText";
import { dummyData } from "../../utils/helper";
import Card, { type Product } from "./Card";
import LatestCard from "./LatestCard";
import "./AllProduct.css";

const PRESET_TAGS = [
  { id: "all", label: "All Items", icon: "✨" },
  { id: "new", label: "New Arrivals", icon: "✨" },
  { id: "offer", label: "Offers", icon: "🏷️" },
  { id: "trend", label: "Trending", icon: "🔥" },
];

function AllProduct() {
  const { data = [], isLoading: isAllLoading } = usefetchAllProduct();
  const { data: latest_data = [], isLoading: isLatestLoading } = usefetchlatestProduct();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedDressType, setSelectedDressType] = useState("all");

  const isLoading = isAllLoading || isLatestLoading;

  // Extract available dressTypes dynamically from all products
  const availableDressTypes = useMemo(() => {
    const types = new Set<string>();
    data.forEach((p: Product) => {
      if (p.dressType) {
        types.add(p.dressType.toLowerCase().trim());
      }
    });
    return Array.from(types).sort();
  }, [data]);

  // Compute tag counts dynamically
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { all: data.length };
    data.forEach((p: Product) => {
      const tag = p.tag?.toLowerCase().trim();
      if (tag) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    });
    return counts;
  }, [data]);

  // Collect available tags (preset + unique tags found in data)
  const availableTags = useMemo(() => {
    const map = new Map<string, { id: string; label: string; icon: string }>();
    PRESET_TAGS.forEach((t) => map.set(t.id, t));

    data.forEach((p: Product) => {
      const tag = p.tag?.toLowerCase().trim();
      if (tag && !map.has(tag)) {
        map.set(tag, {
          id: tag,
          label: tag.charAt(0).toUpperCase() + tag.slice(1),
          icon: "🏷️",
        });
      }
    });

    return Array.from(map.values());
  }, [data]);

  // Check if any filter or search is active
  const isFiltering = Boolean(
    searchTerm.trim() || selectedTag !== "all" || selectedDressType !== "all"
  );

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    let result = data;

    // Search filter: checks title, description, tag, and dressType
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p: Product) =>
          p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tag?.toLowerCase().includes(q) ||
          p.dressType?.toLowerCase().includes(q)
      );
    }

    // Tag filter
    if (selectedTag !== "all") {
      result = result.filter(
        (p: Product) => p.tag?.toLowerCase().trim() === selectedTag.toLowerCase().trim()
      );
    }

    // DressType filter
    if (selectedDressType !== "all") {
      result = result.filter(
        (p: Product) => p.dressType?.toLowerCase().trim() === selectedDressType.toLowerCase().trim()
      );
    }

    return result;
  }, [data, searchTerm, selectedTag, selectedDressType]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedTag("all");
    setSelectedDressType("all");
  };

  if (isLoading) {
    const dummydata = dummyData(10);
    return (
      <div>
        <TopicText topic="Latest Products" subtitle="Loading fresh arrivals..." />
        <div className="latest-product-grid">
          {dummydata.slice(0, 4).map((_, index) => (
            <SkeletonCardLatest key={index} />
          ))}
        </div>
        <TopicText topic="All Products" subtitle="Loading our saree collection..." />
        <div className="product-grid">
          {dummydata.map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search, DressType & Tags Filter Bar */}
      <div className="catalog-filter-wrapper">
        <div className="filter-controls-row">
          {/* Search Box */}
          <div className="product-search-box">
            <span className="search-input-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              className="product-search-input"
              placeholder="Search sarees by title, fabric, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* DressType Dropdown */}
          <div className="filter-dropdowns-group">
            <div className="select-control-box">
              <span className="select-control-label">Style:</span>
              <select
                className="custom-filter-select"
                value={selectedDressType}
                onChange={(e) => setSelectedDressType(e.target.value)}
                aria-label="Filter by Dress Type"
              >
                <option value="all">All Styles</option>
                {availableDressTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tag Filters Row */}
        <div className="filter-tags-row">
          <div className="tag-pills-list" role="tablist" aria-label="Filter by tags">
            {availableTags.map((tag) => {
              const count = tagCounts[tag.id] ?? 0;
              const isActive = selectedTag === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`catalog-tag-pill ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedTag(tag.id)}
                  role="tab"
                  aria-selected={isActive}
                >
                  <span>{tag.icon}</span>
                  <span>{tag.label}</span>
                  <span className="tag-count-indicator">{count}</span>
                </button>
              );
            })}
          </div>

          {isFiltering && (
            <div className="active-filter-summary">
              <span>{filteredProducts.length} results</span>
              <button
                type="button"
                className="reset-all-filters-btn"
                onClick={handleResetFilters}
              >
                ✕ Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FILTER RESULTS VIEW (When searching or filtering by tag or dressType) */}
      {isFiltering ? (
        <div>
          <TopicText
            topic={
              searchTerm
                ? `Search Results for "${searchTerm}"`
                : selectedDressType !== "all"
                ? `${selectedDressType.charAt(0).toUpperCase() + selectedDressType.slice(1)} Collection`
                : `${selectedTag.charAt(0).toUpperCase() + selectedTag.slice(1)} Sarees`
            }
            subtitle={
              filteredProducts.length > 0
                ? `Found ${filteredProducts.length} ${filteredProducts.length === 1 ? "saree" : "sarees"} matching your selected criteria`
                : undefined
            }
            count={filteredProducts.length}
          />

          {filteredProducts.length === 0 ? (
            <div className="filter-empty-state">
              <div className="filter-empty-icon">🔍</div>
              <h3 className="filter-empty-title">No Products Found</h3>
              <p className="filter-empty-desc">
                We couldn't find any sarees matching your search criteria. Try adjusting your search term, tag, or dress type filter.
              </p>
              <button
                type="button"
                className="filter-reset-action-btn"
                onClick={handleResetFilters}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product: Product) => (
                <Card key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* DEFAULT VIEW (When no filters are active) */
        <div>
          {latest_data.length > 0 && (
            <>
              <TopicText
                topic="Latest Products"
                subtitle="Explore our freshest handcrafted saree arrivals"
                count={latest_data.length}
                badge="Fresh Drops"
              />
              <div className="latest-product-grid">
                {latest_data.map((product: Product) => (
                  <LatestCard key={product._id} product={product} />
                ))}
              </div>
            </>
          )}

          <TopicText
            topic="All Products"
            subtitle="Browse our complete collection of authentic sarees"
            count={data.length}
          />
          <div className="product-grid">
            {data.map((product: Product) => (
              <Card key={product._id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AllProduct;
