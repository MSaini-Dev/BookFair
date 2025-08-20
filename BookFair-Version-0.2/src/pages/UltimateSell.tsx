import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import EnhancedLocationPicker from "../components/EnhancedLocationPicker";
import { findMatchingSchools } from "../utils/advancedBookSearch";
import { toast } from "sonner";
import { Upload, X, MapPin, School, Star} from "lucide-react";
import { useUserLocation } from "../hooks/useUserLocation";
interface BookForm {
  title: string;
  description: string;
  author: string;
  category: string;
  book_type: "author" | "school";

  // Academic fields
  grade: string;
  subject: string;
  board: string;
  academic_year: string;
  publisher: string;
  edition_year: string;

  // Book details
  condition: string;
  price: string;
  original_price: string;
  negotiable: boolean;

  // Identification
  isbn: string;
  barcode: string;

  // Location
  lat: string;
  lng: string;
  location: string;
  area: string;
  pincode: string;
  landmark: string;

  // School specific
  school_name: string;
  school_id: string;
  school_lat: string;
  school_lng: string;
}

export default function UltimateSell() {
  const [form, setForm] = useState<BookForm>({
    title: "",
    description: "",
    author: "",
    category: "",
    book_type: "school",
    grade: "",
    subject: "",
    board: "CBSE",
    academic_year: new Date().getFullYear().toString(),
    publisher: "",
    edition_year: "",
    condition: "",
    price: "",
    original_price: "",
    negotiable: true,
    isbn: "",
    barcode: "",
    lat: "",
    lng: "",
    location: "",
    area: "",
    pincode: "",
    landmark: "",
    school_name: "",
    school_id: "",
    school_lat: "",
    school_lng: "",
  });

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [schoolSuggestions, setSchoolSuggestions] = useState<any[]>([]);
  const { location: userLocation, saveLocation } = useUserLocation(user?.id);
  const navigate = useNavigate();

  // Constants
  const grades = ["6", "7", "8", "9", "10", "11", "12"];
  const boards = ["CBSE", "ICSE", "State Board", "IB", "IGCSE"];
  const conditions = ["New", "Like New", "Good", "Fair", "Poor"];

  const authorBookCategories = [
    "Fiction",
    "Non-Fiction",
    "Biography",
    "Self-Help",
    "Art",
    "Technology",
    "Business",
    "Health",
    "Travel",
    "Cooking",
    "Sports",
    "Philosophy",
    "Poetry",
    "Romance",
    "Mystery",
    "Science Fiction",
    "Fantasy",
    "History",
  ];

  const schoolSubjects = {
    "6-8": [
      "Mathematics",
      "Science",
      "English",
      "Hindi",
      "Social Science",
      "Sanskrit",
      "Computer Science",
    ],
    "9-10": [
      "Mathematics",
      "Science",
      "English",
      "Hindi",
      "Social Science",
      "Sanskrit",
      "Computer Applications",
      "Physical Education",
    ],
    "11-12": [
      "Physics",
      "Chemistry",
      "Mathematics",
      "Biology",
      "English",
      "Hindi",
      "Computer Science",
      "Economics",
      "Business Studies",
      "Accountancy",
      "Political Science",
      "History",
      "Geography",
      "Psychology",
      "Sociology",
      "Physical Education",
    ],
  };

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);

      // Get user's profile with location
      // const { data: profile } = await supabase
      //   .from("profiles")
      //   .select("*")
      //   .eq("id", user.id)
      //   .single();

      if (userLocation) {
        setForm((prev) => ({
          ...prev,
          location: userLocation.address,
          lat: userLocation.lat.toString(),
          lng: userLocation.lng.toString(),
          area: userLocation.area || "",
          pincode: userLocation.pincode || "",
          landmark: userLocation.landmark || "",
        }));
      }
    };
    checkUser();
  }, [navigate, userLocation]);

  const handleChange = (name: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [name]: value }));

    // Reset school fields when switching to author books
    if (name === "book_type" && value === "author") {
      setForm((prev) => ({
        ...prev,
        grade: "",
        subject: "",
        board: "",
        school_name: "",
        school_id: "",
        school_lat: "",
        school_lng: "",
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    const validFiles = files.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum 5MB per image.`);
        return false;
      }
      return true;
    });

    setImages((prev) => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLocationSelect = async (location: any) => {
    const locationData = {
      lat: location.lat,
      lng: location.lng,
      address: location.address,
      area: location.area || "",
      pincode: location.pincode || "",
      landmark: location.landmark || "",
    };

    // Update form
    setForm((prev) => ({
      ...prev,
      lat: location.lat.toString(),
      lng: location.lng.toString(),
      location: location.address,
      area: location.area || "",
      pincode: location.pincode || "",
      landmark: location.landmark || "",
    }));

    // Save location persistently
    try {
      await saveLocation(locationData);
      toast.success("Location saved!");
    } catch (error) {
      console.error("Error saving location:", error);
      toast.error("Failed to save location");
    }
  };

  const handleSchoolSelect = async (school: any) => {
    setForm((prev) => ({
      ...prev,
      school_name: school.name,
      school_id: school.id,
      school_lat: school.lat.toString(),
      school_lng: school.lng.toString(),
    }));

    setSchoolSuggestions([]);
    toast.success("School selected successfully!");
  };

  const searchSchools = async () => {
    if (!form.school_name.trim() || !form.lat || !form.lng) return;

    try {
      const schools = await findMatchingSchools(
        form.school_name,
        parseFloat(form.lat),
        parseFloat(form.lng),
        form.pincode
      );
      setSchoolSuggestions(schools);
    } catch (error) {
      console.error("Error searching schools:", error);
    }
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const image of images) {
      const fileExt = image.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `book-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("book-images")
        .upload(filePath, image);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("book-images")
        .getPublicUrl(filePath);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!form.title || !form.author || !form.condition || !form.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (form.book_type === "school") {
      if (!form.grade || !form.subject) {
        toast.error("Grade and subject are required for school books");
        return;
      }
      if (!form.school_name) {
        toast.error("School name is required for school books");
        return;
      }
    }

    if (!form.lat || !form.lng) {
      toast.error("Please set your location");
      return;
    }
      if (images.length === 0) {
    toast.error("Please add at least one image");
    return;
  }

    setLoading(true);

    try {
      // Upload images
      const imageUrls = await uploadImages();

      // Prepare book data - ADD user_id here
      const bookData = {
        user_id: user.id, // This is the crucial addition
        title: form.title,
        description: form.description,
        author: form.author,
        category: form.category,
        book_type: form.book_type,
        grade: form.book_type === "school" ? form.grade : null,
        subject: form.book_type === "school" ? form.subject : null,
        board: form.book_type === "school" ? form.board : null,
        academic_year: form.academic_year,
        publisher: form.publisher,
        edition_year: form.edition_year ? parseInt(form.edition_year) : null,
        condition: form.condition,
        price: parseFloat(form.price),
        original_price: form.original_price
          ? parseFloat(form.original_price)
          : null,
        negotiable: form.negotiable,
        isbn: form.isbn,
        barcode: form.barcode,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        location: form.location,
        area: form.area,
        pincode: form.pincode,
        landmark: form.landmark,
        school_name: form.book_type === "school" ? form.school_name : null,
        school_id: form.school_id || null,
        school_lat: form.school_lat ? parseFloat(form.school_lat) : null,
        school_lng: form.school_lng ? parseFloat(form.school_lng) : null,
        image_url: imageUrls[0] || null,
        images: imageUrls,
      };

      const { error } = await supabase.from("books").insert([bookData]);

      if (error) throw error;

      toast.success("Book listed successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Full error:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSubjects = () => {
    if (form.book_type !== "school" || !form.grade) return [];

    const gradeNum = parseInt(form.grade);
    if (gradeNum >= 6 && gradeNum <= 8) return schoolSubjects["6-8"];
    if (gradeNum >= 9 && gradeNum <= 10) return schoolSubjects["9-10"];
    if (gradeNum >= 11 && gradeNum <= 12) return schoolSubjects["11-12"];

    return [];
  };
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(form.title && form.author && form.book_type);
      case 2:
        return form.book_type === "school"
          ? !!(form.grade && form.subject && form.school_name)
          : !!form.category;
      case 3:
        return !!(form.condition && form.price);
      case 4:
        return !!(form.lat && form.lng);
      case 5:
        console.log(images.length)
        return images.length > 0; // You can add validations for images if needed
      default:
        return false; // 👈 prevents skipping
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Upload className="h-6 w-6" />
            List Your Book
          </CardTitle>
          <p className="text-muted-foreground">
            Fill in the details to list your book for sale
          </p>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === step
                      ? "bg-primary text-primary-foreground"
                      : currentStep > step
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep > step ? "✓" : step}
                </div>
                {step < 5 && <div className="w-12 h-0.5 bg-muted mx-2" />}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Basic Information</h3>

                <Tabs
                  value={form.book_type}
                  onValueChange={(value) => handleChange("book_type", value)}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="school">📚 Academic Book</TabsTrigger>
                    <TabsTrigger value="author">📖 General Book</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                      value={form.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      placeholder="Enter book title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Author *</label>
                    <Input
                      value={form.author}
                      onChange={(e) => handleChange("author", e.target.value)}
                      placeholder="Enter author name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      handleChange("description", e.target.value)
                    }
                    placeholder="Describe the book's condition, content, any highlighting, etc."
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Academic Details or Category */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {form.book_type === "school" ? (
                  <>
                    <h3 className="text-lg font-semibold">Academic Details</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Grade *</label>
                        <Select
                          value={form.grade}
                          onValueChange={(value) =>
                            handleChange("grade", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {grades.map((grade) => (
                              <SelectItem key={grade} value={grade}>
                                Class {grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Subject *</label>
                        <Select
                          value={form.subject}
                          onValueChange={(value) =>
                            handleChange("subject", value)
                          }
                          disabled={!form.grade}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {getSubjects().map((subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Board</label>
                        <Select
                          value={form.board}
                          onValueChange={(value) =>
                            handleChange("board", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select board" />
                          </SelectTrigger>
                          <SelectContent>
                            {boards.map((board) => (
                              <SelectItem key={board} value={board}>
                                {board}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Academic Year
                        </label>
                        <Input
                          value={form.academic_year}
                          onChange={(e) =>
                            handleChange("academic_year", e.target.value)
                          }
                          placeholder="2024-25"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Edition Year
                        </label>
                        <Input
                          type="number"
                          value={form.edition_year}
                          onChange={(e) =>
                            handleChange("edition_year", e.target.value)
                          }
                          placeholder="2024"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Publisher</label>
                      <Input
                        value={form.publisher}
                        onChange={(e) =>
                          handleChange("publisher", e.target.value)
                        }
                        placeholder="NCERT, Arihant, etc."
                      />
                    </div>

                    {/* School Selection */}
                    <div className="space-y-4">
                      <label className="text-sm font-medium">
                        School/University *
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={form.school_name}
                          onChange={(e) =>
                            handleChange("school_name", e.target.value)
                          }
                          placeholder="Enter your school name"
                          required
                        />
                        <Button
                          type="button"
                          onClick={searchSchools}
                          variant="outline"
                        >
                          <School className="h-4 w-4" />
                        </Button>
                      </div>

                      {schoolSuggestions.length > 0 && (
                        <Card>
                          <CardContent className="p-4">
                            <p className="text-sm font-medium mb-2">
                              School suggestions:
                            </p>
                            {schoolSuggestions.map((school) => (
                              <div
                                key={school.id}
                                className="p-2 hover:bg-muted rounded cursor-pointer border mb-2"
                                onClick={() => handleSchoolSelect(school)}
                              >
                                <p className="font-medium">{school.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {school.area}, {school.pincode} •{" "}
                                  {school.distance.toFixed(1)}km away
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline">
                                    {Math.round(school.confidence * 100)}% match
                                  </Badge>
                                  {school.verified && <Badge>Verified</Badge>}
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold">Book Category</h3>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category *</label>
                      <Select
                        value={form.category}
                        onValueChange={(value) =>
                          handleChange("category", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {authorBookCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Publisher</label>
                      <Input
                        value={form.publisher}
                        onChange={(e) =>
                          handleChange("publisher", e.target.value)
                        }
                        placeholder="Publisher name"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3: Condition & Pricing */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Condition & Pricing</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Condition *</label>
                    <Select
                      value={form.condition}
                      onValueChange={(value) =>
                        handleChange("condition", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {conditions.map((condition) => (
                          <SelectItem key={condition} value={condition}>
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4" />
                              {condition}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Selling Price (₹) *
                    </label>
                    <Input
                      type="number"
                      value={form.price}
                      onChange={(e) => handleChange("price", e.target.value)}
                      placeholder="Enter selling price"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Original Price (₹)
                    </label>
                    <Input
                      type="number"
                      value={form.original_price}
                      onChange={(e) =>
                        handleChange("original_price", e.target.value)
                      }
                      placeholder="Original purchase price"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      checked={form.negotiable}
                      onCheckedChange={(checked) =>
                        handleChange("negotiable", checked)
                      }
                    />
                    <label className="text-sm font-medium">
                      Price Negotiable
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">ISBN</label>
                    <Input
                      value={form.isbn}
                      onChange={(e) => handleChange("isbn", e.target.value)}
                      placeholder="ISBN number"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Barcode</label>
                    <Input
                      value={form.barcode}
                      onChange={(e) => handleChange("barcode", e.target.value)}
                      placeholder="Barcode number"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Location */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Location Details</h3>

                <EnhancedLocationPicker
                  onLocationSelect={handleLocationSelect}
                  defaultLocation={
                    form.lat && form.lng
                      ? {
                          lat: parseFloat(form.lat),
                          lng: parseFloat(form.lng),
                        }
                      : undefined
                  }
                  trigger={
                    <Button type="button" variant="outline" className="w-full">
                      <MapPin className="h-4 w-4 mr-2" />
                      {form.lat && form.lng
                        ? "Update Location"
                        : "Set Your Location"}
                    </Button>
                  }
                />

                {form.lat && form.lng && (
                  <Alert>
                    <MapPin className="h-4 w-4" />
                    <AlertDescription>
                      Location set: {form.location}
                      <br />
                      Coordinates: {parseFloat(form.lat).toFixed(4)},{" "}
                      {parseFloat(form.lng).toFixed(4)}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pincode</label>
                    <Input
                      value={form.pincode}
                      onChange={(e) => handleChange("pincode", e.target.value)}
                      placeholder="110001"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Area</label>
                    <Input
                      value={form.area}
                      onChange={(e) => handleChange("area", e.target.value)}
                      placeholder="Connaught Place"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nearby Landmark</label>
                  <Input
                    value={form.landmark}
                    onChange={(e) => handleChange("landmark", e.target.value)}
                    placeholder="Metro Station, Mall, etc."
                  />
                </div>
              </div>
            )}

            {/* Step 5: Images & Review */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Images & Final Review</h3>

                <div className="space-y-4">
                  <label className="text-sm font-medium">
                    Book Images (Max 5)
                  </label>
                  <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload images or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, JPEG up to 5MB each
                      </p>
                    </label>
                  </div>

                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Review Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Listing Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Title</p>
                        <p className="font-medium">{form.title}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Author</p>
                        <p className="font-medium">{form.author}</p>
                      </div>
                    </div>

                    {form.book_type === "school" && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Grade</p>
                          <p className="font-medium">Class {form.grade}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Subject
                          </p>
                          <p className="font-medium">{form.subject}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Board</p>
                          <p className="font-medium">{form.board}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Condition
                        </p>
                        <Badge>{form.condition}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="font-medium text-lg text-primary">
                          ₹{form.price}
                        </p>
                      </div>
                    </div>

                    {form.school_name && (
                      <div>
                        <p className="text-sm text-muted-foreground">School</p>
                        <p className="font-medium">{form.school_name}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">
                        {form.location || form.area}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                >
                  Previous
                </Button>
              )}

              <div className="ml-auto">
                {currentStep < 5 ? (
                  <Button
                    type="button"
                    onClick={() =>
                      setCurrentStep((prev) => Math.min(prev + 1, 5))
                    }
                    disabled={!validateStep(currentStep)}
                  >
                    Next
                  </Button>
                ) : (
                  <Button type="submit" disabled={loading} className="min-w-32">
                    {loading ? "Publishing..." : "Publish Book"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
