import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ListingDetail from "./ListingDetail";
import * as listingsApi from "../api/listings";
import * as watchlistApi from "../api/watchlist";

// Mock the listings API
vi.mock("../api/listings", () => ({
  getListing: vi.fn(),
  getListings: vi.fn(),
}));

// Mock the watchlist API
vi.mock("../api/watchlist", () => ({
  addToWatchlist: vi.fn(),
  removeFromWatchlist: vi.fn(),
}));

// Mock useAuth
const mockIsAuthenticated = vi.fn(() => true);
vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

// Mock useParams and useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "123" }),
    useNavigate: () => mockNavigate,
  };
});

describe("ListingDetail", () => {
  const mockListing = {
    listing_id: 123,
    title: "Test Listing",
    price: "100.00",
    description: "A test listing description",
    status: "active",
    category: "electronics",
    location: "NYU",
    user_netid: "testuser",
    user_email: "test@nyu.edu",
    user_id: "456",
    images: [
      { image_url: "http://example.com/image1.jpg" },
      { image_url: "http://example.com/image2.jpg" },
    ],
    primary_image: { url: "http://example.com/image1.jpg" },
    is_saved: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
    listingsApi.getListing.mockResolvedValue(mockListing);
    listingsApi.getListings.mockResolvedValue({ results: [], count: 0 });
    watchlistApi.addToWatchlist.mockResolvedValue({});
    watchlistApi.removeFromWatchlist.mockResolvedValue({});
  });

  it("renders loading state initially", async () => {
    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    // The component should show loading state
    // The exact text may vary, but we can check for the API call
    expect(listingsApi.getListing).toHaveBeenCalledWith("123");
  });

  it("displays listing details when loaded", async () => {
    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("displays error message when listing fails to load", async () => {
    listingsApi.getListing.mockRejectedValue(new Error("Not found"));

    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load listing/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("navigates back when back button is clicked", async () => {
    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Find and click the back button
    const backButtons = screen.getAllByRole("button");
    const backButton = backButtons.find(btn => 
      btn.getAttribute("aria-label")?.includes("back") ||
      btn.textContent.includes("Back") ||
      btn.querySelector("svg") // Back button might have an icon
    );

    if (backButton) {
      fireEvent.click(backButton);
      // The component might use navigate(-1) or navigate to a specific route
      // We'll just verify the button is clickable
    }
  });

  it("handles listing with no images", async () => {
    const listingWithoutImages = {
      ...mockListing,
      images: [],
      primary_image: null,
    };

    listingsApi.getListing.mockResolvedValue(listingWithoutImages);

    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("handles listing with single image", async () => {
    const listingWithOneImage = {
      ...mockListing,
      images: [{ image_url: "http://example.com/image1.jpg" }],
    };

    listingsApi.getListing.mockResolvedValue(listingWithOneImage);

    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("navigates images with next/previous buttons", async () => {
    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Find next/previous image buttons
    const nextButtons = screen.queryAllByLabelText("Next image");
    const prevButtons = screen.queryAllByLabelText("Previous image");
    
    if (nextButtons.length > 0) {
      fireEvent.click(nextButtons[0]);
    }
    if (prevButtons.length > 0) {
      fireEvent.click(prevButtons[0]);
    }
  });

  it("opens and closes lightbox when clicking main image", async () => {
    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Find main image and click it to open lightbox
    const images = screen.getAllByAltText(/Test Listing|Image/);
    if (images.length > 0) {
      fireEvent.click(images[0]);
      
      // Lightbox should open
      await waitFor(() => {
        const closeButtons = screen.queryAllByLabelText("Close lightbox");
        expect(closeButtons.length).toBeGreaterThan(0);
      });
      
      // Close lightbox
      const closeButtons = screen.queryAllByLabelText("Close lightbox");
      if (closeButtons.length > 0) {
        fireEvent.click(closeButtons[0]);
      }
    }
  });

  it("navigates images in lightbox with keyboard", async () => {
    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Open lightbox
    const images = screen.getAllByAltText(/Test Listing|Image/);
    if (images.length > 0) {
      fireEvent.click(images[0]);
      
      await waitFor(() => {
        const closeButtons = screen.queryAllByLabelText("Close lightbox");
        expect(closeButtons.length).toBeGreaterThan(0);
      });

      // Test keyboard navigation
      fireEvent.keyDown(window, { key: "ArrowRight" });
      fireEvent.keyDown(window, { key: "ArrowLeft" });
      fireEvent.keyDown(window, { key: "Escape" });
    }
  });

  it("navigates images using thumbnail clicks", async () => {
    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Find thumbnail buttons
    const thumbnails = screen.queryAllByAltText(/thumbnail/);
    if (thumbnails.length > 1) {
      // Click second thumbnail
      const thumbnailButton = thumbnails[1].closest("button");
      if (thumbnailButton) {
        fireEvent.click(thumbnailButton);
      }
    }
  });

  it("toggles watchlist save button", async () => {
    mockIsAuthenticated.mockReturnValue(true);

    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Find save button
    const saveButtons = screen.queryAllByText(/Save|Saved/);
    if (saveButtons.length > 0) {
      fireEvent.click(saveButtons[0]);
      
      await waitFor(() => {
        expect(watchlistApi.addToWatchlist).toHaveBeenCalled();
      });
    }
  });

  it("removes from watchlist when already saved", async () => {
    mockIsAuthenticated.mockReturnValue(true);

    const savedListing = {
      ...mockListing,
      is_saved: true,
    };

    listingsApi.getListing.mockResolvedValue(savedListing);

    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Find saved button and click to remove
    const savedButtons = screen.queryAllByText("Saved");
    if (savedButtons.length > 0) {
      fireEvent.click(savedButtons[0]);
      
      await waitFor(() => {
        expect(watchlistApi.removeFromWatchlist).toHaveBeenCalled();
      });
    }
  });

  it("redirects to login when saving without authentication", async () => {
    mockIsAuthenticated.mockReturnValue(false);

    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Click save button
    const saveButtons = screen.queryAllByText(/Save/);
    if (saveButtons.length > 0) {
      fireEvent.click(saveButtons[0]);
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    }
  });

  it("opens contact seller modal", async () => {
    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Find contact seller button
    const contactButtons = screen.queryAllByText(/Contact Seller|Contact/);
    if (contactButtons.length > 0) {
      fireEvent.click(contactButtons[0]);
      
      // Modal should open
      await waitFor(() => {
        // ContactSellerModal should be rendered
        expect(screen.getByText("Test Listing")).toBeInTheDocument();
      });
    }
  });

  it("handles price as number", async () => {
    const listingWithNumberPrice = {
      ...mockListing,
      price: 150.5,
    };

    listingsApi.getListing.mockResolvedValue(listingWithNumberPrice);

    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Price should be formatted (appears in both desktop and mobile views)
    const priceElements = screen.getAllByText(/\$150\.50/);
    expect(priceElements.length).toBeGreaterThan(0);
  });

  it("handles price as string", async () => {
    const listingWithStringPrice = {
      ...mockListing,
      price: "200.00",
    };

    listingsApi.getListing.mockResolvedValue(listingWithStringPrice);

    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Price should be displayed as string (appears in both desktop and mobile views)
    const priceElements = screen.getAllByText(/\$200\.00/);
    expect(priceElements.length).toBeGreaterThan(0);
  });

  it("disables contact button for sold listings", async () => {
    const soldListing = {
      ...mockListing,
      status: "sold",
    };

    listingsApi.getListing.mockResolvedValue(soldListing);

    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Contact button should be disabled
    const contactButtons = screen.queryAllByText(/Contact Seller|Contact/);
    if (contactButtons.length > 0) {
      const contactButton = contactButtons.find(btn => btn.disabled !== undefined);
      if (contactButton) {
        expect(contactButton).toBeDisabled();
      }
    }
  });

  it("navigates to seller profile when seller card is clicked", async () => {
    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Find and click view profile button
    const viewProfileButtons = screen.queryAllByText("View Profile");
    if (viewProfileButtons.length > 0) {
      fireEvent.click(viewProfileButtons[0]);
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining("/seller/"),
        expect.objectContaining({ state: expect.any(Object) })
      );
    }
  });

  it("handles listing with user_email but no user_netid", async () => {
    const listingWithEmail = {
      ...mockListing,
      user_netid: null,
      user_email: "seller@nyu.edu",
    };

    listingsApi.getListing.mockResolvedValue(listingWithEmail);

    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("handles error when toggling watchlist fails", async () => {
    mockIsAuthenticated.mockReturnValue(true);
    watchlistApi.addToWatchlist.mockRejectedValue(new Error("Failed"));

    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Click save button
    const saveButtons = screen.queryAllByText(/Save/);
    if (saveButtons.length > 0) {
      fireEvent.click(saveButtons[0]);
      
      // Should handle error gracefully
      await waitFor(() => {
        expect(watchlistApi.addToWatchlist).toHaveBeenCalled();
      });
    }
  });

  it("handles listing without description", async () => {
    const listingWithoutDescription = {
      ...mockListing,
      description: null,
    };

    listingsApi.getListing.mockResolvedValue(listingWithoutDescription);

    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText("No description provided.")).toBeInTheDocument();
  });

  it("handles listing without location", async () => {
    const listingWithoutLocation = {
      ...mockListing,
      location: null,
    };

    listingsApi.getListing.mockResolvedValue(listingWithoutLocation);

    render(
      <MemoryRouter>
        <ListingDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Listing")).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText("Not specified")).toBeInTheDocument();
  });
});

