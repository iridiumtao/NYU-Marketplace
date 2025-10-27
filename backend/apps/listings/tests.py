import pytest
from tests.factories.factories import ListingFactory, ListingImageFactory


@pytest.mark.django_db
def test_listing_creation():
    """
    Test that a Listing instance can be created successfully.
    """
    listing = ListingFactory()
    assert listing.pk is not None
    assert "@nyu.edu" in listing.user.email


@pytest.mark.django_db
def test_listing_image_creation():
    """
    Test that a ListingImage instance can be created successfully.
    """
    listing_image = ListingImageFactory()
    assert listing_image.pk is not None
    assert listing_image.listing is not None
