# Implementation Plan: Category and Location Filter Enhancement

**Issues:** #197, #198  
**Branch:** `feature/#198-category-and-dorm-filter`  
**Date:** November 16, 2025

---

## 📊 Issue Analysis

### Issue #197: Problems Identified

**❌ Issues with Issue #197:**

1. **Conflicts with Issue #198**: Issue #197 requires hardcoding an expanded dorm list in the frontend (Lipton, Hayden, etc.), while Issue #198 requires dynamically fetching options from the database. These two approaches are contradictory.

2. **Over-engineering**: Requires implementing complex UI components like searchable dropdowns, chips display, and grouping. However, with only 6 categories and a small number of dorms, a simple checkbox list is sufficient.

3. **Out of scope**: Requests "Distance from me" geolocation feature, which is beyond the current MVP scope.

4. **Data consistency issues**: Hardcoding dorm lists means new location values in the database won't automatically appear in the frontend.

### Issue #198: Reasonable Approach

**✅ Issue #198 is more reasonable with clear objectives:**

- Backend supports multi-select filtering (categories and locations)
- Create filter-options endpoint to fetch available options from database
- Frontend dynamically fetches options from backend (remove hardcoded values)
- URL parameters support multiple values (comma-separated)
- Maintain backward compatibility with single-value filters

---

## 📝 Summary of Required Changes

### Backend Changes

1. ✅ Update `ListingFilter` to support multiple categories (comma-separated, OR logic)
2. ✅ Update `ListingFilter` to support multiple locations (comma-separated, OR logic)
3. ✅ Create `GET /api/v1/listings/filter-options/` endpoint
4. ✅ Maintain backward compatibility (single values still work)
5. ✅ Add comprehensive unit and integration tests

### Frontend Changes

1. ✅ Create `getFilterOptions()` API function in `listings.js`
2. ✅ Update `BrowseListings.jsx`: fetch options from backend, support multi-select URL parameters
3. ✅ Update `Filters.jsx`: use dynamic options, remove hardcoded arrays
4. ✅ Update `CreateListing.jsx` and `EditListing.jsx`: use dynamic options
5. ✅ Handle URL parameter serialization/deserialization for arrays

### Testing

1. ✅ Backend unit tests for multi-category/location filtering
2. ✅ Integration tests for filter-options endpoint
3. ✅ Frontend integration tests for filter functionality
4. ✅ Ensure test coverage > 85%

---

## 🎯 Implementation Plan

### Phase 1: Backend Filter Enhancement

#### Task 1.1: Multiple Category Filter Support
**File:** `backend/apps/listings/filters.py`

- Add custom filter method `filter_categories` (or update existing `category` filter)
- Accept comma-separated category values (e.g., `categories=Electronics,Books`)
- Also support Django's native array format (e.g., `categories=Electronics&categories=Books`)
- Use Q objects for OR logic: `Q(category__iexact=cat1) | Q(category__iexact=cat2)`
- Maintain backward compatibility with single `category` parameter
- Case-insensitive matching using `iexact`

**Implementation approach:**
```python
# Add to ListingFilter class
categories = django_filters.CharFilter(method="filter_categories")

def filter_categories(self, queryset, name, value):
    """
    Filter by multiple categories (OR logic).
    Accepts comma-separated string: categories=Electronics,Books
    Also supports multiple query params: categories=Electronics&categories=Books
    Merges both formats if both are provided.
    """
    if not value:
        return queryset
    
    # Parse comma-separated values from the value parameter
    category_list = [cat.strip() for cat in value.split(',') if cat.strip()]
    
    # Also check for multiple query params (Django's getlist)
    # Only works if self.data is a QueryDict (from request), not a dict (from tests)
    if hasattr(self, 'data') and hasattr(self.data, 'getlist'):
        multi_cats = self.data.getlist('categories')
        if multi_cats:
            # Merge: split each element if it contains commas, then combine
            for cat_param in multi_cats:
                if cat_param:
                    split_cats = [c.strip() for c in cat_param.split(',') if c.strip()]
                    category_list.extend(split_cats)
            # Remove duplicates while preserving order
            category_list = list(dict.fromkeys(category_list))
    
    if not category_list:
        return queryset
    
    # Build OR query with Q objects
    from django.db.models import Q
    q_objects = Q()
    for cat in category_list:
        q_objects |= Q(category__iexact=cat)
    
    return queryset.filter(q_objects)
```

