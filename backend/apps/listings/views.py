from django.shortcuts import render
from rest_framework import viewsets
from .models import Listing
from .serializers import (
    ListingCreateSerializer, 
    ListingDetailSerializer, 
    ListingUpdateSerializer, 
    CompactListingSerializer
)

# Create your views here.

class ListingViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing listings.
    """
    queryset = Listing.objects.all()
    serializer_class = ListingDetailSerializer  # Default serializer

    def get_serializer_class(self):
        if self.action == 'create':
            return ListingCreateSerializer
        if self.action == 'list':
            return CompactListingSerializer
        if self.action in ['update', 'partial_update']:
            return ListingUpdateSerializer
        return self.serializer_class
