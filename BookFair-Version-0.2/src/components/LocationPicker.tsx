import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MapPin, Search } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  defaultLocation?: { lat: number; lng: number };
  trigger?: React.ReactNode;
}

interface MapClickHandlerProps {
  onLocationClick: (lat: number, lng: number) => void;
}

// Component to handle map clicks
function MapClickHandler({ onLocationClick }: MapClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      onLocationClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({ 
  onLocationSelect, 
  defaultLocation = { lat: 28.6139, lng: 77.2090 }, // Default to Delhi
  trigger 
}: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState(defaultLocation);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // Use Nominatim (OpenStreetMap) for free geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=IN`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const location = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
        setMapCenter(location);
        setSelectedLocation(location);
      } else {
        alert('Location not found. Please try a different search term or click on the map.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      alert('Error searching location. Please try again or select a location on the map.');
    } finally {
      setIsSearching(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setMapCenter(location);
          setSelectedLocation(location);
        },
        (error) => {
          console.error('Error getting current location:', error);
          alert('Unable to get your current location. Please search or select manually on the map.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        return data.display_name;
      }
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const handleConfirm = async () => {
    if (!selectedLocation) return;
    
    const address = await reverseGeocode(selectedLocation.lat, selectedLocation.lng);
    onLocationSelect({
      ...selectedLocation,
      address
    });
    setIsOpen(false);
  };

  const defaultTrigger = (
    <Button variant="outline" type="button">
      <MapPin className="h-4 w-4 mr-2" />
      Select on Map
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      {/* UPDATED: Made dialog much larger */}
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] max-h-[800px]">
        <DialogHeader>
          <DialogTitle>Select Location</DialogTitle>
          <DialogDescription>
            Search for a location or click on the map to select your school/university location.
          </DialogDescription>
        </DialogHeader>
        
        {/* UPDATED: Better layout for larger dialog */}
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Search Controls */}
          <div className="flex gap-2 flex-shrink-0">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search for a location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button 
                onClick={handleSearch} 
                disabled={isSearching}
                variant="outline"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={getCurrentLocation} variant="outline">
              <MapPin className="h-4 w-4 mr-2" />
              Current Location
            </Button>
          </div>

          {/* UPDATED: Map container is now much bigger */}
          <div className="flex-1 border rounded-lg overflow-hidden min-h-[500px]">
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={13}
              style={{ height: '100%', width: '100%', minHeight: '500px' }}
              key={`${mapCenter.lat}-${mapCenter.lng}`}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onLocationClick={handleMapClick} />
              {selectedLocation && (
                <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
              )}
            </MapContainer>
          </div>

          {/* Selected Location Info */}
          {selectedLocation && (
            <div className="p-3 bg-muted rounded-lg flex-shrink-0">
              <p className="text-sm font-medium">Selected Location:</p>
              <p className="text-sm text-muted-foreground">
                Latitude: {selectedLocation.lat.toFixed(6)}, Longitude: {selectedLocation.lng.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedLocation}>
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
