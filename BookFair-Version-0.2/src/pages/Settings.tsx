import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import toast from 'react-hot-toast';
import type { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

// In Settings.tsx, fix the theme application logic:
const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
  const root = document.documentElement;
  
  if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }
  
  // Store theme in localStorage for persistence
  localStorage.setItem('theme', newTheme);
};

// Fix the useEffect for theme initialization:
useEffect(() => {
  const fetchUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) {
        navigate('/auth');
        return;
      }

      setUser(user);

      // Fetch or create profile
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const newProfile = {
          id: user.id,
          username: user.email?.split('@')[0] || 'user',
          theme: 'system' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (createError) throw createError;
        profile = createdProfile;
      } else if (profileError) {
        throw profileError;
      }

      if (profile) {
        setProfile(profile);
        
        // Initialize theme from profile or localStorage
        const savedTheme = profile.theme || localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system';
        setTheme(savedTheme);
        applyTheme(savedTheme);
      }
    } catch (error: any) {
      console.error('Error fetching user:', error);
      toast.error('Failed to load user settings');
    } finally {
      setLoading(false);
    }
  };

  fetchUser();
}, [navigate]);


  const updateTheme = async (newTheme: 'light' | 'dark' | 'system') => {
    if (saving) return;
    
    setSaving(true);
    try {
      // Update UI immediately
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
      applyTheme(newTheme);

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            theme: newTheme,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (error) throw error;
        
        // Update local profile state
        setProfile(prev => prev ? { ...prev, theme: newTheme } : null);
        toast.success('Theme updated successfully!');
      }
    } catch (error: any) {
      toast.error('Failed to save theme preference');
      console.error('Error updating theme:', error);
      
      // Revert on error
      const previousTheme = profile?.theme || 'system';
      setTheme(previousTheme);
      localStorage.setItem('theme', previousTheme);
      applyTheme(previousTheme);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear(); // Clear all local storage
      navigate('/');
    } catch (error: any) {
      toast.error('Error signing out');
      console.error('Sign out error:', error);
    }
  };

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme(theme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and settings</p>
        </div>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Appearance
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose your preferred theme. Current theme: <Badge variant="outline">{theme}</Badge>
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium">Theme</label>
              <Select value={theme} onValueChange={updateTheme} disabled={saving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Username</label>
              <p className="text-sm text-muted-foreground">{profile?.username || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <p className="text-sm text-muted-foreground">{profile?.location || 'Not set'}</p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleSignOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
