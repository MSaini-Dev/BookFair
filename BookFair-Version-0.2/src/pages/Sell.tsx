import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import toast from 'react-hot-toast';
import LocationPicker from '@/components/LocationPicker';



interface FormData {
  title: string;
  description: string;
  author: string;
  category: string;
  book_type: 'author' | 'school';
  barcode: string;
  condition: string;
  price: string;
  location: string;
  isbn: string;
  school_name: string;
  school_lat: string;
  school_lng: string;
}

export default function Sell() {
  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    author: '',
    category: '',
    book_type: 'author',
    barcode: '',
    condition: '',
    price: '',
    location: '',
    isbn: '',
    school_name: '',
    school_lat: '',
    school_lng: ''
  });
  
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('location')
        .eq('id', user.id)
        .single();

      if (profile?.location) {
        setForm(prev => ({ ...prev, location: profile.location }));
      }
    };
    checkUser();
  }, [navigate]);

  const handleChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
    
    if (name === 'book_type' && value === 'author') {
      setForm(prev => ({ 
        ...prev, 
        school_name: '', 
        school_lat: '', 
        school_lng: '' 
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setForm(prev => ({
      ...prev,
      school_lat: location.lat.toString(),
      school_lng: location.lng.toString(),
      school_name: form.school_name || location.address // Keep existing school name or use address
    }));
    toast.success('Location selected successfully!');
  };


  const uploadImage = async (): Promise<string | null> => {
    if (!image) return null;
    
    const fileExt = image.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `book-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('book-images')
      .upload(filePath, image);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('book-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (form.book_type === 'school' && (!form.school_name || !form.school_lat || !form.school_lng)) {
      toast.error('Please provide school name and location for school books');
      return;
    }

    setLoading(true);
    
    try {
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage();
      }

      const bookData = {
        ...form,
        price: parseFloat(form.price),
        user_id: user.id,
        image_url: imageUrl,
        book_type: form.book_type,
        school_name: form.book_type === 'school' ? form.school_name : null,
        school_lat: form.book_type === 'school' ? parseFloat(form.school_lat) : null,
        school_lng: form.book_type === 'school' ? parseFloat(form.school_lng) : null
      };

      const { error } = await supabase
        .from('books')
        .insert([bookData]);

      if (error) throw error;

      toast.success('Book listed successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const authorBookCategories = [
    'Fiction', 'Non-Fiction', 'Biography', 'Self-Help', 'Art', 'Technology',
    'Business', 'Health', 'Travel', 'Cooking', 'Sports', 'Philosophy', 'Poetry'
  ];

  const schoolBookCategories = [
    'Mathematics', 'Science', 'English', 'History', 'Geography', 'Physics',
    'Chemistry', 'Biology', 'Computer Science', 'Economics', 'Psychology',
    'Engineering', 'Medical', 'Law', 'Management'
  ];

  const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">List Your Book</CardTitle>
          <p className="text-muted-foreground">Fill in the details to list your book for sale</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Book Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Book Type</label>
              <Tabs value={form.book_type} onValueChange={(value) => handleChange('book_type', value)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="author">General Books</TabsTrigger>
                  <TabsTrigger value="school">Academic Books</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Author *</label>
                <Input
                  value={form.author}
                  onChange={(e) => handleChange('author', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* School-specific fields */}
            {form.book_type === 'school' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">School/University Name *</label>
                  <Input
                    value={form.school_name}
                    onChange={(e) => handleChange('school_name', e.target.value)}
                    placeholder="Enter school/university name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">School/University Location *</label>
                  <div className="flex gap-2">
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <Input
                        value={form.school_lat}
                        onChange={(e) => handleChange('school_lat', e.target.value)}
                        placeholder="Latitude"
                        type="number"
                        step="any"
                        required
                        readOnly
                      />
                      <Input
                        value={form.school_lng}
                        onChange={(e) => handleChange('school_lng', e.target.value)}
                        placeholder="Longitude"
                        type="number"
                        step="any"
                        required
                        readOnly
                      />
                    </div>
                    <LocationPicker
                      onLocationSelect={handleLocationSelect}
                      defaultLocation={
                        form.school_lat && form.school_lng
                          ? { lat: parseFloat(form.school_lat), lng: parseFloat(form.school_lng) }
                          : undefined
                      }
                    />
                  </div>
                </div>
                
                {(form.school_lat && form.school_lng) && (
                  <Alert>
                    <AlertDescription>
                      Location selected: {parseFloat(form.school_lat).toFixed(6)}, {parseFloat(form.school_lng).toFixed(6)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <Select value={form.category} onValueChange={(value) => handleChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(form.book_type === 'school' ? schoolBookCategories : authorBookCategories).map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description *</label>
              <Textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe the book's condition, any highlights, missing pages, etc."
                rows={4}
                required
              />
            </div>

            {/* Condition and Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Condition *</label>
                <Select value={form.condition} onValueChange={(value) => handleChange('condition', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {conditions.map((condition) => (
                      <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price (₹) *</label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  placeholder="Enter price"
                  required
                />
              </div>
            </div>

            {/* Additional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">ISBN (optional)</label>
                <Input
                  value={form.isbn}
                  onChange={(e) => handleChange('isbn', e.target.value)}
                  placeholder="ISBN number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location *</label>
                <Input
                  value={form.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Your location"
                  required
                />
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Book Image</label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Book preview"
                    className="w-32 h-40 object-cover rounded border"
                  />
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full"
            >
              {loading ? 'Listing Book...' : 'List Book'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
