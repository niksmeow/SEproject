"""Geolocation service for IP detection, geocoding, and distance calculation"""
import logging
import requests
from typing import Optional, Dict, Tuple
import math

logger = logging.getLogger(__name__)


class GeolocationService:
    """Service for geolocation operations"""
    
    def __init__(self):
        self.ipapi_url = "https://ipapi.co"
        self.geocoding_url = "https://nominatim.openstreetmap.org/search"
    
    def get_location_from_ip(self, ip_address: Optional[str] = None) -> Optional[Dict[str, str]]:
        """Get location from IP address using ipapi.co
        
        Args:
            ip_address: IP address to lookup. If None, uses current request IP.
            
        Returns:
            Dict with location info: {city, region, country, latitude, longitude}
            or None if detection fails
        """
        try:
            if ip_address:
                url = f"{self.ipapi_url}/{ip_address}/json/"
            else:
                url = f"{self.ipapi_url}/json/"
            
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if not data.get('error'):
                    return {
                        'city': data.get('city', ''),
                        'region': data.get('region', ''),
                        'country': data.get('country_name', ''),
                        'latitude': str(data.get('latitude', '')),
                        'longitude': str(data.get('longitude', '')),
                        'location': f"{data.get('city', '')}, {data.get('region', '')}, {data.get('country_name', '')}".strip(', ')
                    }
            logger.warning(f"IP geolocation failed: {response.status_code}")
        except Exception as e:
            logger.error(f"Error detecting location from IP: {str(e)}")
        
        return None
    
    def geocode_location(self, location_string: str) -> Optional[Dict[str, str]]:
        """Convert location string to coordinates using OpenStreetMap Nominatim
        
        Args:
            location_string: Location string (e.g., "New York, NY, USA")
            
        Returns:
            Dict with coordinates: {latitude, longitude, display_name}
            or None if geocoding fails
        """
        try:
            params = {
                'q': location_string,
                'format': 'json',
                'limit': 1
            }
            headers = {
                'User-Agent': 'CareerOS/1.0'  # Required by Nominatim
            }
            
            response = requests.get(
                self.geocoding_url,
                params=params,
                headers=headers,
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    result = data[0]
                    return {
                        'latitude': str(result.get('lat', '')),
                        'longitude': str(result.get('lon', '')),
                        'display_name': result.get('display_name', location_string)
                    }
            logger.warning(f"Geocoding failed for '{location_string}': {response.status_code}")
        except Exception as e:
            logger.error(f"Error geocoding location '{location_string}': {str(e)}")
        
        return None
    
    def calculate_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
        unit: str = 'miles'
    ) -> float:
        """Calculate distance between two coordinates using Haversine formula
        
        Args:
            lat1: Latitude of first point
            lon1: Longitude of first point
            lat2: Latitude of second point
            lon2: Longitude of second point
            unit: 'miles' or 'km'
            
        Returns:
            Distance in specified unit
        """
        try:
            # Convert to float
            lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
            
            # Radius of Earth in kilometers
            R = 6371.0
            
            # Convert to radians
            lat1_rad = math.radians(lat1)
            lon1_rad = math.radians(lon1)
            lat2_rad = math.radians(lat2)
            lon2_rad = math.radians(lon2)
            
            # Haversine formula
            dlat = lat2_rad - lat1_rad
            dlon = lon2_rad - lon1_rad
            
            a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
            c = 2 * math.asin(math.sqrt(a))
            
            distance_km = R * c
            
            if unit == 'miles':
                return distance_km * 0.621371
            return distance_km
        except (ValueError, TypeError) as e:
            logger.error(f"Error calculating distance: {str(e)}")
            return float('inf')  # Return infinity if calculation fails
    
    def parse_job_location(self, location_string: str) -> Optional[Tuple[float, float]]:
        """Parse job location string to extract coordinates
        
        Args:
            location_string: Job location string (e.g., "New York, NY" or "Remote")
            
        Returns:
            Tuple of (latitude, longitude) or None if parsing fails
        """
        if not location_string or location_string.lower() == 'remote':
            return None
        
        # Try geocoding the location
        geocoded = self.geocode_location(location_string)
        if geocoded and geocoded.get('latitude') and geocoded.get('longitude'):
            try:
                return (float(geocoded['latitude']), float(geocoded['longitude']))
            except ValueError:
                pass
        
        return None


# Singleton instance
geolocation_service = GeolocationService()
