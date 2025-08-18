import { supabase } from '../services/supabase';

interface BookSearchParams {
  schoolName?: string;
  schoolId?: string;
  userLat: number;
  userLng: number;
  grade?: string;
  subject?: string;
  query?: string;
  condition?: string;
  maxDistance?: number;
}

interface BookScore {
  id: string;
  title: string;
  author: string;
  price: number;
  condition: string;
  distance: number;
  sellerRating: number;
  score: number;
  matchReason: string;
  schoolMatch: boolean;
}

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

// Text matching score for search queries
function textMatchScore(query: string, text: string): number {
  if (!query || !text) return 0;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match
  if (textLower.includes(queryLower)) {
    return 1.0;
  }
  
  // Word matching
  const queryWords = queryLower.split(' ');
  const textWords = textLower.split(' ');
  let matches = 0;
  
  for (const queryWord of queryWords) {
    for (const textWord of textWords) {
      if (textWord.includes(queryWord) || queryWord.includes(textWord)) {
        matches++;
        break;
      }
    }
  }
  
  return matches / queryWords.length;
}

// Calculate comprehensive book score
function calculateBookScore(book: any, params: BookSearchParams): number {
  let score = 0;
  let reasons: string[] = [];

  // 1. Text relevance (if search query provided)
  if (params.query) {
    const titleScore = textMatchScore(params.query, book.title) * 10;
    const authorScore = textMatchScore(params.query, book.author) * 5;
    score += titleScore + authorScore;
    
    if (titleScore > 5) reasons.push('Title match');
    if (authorScore > 2) reasons.push('Author match');
  }

  // 2. School proximity bonus
  if (book.school_name === params.schoolName) {
    score += 15;
    reasons.push('Same school');
  }

  // 3. Grade/Subject match
  if (params.grade && book.grade === params.grade) {
    score += 10;
    reasons.push('Grade match');
  }
  
  if (params.subject && book.subject?.toLowerCase().includes(params.subject.toLowerCase())) {
    score += 8;
    reasons.push('Subject match');
  }

  // 4. Condition scoring (5=New, 4=Like New, 3=Good, 2=Fair, 1=Poor)
  const conditionMap: Record<string, number> = {
    'New': 5,
    'Like New': 4,
    'Good': 3,
    'Fair': 2,
    'Poor': 1
  };
  score += (conditionMap[book.condition] || 1) * 2;

  // 5. Price attractiveness (lower price = higher score, but with diminishing returns)
  if (book.price > 0) {
    score += Math.min(20, 500 / book.price);
  }

  // 6. Seller reputation
  score += (book.profiles?.rating || 3) * 2;
  if (book.profiles?.verified_seller) {
    score += 3;
    reasons.push('Verified seller');
  }

  // 7. Distance penalty (closer = better)
  const distance = calculateDistance(
    params.userLat, 
    params.userLng, 
    book.profiles?.lat || book.lat, 
    book.profiles?.lng || book.lng
  );
  
  if (distance <= 2) {
    score += 5;
    reasons.push('Very close');
  } else if (distance <= 5) {
    score += 3;
    reasons.push('Nearby');
  } else if (distance > 20) {
    score -= 5; // Penalty for very far books
  }

  return score;
}

// Main book search function
export async function searchBooksWithLocation(params: BookSearchParams): Promise<BookScore[]> {
  try {
    // Build query based on parameters
    let query = supabase
      .from('books')
      .select(`
        *,
        profiles:user_id (
          username, 
          location, 
          lat, 
          lng, 
          rating, 
          verified_seller
        )
      `);

    // Apply filters
    if (params.grade) {
      query = query.eq('grade', params.grade);
    }
    
    if (params.subject) {
      query = query.ilike('subject', `%${params.subject}%`);
    }
    
    if (params.condition) {
      query = query.eq('condition', params.condition);
    }
    
    if (params.query) {
      query = query.or(
        `title.ilike.%${params.query}%,author.ilike.%${params.query}%,description.ilike.%${params.query}%`
      );
    }

    const { data: books, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    if (!books) return [];

    // Calculate scores and distances for each book
    const scoredBooks: BookScore[] = books.map(book => {
      const distance = calculateDistance(
        params.userLat,
        params.userLng,
        book.profiles?.lat || book.lat || 0,
        book.profiles?.lng || book.lng || 0
      );
      
      const score = calculateBookScore(book, params);
      const schoolMatch = book.school_name === params.schoolName;
      
      let matchReason = '';
      if (schoolMatch) matchReason = 'Same school';
      else if (distance <= 2) matchReason = 'Very close seller';
      else if (distance <= 5) matchReason = 'Nearby seller';
      else matchReason = 'Available';

      return {
        id: book.id,
        title: book.title,
        author: book.author,
        price: book.price,
        condition: book.condition,
        distance,
        sellerRating: book.profiles?.rating || 3,
        score,
        matchReason,
        schoolMatch,
        ...book // Include all other book data
      };
    });

    // Filter by distance if specified
    const filteredBooks = params.maxDistance 
      ? scoredBooks.filter(book => book.distance <= params.maxDistance!)
      : scoredBooks;

    // Sort by multiple criteria
    return filteredBooks.sort((a, b) => {
      // 1. Same school books first
      if (a.schoolMatch !== b.schoolMatch) {
        return a.schoolMatch ? -1 : 1;
      }
      
      // 2. Then by score (higher is better)
      if (Math.abs(a.score - b.score) > 2) {
        return b.score - a.score;
      }
      
      // 3. Then by distance (closer is better)
      if (Math.abs(a.distance - b.distance) > 1) {
        return a.distance - b.distance;
      }
      
      // 4. Finally by condition and price
      const aConditionScore = ['Poor', 'Fair', 'Good', 'Like New', 'New'].indexOf(a.condition);
      const bConditionScore = ['Poor', 'Fair', 'Good', 'Like New', 'New'].indexOf(b.condition);
      
      if (aConditionScore !== bConditionScore) {
        return bConditionScore - aConditionScore;
      }
      
      // 5. Lower price wins
      return a.price - b.price;
    });

  } catch (error) {
    console.error('Error searching books:', error);
    return [];
  }
}

// School verification function
export async function verifySchoolMatch(
  schoolName: string,
  userLat: number,
  userLng: number,
  userPincode?: string,
  userLandmark?: string
): Promise<boolean> {
  try {
    // Query potential school matches
    const { data: schools } = await supabase
      .from('school_clusters')
      .select('*')
      .ilike('normalized_name', `%${schoolName.toLowerCase()}%`);
    
    if (!schools || schools.length === 0) return false;
    
    for (const school of schools) {
      // 1. Exact pincode match
      if (userPincode && school.pincode === userPincode) {
        return true;
      }
      
      // 2. Distance check (within 1km for schools)
      const distance = calculateDistance(
        userLat, userLng, school.lat, school.lng
      );
      
      if (distance <= 1) {
        return true;
      }
      
      // 3. Landmark match
      if (userLandmark && school.landmarks) {
        const hasLandmarkMatch = school.landmarks.some((landmark: string) =>
          landmark.toLowerCase().includes(userLandmark.toLowerCase()) ||
          userLandmark.toLowerCase().includes(landmark.toLowerCase())
        );
        
        if (hasLandmarkMatch && distance <= 3) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying school:', error);
    return false;
  }
}
