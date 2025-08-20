import { useState} from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, School, MapPinIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/services/supabase';
interface LocationData {
  lat: number;
  lng: number;
  address: string;
  pincode?: string;
  area?: string;
  landmark?: string;
}

interface SchoolMatch {
  id: string;
  name: string;
  distance: number;
  landmarks: string[];
  pincode: string;
  area: string;
  confidence: number;
  lat: number;
  lng: number;
}


interface EnhancedLocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  onSchoolSelect?: (school: SchoolMatch) => void;
  defaultLocation?: { lat: number; lng: number };
  trigger?: React.ReactNode;
  mode?: 'location' | 'school';
  schoolName?: string;
}

export default function EnhancedLocationPicker({ 
  onLocationSelect,
  onSchoolSelect,
  defaultLocation = { lat: 28.6139, lng: 77.2090 },
  trigger,
  mode = 'location',
  schoolName = ''
}: EnhancedLocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState(schoolName);
  const [pincodeSearch, setPincodeSearch] = useState('');
  const [landmarkSearch, setLandmarkSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState(defaultLocation);
  const [schoolMatches, setSchoolMatches] = useState<SchoolMatch[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolMatch | null>(null);
  const [showSchoolSelection, setShowSchoolSelection] = useState(false);

  // // Fuzzy string matching function
  // const fuzzyMatch = (str1: string, str2: string): number => {
  //   const longer = str1.length > str2.length ? str1 : str2;
  //   const shorter = str1.length > str2.length ? str2 : str1;
    
  //   if (longer.length === 0) return 1.0;
    
  //   const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  //   return (longer.length - editDistance) / longer.length;
  // };

  // const levenshteinDistance = (str1: string, str2: string): number => {
  //   const matrix = [];
  //   for (let i = 0; i <= str2.length; i++) {
  //     matrix[i] = [i];
  //   }
  //   for (let j = 0; j <= str1.length; j++) {
  //     matrix[0][j] = j;
  //   }
  //   for (let i = 1; i <= str2.length; i++) {
  //     for (let j = 1; j <= str1.length; j++) {
  //       if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
  //         matrix[i][j] = matrix[i - 1][j - 1];
  //       } else {
  //         matrix[i][j] = Math.min(
  //           matrix[i - 1][j - 1] + 1,
  //           matrix[i][j - 1] + 1,
  //           matrix[i - 1][j] + 1
  //         );
  //       }
  //     }
  //   }
  //   return matrix[str2.length][str1.length];
  // };
const searchSchools = async () => {
  if (!searchQuery.trim()) return;

  setIsSearching(true);
  try {
    let query = supabase
      .from("school_clusters")
      .select("id, school_name, lat, lng, area, pincode, landmarks")
      .ilike("school_name", `%${searchQuery}%`);

    if (pincodeSearch) {
      query = query.eq("pincode", pincodeSearch);
    }

    const { data, error } = await query.limit(20);

    if (error) throw error;

    if (data && data.length > 0) {
      const schools: SchoolMatch[] = data.map((s) => ({
        id: s.id,
        name: s.school_name,
        lat: Number(s.lat),
        lng: Number(s.lng),
        area: s.area || "",
        pincode: s.pincode || "",
        landmarks: s.landmarks || [],
        distance: 0,
        confidence: 1,
      }));

      setSchoolMatches(schools);
      setShowSchoolSelection(true);

      setMapCenter({ lat: schools[0].lat, lng: schools[0].lng });
    } else {
      setSchoolMatches([]);
      setShowSchoolSelection(false);
    }
  } catch (error) {
    console.error("Error searching schools:", error);
  } finally {
    setIsSearching(false);
  }
};



  const handleSchoolSelect = (school: SchoolMatch) => {
    setSelectedSchool(school);
    setSelectedLocation({ lat: school.lat, lng: school.lng });
    setMapCenter({ lat: school.lat, lng: school.lng });
    
    if (onSchoolSelect) {
      onSchoolSelect(school);
    }
  };

  const handleConfirm = async () => {
    if (!selectedLocation) return;
    
    let address = '';
    let pincode = '';
    let area = '';
    let landmark = '';
    
    if (selectedSchool) {
      address = `${selectedSchool.name}, ${selectedSchool.area}`;
      pincode = selectedSchool.pincode;
      area = selectedSchool.area;
      landmark = selectedSchool.landmarks[0] || '';
    } else {
      // Reverse geocode for manual location selection
      address = await reverseGeocode(selectedLocation.lat, selectedLocation.lng);
    }
    
    onLocationSelect({
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      address,
      pincode,
      area,
      landmark
    });
    
    setIsOpen(false);
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      return data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch  {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const MapClickHandler = ({ onLocationClick }: { onLocationClick: (lat: number, lng: number) => void }) => {
    useMapEvents({
      click: (e) => {
        onLocationClick(e.latlng.lat, e.latlng.lng);
        setSelectedSchool(null); // Clear school selection if manual location picked
      },
    });
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" type="button">
            <MapPin className="h-4 w-4 mr-2" />
            {mode === 'school' ? 'Find School' : 'Select Location'}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-7xl w-[95vw] h-[90vh] max-h-[900px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'school' ? 'Find Your School' : 'Select Location'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'school' 
              ? 'Search for your school with name, pincode, and landmarks to avoid confusion with similar schools'
              : 'Search for a location or click on the map to select'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-4 h-full min-h-0">
          {/* Left Panel - Search and Results */}
          <div className="w-80 flex flex-col gap-4">
            {/* Search Controls */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Search Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">School Name</label>
                  <Input
                    placeholder="Kendriya Vidyalaya..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchSchools()}
                  />
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Pincode (Optional)</label>
                  <Input
                    placeholder="110022"
                    value={pincodeSearch}
                    onChange={(e) => setPincodeSearch(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Nearby Landmark</label>
                  <Input
                    placeholder="DDA Market, Metro Station..."
                    value={landmarkSearch}
                    onChange={(e) => setLandmarkSearch(e.target.value)}
                  />
                </div>
                
                <Button 
                  onClick={searchSchools} 
                  disabled={isSearching}
                  className="w-full"
                  size="sm"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {isSearching ? 'Searching...' : 'Find Schools'}
                </Button>
              </CardContent>
            </Card>
            
            {/* School Results */}
            {showSchoolSelection && schoolMatches.length > 0 && (
              <Card className="flex-1 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Found {schoolMatches.length} matches</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-full overflow-y-auto max-h-96">
                    {schoolMatches.map((school) => (
                      <div
                        key={school.id}
                        className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${
                          selectedSchool?.id === school.id ? 'bg-primary/10 border-primary' : ''
                        }`}
                        onClick={() => handleSchoolSelect(school)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <School className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">{school.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div className="flex items-center gap-1">
                                <MapPinIcon className="h-3 w-3" />
                                <span>{school.area} - {school.pincode}</span>
                              </div>
                              <div>📍 Near: {school.landmarks.join(', ')}</div>
                              <div>🚶 {school.distance.toFixed(1)}km away</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={school.confidence > 0.9 ? 'default' : 'secondary'}>
                              {Math.round(school.confidence * 100)}% match
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Right Panel - Map */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div className="flex-1 border rounded-lg overflow-hidden min-h-[500px]">
              <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={selectedSchool ? 16 : 13}
                style={{ height: '100%', width: '100%' }}
                key={`${mapCenter.lat}-${mapCenter.lng}-${selectedSchool?.id}`}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onLocationClick={(lat, lng) => setSelectedLocation({ lat, lng })} />
                
                {/* Show all school matches */}
                {schoolMatches.map((school) => (
                  <Marker
                    key={school.id}
                    position={[school.lat, school.lng]}
                    icon={L.divIcon({
                      className: `custom-marker ${selectedSchool?.id === school.id ? 'selected' : ''}`,
                      html: `<div class="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">${school.confidence > 0.9 ? '★' : Math.round(school.confidence * 100)}</div>`,
                      iconSize: [24, 24],
                      iconAnchor: [12, 12]
                    })}
                  />
                ))}
                
                {/* Manual location selection */}
                {selectedLocation && !selectedSchool && (
                  <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
                )}
              </MapContainer>
            </div>
            
            {/* Selection Info */}
            {(selectedLocation || selectedSchool) && (
              <Card>
                <CardContent className="pt-4">
                  {selectedSchool ? (
                    <div>
                      <p className="text-sm font-medium">Selected School:</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedSchool.name} in {selectedSchool.area}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Near: {selectedSchool.landmarks.join(', ')} | Pin: {selectedSchool.pincode}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium">Selected Location:</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedLocation?.lat.toFixed(6)}, {selectedLocation?.lng.toFixed(6)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedLocation}
          >
            Confirm {selectedSchool ? 'School' : 'Location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
