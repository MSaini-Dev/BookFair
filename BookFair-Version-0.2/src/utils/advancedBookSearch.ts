import { supabase } from '../services/supabase';
import type { BookWithProfile, SearchFilters, LocationData, SchoolMatch } from '../types/database.types';

// Haversine distance calculation
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Fuzzy string matching
function fuzzyMatch(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// Text relevance scoring
function calculateTextRelevance(query: string, title: string, author: string, description: string): number {
  if (!query) return 0;
  
  const queryLower = query.toLowerCase();
  let score = 0;
  
  // Title match (highest weight)
  if (title.toLowerCase().includes(queryLower)) {
    score += 10;
  } else {
    score += fuzzyMatch(queryLower, title.toLowerCase()) * 8;
  }
  
  // Author match
  if (author.toLowerCase().includes(queryLower)) {
    score += 6;
  } else {
    score += fuzzyMatch(queryLower, author.toLowerCase()) * 4;
  }
  
  // Description match
  if (description && description.toLowerCase().includes(queryLower)) {
    score += 3;
  }
  
  return score;
}

// Advanced book scoring algorithm
function calculateBookScore(
  book: BookWithProfile, 
  userLocation: LocationData,
  filters: SearchFilters
): number {
  let score = 0;
  
  // 1. Text relevance (if search query exists)
  if (filters.query) {
    score += calculateTextRelevance(
      filters.query,
      book.title,
      book.author,
      book.description || ''
    );
  }
  
  // 2. School matching (highest priority for school books)
  if (book.book_type === 'school' && filters.schoolName) {
    if (book.school_name === filters.schoolName) {
      score += 25; // Same school gets massive boost
    } else if (book.school_name && fuzzyMatch(book.school_name, filters.schoolName) > 0.8) {
      score += 15; // Similar school names
    }
  }
  
  // 3. Academic criteria matching
  if (filters.grade && book.grade === filters.grade) {
    score += 12;
  }
  
  if (filters.subject && book.subject?.toLowerCase().includes(filters.subject.toLowerCase())) {
    score += 10;
  }
  
  if (filters.board && book.board === filters.board) {
    score += 8;
  }
  
  // 4. Category matching
  if (filters.category && book.category === filters.category) {
    score += 6;
  }
  
  // 5. Condition scoring
  const conditionScores = {
    'New': 10,
    'Like New': 8,
    'Good': 6,
    'Fair': 4,
    'Poor': 2
  };
  score += conditionScores[book.condition] || 0;
  
  // 6. Price attractiveness
  if (book.price > 0) {
    // Lower prices get higher scores, but with diminishing returns
    score += Math.min(15, 1000 / book.price);
    
    // Negotiable books get small bonus
    if (book.negotiable) {
      score += 2;
    }
  }
  
  // 7. Seller reputation
  score += (book.profiles.rating || 3) * 3;
  if (book.profiles.verified_seller) {
    score += 5;
  }
  
  // 8. Book popularity
  score += Math.log(book.view_count + 1) * 0.5;
  score += book.favorite_count * 0.3;
  
  // 9. Distance penalty/bonus
  const bookLat = book.lat || book.school_lat || book.profiles.lat;
  const bookLng = book.lng || book.school_lng || book.profiles.lng;
  
  if (bookLat && bookLng && userLocation.lat && userLocation.lng) {
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      bookLat,
      bookLng
    );
    
    // Distance scoring with zones
    if (distance <= 1) {
      score += 10; // Same area
    } else if (distance <= 3) {
      score += 7; // Very close
    } else if (distance <= 5) {
      score += 4; // Close
    } else if (distance <= 10) {
      score += 2; // Nearby
    } else if (distance > 25) {
      score -= 3; // Too far penalty
    }
    
    book.distance = distance;
  }
  
  // 10. Freshness bonus
  const daysOld = (Date.now() - new Date(book.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysOld <= 7) {
    score += 3; // New listings get bonus
  }
  
  // 11. Featured/boosted books
  if (book.featured) {
    score += 8;
  }
  
  if (book.boost_expires_at && new Date(book.boost_expires_at) > new Date()) {
    score += 5;
  }
  
  return Math.max(0, score);
}

// Main search function
export async function advancedBookSearch(
  filters: SearchFilters,
  userLocation: LocationData,
  userId?: string,
  limit: number = 50,
  offset: number = 0
): Promise<BookWithProfile[]> {
  try {
    // Build the query with correct join syntax
let query = supabase
  .from('books')
  .select(`
  *,
  profiles!books_user_id_profiles_fkey(username, location, lat, lng, rating, verified_seller, avatar_url)
`)

  .eq('status', 'available');
      
    
    // Apply filters
    if (filters.bookType) {
      query = query.eq('book_type', filters.bookType);
    }
    
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    
    if (filters.condition) {
      query = query.eq('condition', filters.condition);
    }
    
    if (filters.grade) {
      query = query.eq('grade', filters.grade);
    }
    
    if (filters.subject) {
      query = query.ilike('subject', `%${filters.subject}%`);
    }
    
    if (filters.board) {
      query = query.eq('board', filters.board);
    }
    
    if (filters.minPrice) {
      query = query.gte('price', filters.minPrice);
    }
    
    if (filters.maxPrice) {
      query = query.lte('price', filters.maxPrice);
    }
    
    if (filters.negotiable !== undefined) {
      query = query.eq('negotiable', filters.negotiable);
    }
    
    if (filters.schoolName) {
      query = query.ilike('school_name', `%${filters.schoolName}%`);
    }
    
    // Text search across multiple fields
    if (filters.query) {
      query = query.or(
        `title.ilike.%${filters.query}%,author.ilike.%${filters.query}%,description.ilike.%${filters.query}%,school_name.ilike.%${filters.query}%`
      );
    }
    
    // Execute query
    const { data: books, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Query error:', error);
    throw error;
  }
    
        if (!books) return [];
    
    // Get user favorites if logged in
    let favoriteBookIds: string[] = [];
    if (userId) {
      const { data: favorites } = await supabase
        .from('favorites')
        .select('book_id')
        .eq('user_id', userId);
      
      favoriteBookIds = favorites?.map(f => f.book_id) || [];
    }
    
    // Score and filter books with proper type casting
    const scoredBooks = (books as BookWithProfile[])
      .map(book => ({
        ...book,
        score: calculateBookScore(book, userLocation, filters),
        is_favorited: favoriteBookIds.includes(book.id)
      }))
      .filter(book => {
        // Distance filtering
        if (filters.maxDistance && book.distance && book.distance > filters.maxDistance) {
          return false;
        }
        return true;
      });
    
    // Sort by multiple criteria
    return scoredBooks.sort((a, b) => {
      // 1. Same school books first (for school books)
      if (filters.schoolName && a.book_type === 'school' && b.book_type === 'school') {
        const aIsSchool = a.school_name === filters.schoolName;
        const bIsSchool = b.school_name === filters.schoolName;
        if (aIsSchool !== bIsSchool) {
          return aIsSchool ? -1 : 1;
        }
      }
      
      // 2. Featured books first
      if (a.featured !== b.featured) {
        return a.featured ? -1 : 1;
      }
      
      // 3. By score (higher is better)
      if (Math.abs(a.score - b.score) > 1) {
        return b.score - a.score;
      }
      
      // 4. By distance (closer is better)
      if (a.distance && b.distance && Math.abs(a.distance - b.distance) > 1) {
        return a.distance - b.distance;
      }
      
      // 5. By condition (better condition first)
      const conditionOrder = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
      const aCondition = conditionOrder.indexOf(a.condition);
      const bCondition = conditionOrder.indexOf(b.condition);
      if (aCondition !== bCondition) {
        return aCondition - bCondition;
      }
      
      // 6. By price (lower price first)
      return a.price - b.price;
    });
    
  } catch (error) {
    console.error('Advanced book search error:', error);
    return [];
  }
}

// School search and verification
export async function findMatchingSchools(
  schoolQuery: string,
  userLat: number,
  userLng: number,
  pincode?: string,
  maxDistance: number = 20
): Promise<SchoolMatch[]> {
  try {
    const { data: schools, error } = await supabase
      .from('school_clusters')
      .select('*')
      .or(
        `school_name.ilike.%${schoolQuery}%,normalized_name.ilike.%${schoolQuery}%`
      );
    
    if (error) throw error;
    if (!schools) return [];
    
    return schools
      .map(school => ({
        ...school,
        name: school.school_name,
        distance: calculateDistance(userLat, userLng, school.lat, school.lng),
        confidence: Math.max(
          fuzzyMatch(schoolQuery.toLowerCase(), school.school_name.toLowerCase()),
          fuzzyMatch(schoolQuery.toLowerCase(), school.normalized_name.toLowerCase())
        )
      }))
      .filter(school => {
        // Distance filter
        if (school.distance > maxDistance) return false;
        
        // Confidence filter
        if (school.confidence < 0.3) return false;
        
        // Pincode boost
        if (pincode && school.pincode === pincode) {
          school.confidence += 0.3;
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by confidence first, then distance
        if (Math.abs(a.confidence - b.confidence) > 0.1) {
          return b.confidence - a.confidence;
        }
        return a.distance - b.distance;
      })
      .slice(0, 10); // Return top 10 matches
    
  } catch (error) {
    console.error('School search error:', error);
    return [];
  }
}

// Track book view
export async function trackBookView(bookId: string, userId?: string, referrer?: string) {
  try {
    // Insert view record
    await supabase.from('book_views').insert({
      book_id: bookId,
      viewer_id: userId,
      referrer: referrer
    });
    
    // Update view count
    await supabase.rpc('increment_book_views', { book_id: bookId });
  } catch (error) {
    console.error('Error tracking book view:', error);
  }
}