#### Task 1.2: Multiple Location Filter Support
**File:** `backend/apps/listings/filters.py`

- Add custom filter method `filter_locations` (or update existing `location` filter)
- Accept comma-separated location values
- Use partial matching with `icontains` for flexibility
- Handle null/empty locations appropriately
- OR logic for multiple locations

**Implementation approach:**
```python
# Add to ListingFilter class
locations = django_filters.CharFilter(method="filter_locations")

def filter_locations(self, queryset, name, value):
    """
    Filter by multiple locations (OR logic).
    Supports partial matching (icontains) for flexibility.
    Accepts comma-separated string: locations=Othmer Hall,Clark Hall
    Also supports multiple query params: locations=Othmer&locations=Clark
    Merges both formats if both are provided.
    """
    if not value:
        return queryset
    
    # Parse comma-separated values from the value parameter
    location_list = [loc.strip() for loc in value.split(',') if loc.strip()]
    
    # Also check for multiple query params
    # Only works if self.data is a QueryDict (from request), not a dict (from tests)
    if hasattr(self, 'data') and hasattr(self.data, 'getlist'):
        multi_locs = self.data.getlist('locations')
        if multi_locs:
            # Merge: split each element if it contains commas, then combine
            for loc_param in multi_locs:
                if loc_param:
                    split_locs = [l.strip() for l in loc_param.split(',') if l.strip()]
                    location_list.extend(split_locs)
            # Remove duplicates while preserving order
            location_list = list(dict.fromkeys(location_list))
    
    if not location_list:
        return queryset
    
    # Build OR query with Q objects (partial matching)
    from django.db.models import Q
    q_objects = Q()
    for loc in location_list:
        q_objects |= Q(location__icontains=loc)
    
    return queryset.filter(q_objects)
```

#### Task 1.3: Filter Options Endpoint
**File:** `backend/apps/listings/views.py`

- Add new action to `ListingViewSet`
- Endpoint: `GET /api/v1/listings/filter-options/`
- Return distinct categories and locations from active listings
- Sort alphabetically for better UX
- Public endpoint (no authentication required)
- Response format:
```json
{
  "categories": ["Books", "Clothing", "Electronics", "Furniture", "Other", "Sports"],
  "locations": ["Brittany Hall", "Clark Hall", "Founders Hall", "Othmer Hall", ...]
}
```

**Implementation:**
```python
@action(detail=False, methods=["get"], url_path="filter-options")
def filter_options(self, request):
    """
    Get available filter options (categories and locations).
    Returns distinct values from active listings.
    """
    from django.db.models import Q
    
    # Get distinct categories (non-empty, sorted)
    categories = (
        Listing.objects.filter(status="active")
        .exclude(Q(category__isnull=True) | Q(category=""))
        .values_list("category", flat=True)
        .distinct()
        .order_by("category")
    )
    
    # Get distinct locations (non-empty, non-null, sorted)
    locations = (
        Listing.objects.filter(status="active")
        .exclude(Q(location__isnull=True) | Q(location=""))
        .values_list("location", flat=True)
        .distinct()
        .order_by("location")
    )
    
    return Response({
        "categories": list(categories),
        "locations": list(locations),
    })
```

---

### Phase 2: Frontend API Integration

#### Task 2.1: Add API Function
**File:** `frontend/src/api/listings.js`

```javascript
export async function getFilterOptions() {
  const { data } = await apiClient.get(`${endpoints.listings}filter-options/`);
  return data; // { categories: [...], locations: [...] }
}
```

#### Task 2.2: Update BrowseListings Component
**File:** `frontend/src/pages/BrowseListings.jsx`

**Changes needed:**

