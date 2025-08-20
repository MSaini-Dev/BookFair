import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { LocationData } from '../types/database.types';

export function useUserLocation(userId?: string) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLocation = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // 1. Try user profile in Supabase first (source of truth)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('lat, lng, location, area, pincode, landmark')
          .eq('id', userId)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (profile?.lat && profile?.lng) {
          const loc: LocationData = {
            lat: profile.lat,
            lng: profile.lng,
            address: profile.location || '',
            area: profile.area || '',
            pincode: profile.pincode || '',
            landmark: profile.landmark || ''
          };
          setLocation(loc);
          // Update localStorage with database value
          localStorage.setItem('user_location', JSON.stringify(loc));
        } else {
          // 2. Fallback to localStorage if no database record
          const savedLocation = localStorage.getItem('user_location');
          if (savedLocation) {
            try {
              const loc = JSON.parse(savedLocation);
              setLocation(loc);
            } catch (parseError) {
              console.error('Error parsing saved location:', parseError);
              localStorage.removeItem('user_location');
            }
          }
        }
      } catch (error: any) {
        console.error('Error loading user location:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadLocation();
  }, [userId]);

  const saveLocation = async (newLocation: LocationData) => {
    try {
      setLoading(true);
      setError(null);

      // Update state immediately
      setLocation(newLocation);
      
      // Save to localStorage immediately
      localStorage.setItem('user_location', JSON.stringify(newLocation));

      // Save to Supabase profile
      if (userId) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            lat: newLocation.lat,
            lng: newLocation.lng,
            location: newLocation.address,
            area: newLocation.area || null,
            pincode: newLocation.pincode || null,
            landmark: newLocation.landmark || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (error) {
          console.error('Error saving location to database:', error);
          // Don't throw here, localStorage is still updated
          setError('Location saved locally but failed to sync to server');
        }
      }
    } catch (error: any) {
      console.error('Error saving location:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearLocation = async () => {
    try {
      setLocation(null);
      localStorage.removeItem('user_location');
      
      if (userId) {
        await supabase
          .from('profiles')
          .update({
            lat: null,
            lng: null,
            location: null,
            area: null,
            pincode: null,
            landmark: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      }
    } catch (error: any) {
      console.error('Error clearing location:', error);
      setError(error.message);
    }
  };

  return {
    location,
    loading,
    error,
    saveLocation,
    clearLocation
  };
}
