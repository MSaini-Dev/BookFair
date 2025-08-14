import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

export default function Sell() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    author: '',
    category: '',
    book_type: 'author', // 'author' or 'school'
    barcode: '',
    condition: '',
    price: '',
    location: '',
    isbn: '',
    // School-specific fields
    school_name: '',
    school_lat: '',
    school_lng: ''
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
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

      // Get user's location from profile
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    // Reset school fields when switching to author books
    if (name === 'book_type' && value === 'author') {
      setForm(prev => ({
        ...prev,
        schoolName: '',
        schoolLat: '',
        schoolLng: ''
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Get school coordinates
  const getSchoolLocation = async () => {
    if (!form.schoolName.trim()) {
      alert('Please enter school name first');
      return;
    }

    setLocationLoading(true);
    try {
      // Using a geocoding service (you'll need to implement this with your preferred provider)
      // For example, using OpenStreetMap Nominatim (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.schoolName + ' school')}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        setForm(prev => ({
          ...prev,
          schoolLat: data[0].lat,
          schoolLng: data[0].lon
        }));
        alert('School location found!');
      } else {
        alert('School location not found. Please enter coordinates manually.');
      }
    } catch (error) {
      alert('Error finding school location: ' + error.message);
    } finally {
      setLocationLoading(false);
    }
  };

  const uploadImage = async () => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (form.book_type === 'school' && (!form.school_name || !form.school_lat || !form.school_lng)) {
      alert('Please provide school name and location for school books');
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

      alert('Book listed successfully!');
      navigate('/dashboard');
    } catch (error) {
      alert(`Error: ${error.message}`);
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
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">List a Book</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Book Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Book Type *
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="book_type"
                value="author"
                checked={form.book_type === 'author'}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-gray-700 dark:text-gray-300">Author Book</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="book_type"
                value="school"
                checked={form.book_type === 'school'}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-gray-700 dark:text-gray-300">School Book</span>
            </label>
          </div>
        </div>

        {/* School-specific fields */}
        {form.book_type === 'school' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">School Book Information</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                School Name *
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  name="schoolName"
                  value={form.schoolName}
                  onChange={handleChange}
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter school name"
                  required={form.book_type === 'school'}
                />
                <button
                  type="button"
                  onClick={getSchoolLocation}
                  disabled={locationLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {locationLoading ? 'Finding...' : 'Find Location'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  School Latitude *
                </label>
                <input
                  type="number"
                  step="any"
                  name="schoolLat"
                  value={form.schoolLat}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., 40.7128"
                  required={form.book_type === 'school'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  School Longitude *
                </label>
                <input
                  type="number"
                  step="any"
                  name="schoolLng"
                  value={form.schoolLng}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., -74.0060"
                  required={form.book_type === 'school'}
                />
              </div>
            </div>
          </div>
        )}

        {/* Rest of the form fields */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Book Title *
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Author *
          </label>
          <input
            type="text"
            name="author"
            value={form.author}
            onChange={handleChange}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Category *
          </label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select Category</option>
            {(form.book_type === 'author' ? authorBookCategories : schoolBookCategories).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Add other existing fields here (condition, price, description, etc.) */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Condition *
          </label>
          <select
            name="condition"
            value={form.condition}
            onChange={handleChange}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select Condition</option>
            {conditions.map(condition => (
              <option key={condition} value={condition}>{condition}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Price *
          </label>
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={handleChange}
            step="0.01"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Book Image
          </label>
          <input
            type="file"
            onChange={handleImageChange}
            accept="image/*"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          {imagePreview && (
            <img src={imagePreview} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded" />
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Listing Book...' : 'List Book'}
        </button>
      </form>
    </div>
  );
}