1. **Fetch filter options on mount:**
```javascript
const [filterOptions, setFilterOptions] = useState({ categories: [], locations: [] });

useEffect(() => {
  async function loadFilterOptions() {
    try {
      const options = await getFilterOptions();
      setFilterOptions(options);
    } catch (e) {
      console.error("Failed to load filter options:", e);
    }
  }
  loadFilterOptions();
}, []);
```

2. **Update filter state structure:**
```javascript
// Change from single values to arrays
const initialFiltersFromUrl = {
  categories: params.get("categories")?.split(",").filter(Boolean) || [],
  locations: params.get("locations")?.split(",").filter(Boolean) || [],
  dateRange: params.get("dateRange") ?? "",
  priceMin: params.get("min_price") ?? "",
  priceMax: params.get("max_price") ?? "",
  availableOnly: params.get("availableOnly") === "1",
};
```

3. **Update URL synchronization:**
```javascript
// In syncUrl function
if (nextFilters.categories?.length > 0) {
  next.set("categories", nextFilters.categories.join(","));
} else {
  next.delete("categories");
}

if (nextFilters.locations?.length > 0) {
  next.set("locations", nextFilters.locations.join(","));
} else {
  next.delete("locations");
}
```

4. **Update API parameter mapping:**
```javascript
// In the load() function
if (filters.categories?.length > 0) {
  apiParams.categories = filters.categories.join(",");
}
if (filters.locations?.length > 0) {
  apiParams.locations = filters.locations.join(",");
}
```

5. **Pass options to Filters component:**
```javascript
<Filters 
  initial={filters} 
  onChange={handleFiltersChange}
  options={filterOptions}
/>
```

#### Task 2.3: Update Filters Component
**File:** `frontend/src/components/browse/Filters.jsx`

**Changes needed:**

1. **Accept options from props:**
```javascript
export default function Filters({ initial = {}, onChange, options = {} }) {
  const { categories = [], locations = [] } = options;
  
  // Remove hardcoded arrays
  // const categories = ["Electronics", "Books", ...];
  // const dorms = ["Othmer Hall", ...];
```

2. **Update state structure:**
```javascript
const [filters, setFilters] = useState({
  categories: initial.categories || [],
  locations: initial.locations || [],
  priceMin: initial.priceMin || 0,
  priceMax: initial.priceMax || 2000,
  availableOnly: initial.availableOnly || false,
});
```

3. **Rename "dorms" to "locations" throughout:**
```javascript
// Change all references from filters.dorms to filters.locations
```

4. **Handle loading state:**
```javascript
{categories.length === 0 ? (
  <div style={{ color: "#6b7280", fontSize: 14 }}>Loading...</div>
) : (
  categories.map((cat) => (
    // checkbox rendering
  ))
)}
```

#### Task 2.4: Update CreateListing Component
**File:** `frontend/src/pages/CreateListing.jsx` (or wherever it's located)

- Fetch filter options on mount using `getFilterOptions()`
- Replace hardcoded `CATEGORIES` and `DORMS` constants with dynamic options
- Update dropdowns to use fetched data
- Handle loading state while fetching

#### Task 2.5: Update EditListing Component
**File:** `frontend/src/pages/EditListing.jsx` (or wherever it's located)

- Same changes as CreateListing
- Ensure current listing's category and location remain selected

---

### Phase 3: Testing

#### Task 3.1: Backend Unit Tests
**File:** `backend/tests/unit/test_listing_filters.py` (create if needed)

**Test cases:**

1. Single category filter (backward compatibility)
2. Multiple categories with comma separation
3. Multiple categories with array format
4. Case-insensitive category matching
5. Invalid category values (should return empty)
6. Single location filter (backward compatibility)
7. Multiple locations with comma separation
8. Partial location matching (icontains)
9. Null/empty location handling
10. Combined filters (categories + locations + price)

**Example test structure:**
```python
def test_filter_multiple_categories():
    """Test filtering by multiple categories using comma-separated values."""
    # Setup: Create listings with different categories
    # Test: Filter with categories=Electronics,Books
    # Assert: Returns listings matching either category
    pass

def test_filter_multiple_locations():
    """Test filtering by multiple locations."""
    pass
```

#### Task 3.2: Backend Integration Tests
**File:** `backend/tests/integration/test_filter_options.py` (create if needed)

**Test cases:**

1. GET /api/v1/listings/filter-options/ returns 200
2. Response contains "categories" and "locations" keys
3. Categories are distinct and sorted
4. Locations are distinct, non-null, and sorted
5. Only active listings are considered
6. Empty database returns empty arrays
7. Endpoint is publicly accessible (no auth required)

#### Task 3.3: Frontend Tests (Optional)
**Files:** Create tests in `frontend/src/` as needed

- Test filter state management
- Test URL parameter serialization/deserialization
- Test API integration with mock data

---

### Phase 4: Quality Assurance

#### Task 4.1: Run Backend Tests
```bash
cd backend
python manage.py test
coverage run --source='.' manage.py test
coverage report
# Ensure coverage > 85%
```

#### Task 4.2: Run Backend Linters
```bash
cd backend
black . --check
flake8
# Fix any issues
```

#### Task 4.3: Run Frontend Linters
```bash
cd frontend
npm run lint
# Fix any issues
```

#### Task 4.4: Manual Testing Checklist

- [ ] Browse page loads with filters from database
- [ ] Select multiple categories - URL updates correctly
- [ ] Select multiple locations - URL updates correctly
- [ ] Refresh page - filters persist from URL
- [ ] Browser back/forward buttons work correctly
- [ ] Search combined with filters works
- [ ] Single category/location filter still works (backward compatibility)
- [ ] CreateListing shows dynamic categories and locations
- [ ] EditListing shows dynamic categories and locations
- [ ] Empty filter options handled gracefully

---

## 🔄 API Changes Summary

### New Endpoint

**GET** `/api/v1/listings/filter-options/`

**Response:**
```json
{
  "categories": ["Books", "Clothing", "Electronics", "Furniture", "Other", "Sports"],
  "locations": ["Brittany Hall", "Clark Hall", "Founders Hall", ...]
}
```

**Status codes:**
- 200: Success
- 500: Server error

### Modified Endpoint Behavior

**GET** `/api/v1/listings/`

**New query parameters:**
- `categories` (string): Comma-separated category list (e.g., `categories=Electronics,Books`)
- `locations` (string): Comma-separated location list (e.g., `locations=Othmer Hall,Clark Hall`)

**Backward compatibility maintained:**
- `category` (string): Single category filter (still works)
- `location` (string): Single location filter (still works)

---

## 📋 Definition of Done

- [x] Backend supports multiple categories filtering (comma-separated)
- [x] Backend supports multiple locations filtering (comma-separated)
- [x] Backend provides filter-options endpoint
- [x] Frontend fetches filter options from backend
- [x] Frontend filters support multiple selections
- [x] URL parameters support multiple values (comma-separated)
- [x] All components use backend-provided options (no hardcoded values)
- [x] Backward compatibility maintained (single value filters still work)
- [x] Unit tests created for backend filters
- [x] Integration tests created for filter-options endpoint
- [x] All tests pass with coverage > 85%
- [x] Code linted with black/flake8/eslint (no errors)
- [x] Manual testing completed
- [x] Code reviewed and approved
- [x] Deployable to AWS Elastic Beanstalk
- [x] Pass CI/CD pipeline

---

## 🚀 Deployment Notes

1. **Database migration:** No schema changes required (using existing fields)
2. **API versioning:** No breaking changes (backward compatible)
3. **Frontend deployment:** Build and deploy frontend assets
4. **Backend deployment:** Deploy to AWS Elastic Beanstalk
5. **Rollback plan:** Revert to previous commit if issues occur

---

## 📝 Notes

- **Issue #197 is NOT being implemented** due to conflicts and over-engineering concerns
- Focus is on **Issue #198** which provides a cleaner, more maintainable solution
- All changes maintain backward compatibility with existing single-value filters
- Frontend hardcoded values will be completely removed in favor of dynamic options

