// Restaurant Recommendation Engine
// Content-Based Filtering using TF-IDF and Cosine Similarity

// Global variables
let allRestaurants = [];
let filteredRestaurants = [];
let recommendedRestaurants = [];

// Initialize the application
function init() {
    allRestaurants = [...restaurantsData];
    setupEventListeners();
    calculateDistances();
}

// Setup event listeners
function setupEventListeners() {
    // Update slider values
    document.getElementById('ratingSlider').addEventListener('input', function() {
        document.getElementById('ratingValue').textContent = this.value;
    });
    
    document.getElementById('costSlider').addEventListener('input', function() {
        document.getElementById('costValue').textContent = this.value;
    });
    
    // Recommend button
    document.getElementById('recommendBtn').addEventListener('click', getRecommendations);
}

// Calculate distances from user location using Haversine formula
function calculateDistances() {
    allRestaurants.forEach(restaurant => {
        restaurant.distance = haversineDistance(
            userLocation.latitude,
            userLocation.longitude,
            restaurant.latitude,
            restaurant.longitude
        );
    });
}

// Haversine formula to calculate distance between two points
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

// Main recommendation function
function getRecommendations() {
    // Show loading indicator
    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('welcomeSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
    
    // Simulate processing time for better UX
    setTimeout(() => {
        processRecommendations();
    }, 800);
}

function processRecommendations() {
    // Get user preferences
    const selectedCuisines = Array.from(document.getElementById('cuisineSelect').selectedOptions)
        .map(option => option.value);
    const location = document.getElementById('locationInput').value.toLowerCase();
    const minRating = parseFloat(document.getElementById('ratingSlider').value);
    const maxCost = parseInt(document.getElementById('costSlider').value);
    const vegFilter = document.getElementById('vegFilter').value;
    const deliveryFilter = document.getElementById('deliveryFilter').checked;
    const bookingFilter = document.getElementById('bookingFilter').checked;
    const nearbyMode = document.getElementById('nearbyMode').checked;
    const sortBy = document.getElementById('sortBy').value;
    
    // Filter restaurants based on criteria
    filteredRestaurants = allRestaurants.filter(restaurant => {
        // Rating filter
        if (restaurant.rating < minRating) return false;
        
        // Cost filter
        if (restaurant.cost_for_two > maxCost) return false;
        
        // Location filter
        if (location && !restaurant.location.toLowerCase().includes(location)) return false;
        
        // Veg filter
        if (vegFilter === 'veg' && !restaurant.veg) return false;
        if (vegFilter === 'nonveg' && restaurant.veg) return false;
        
        // Delivery filter
        if (deliveryFilter && !restaurant.delivery) return false;
        
        // Booking filter
        if (bookingFilter && !restaurant.table_booking) return false;
        
        // Nearby mode filter (within 5km)
        if (nearbyMode && restaurant.distance > 5) return false;
        
        return true;
    });
    
    // If no restaurants match filters
    if (filteredRestaurants.length === 0) {
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('noResults').style.display = 'block';
        return;
    }
    
    // Calculate similarity scores using content-based filtering
    const userPreferences = {
        cuisines: selectedCuisines,
        location: location,
        rating: minRating,
        cost: maxCost
    };
    
    recommendedRestaurants = filteredRestaurants.map(restaurant => {
        const similarity = calculateSimilarity(restaurant, userPreferences);
        return { ...restaurant, similarity };
    });
    
    // Sort restaurants based on user preference
    sortRestaurants(sortBy);
    
    // Display results
    displayRecommendations();
    displayAnalytics();
    
    // Hide loading, show results
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('resultsCount').textContent = 
        `Found ${recommendedRestaurants.length} restaurants matching your preferences`;
}

// Calculate similarity score using TF-IDF inspired approach
function calculateSimilarity(restaurant, preferences) {
    let score = 0;
    let maxScore = 0;
    
    // Cuisine similarity (weight: 40%)
    const cuisineWeight = 0.4;
    maxScore += cuisineWeight;
    if (preferences.cuisines.length > 0) {
        const cuisineMatches = restaurant.cuisines.filter(cuisine => 
            preferences.cuisines.includes(cuisine)
        ).length;
        score += (cuisineMatches / preferences.cuisines.length) * cuisineWeight;
    } else {
        // If no cuisine preference, give some default score
        score += cuisineWeight * 0.5;
    }
    
    // Rating similarity (weight: 25%)
    const ratingWeight = 0.25;
    maxScore += ratingWeight;
    const ratingScore = restaurant.rating / 5.0; // Normalize to 0-1
    score += ratingScore * ratingWeight;
    
    // Cost similarity (weight: 20%)
    const costWeight = 0.2;
    maxScore += costWeight;
    const costScore = 1 - (restaurant.cost_for_two / 200); // Normalize (assuming max $200)
    score += Math.max(0, costScore) * costWeight;
    
    // Review text similarity (weight: 15%)
    const reviewWeight = 0.15;
    maxScore += reviewWeight;
    if (preferences.cuisines.length > 0) {
        const reviewText = restaurant.reviews.toLowerCase();
        const matchCount = preferences.cuisines.filter(cuisine => 
            reviewText.includes(cuisine.toLowerCase())
        ).length;
        score += (matchCount / preferences.cuisines.length) * reviewWeight;
    } else {
        score += reviewWeight * 0.5;
    }
    
    // Normalize to percentage
    return Math.round((score / maxScore) * 100);
}

// Sort restaurants based on criteria
function sortRestaurants(sortBy) {
    switch(sortBy) {
        case 'rating':
            recommendedRestaurants.sort((a, b) => b.rating - a.rating);
            break;
        case 'cost':
            recommendedRestaurants.sort((a, b) => a.cost_for_two - b.cost_for_two);
            break;
        case 'distance':
            recommendedRestaurants.sort((a, b) => a.distance - b.distance);
            break;
        case 'similarity':
        default:
            recommendedRestaurants.sort((a, b) => b.similarity - a.similarity);
            break;
    }
}

// Display restaurant recommendations
function displayRecommendations() {
    const container = document.getElementById('restaurantCards');
    container.innerHTML = '';
    
    // Limit to top 12 recommendations
    const topRestaurants = recommendedRestaurants.slice(0, 12);
    
    topRestaurants.forEach(restaurant => {
        const card = createRestaurantCard(restaurant);
        container.appendChild(card);
    });
}

// Create restaurant card element
function createRestaurantCard(restaurant) {
    const card = document.createElement('div');
    card.className = 'restaurant-card';
    
    // Generate recommendation reason
    const reason = generateRecommendationReason(restaurant);
    
    card.innerHTML = `
        <img src="${restaurant.image_url}" alt="${restaurant.name}" class="restaurant-image" loading="lazy">
        <div class="restaurant-content">
            <div class="restaurant-header">
                <div>
                    <h3 class="restaurant-name">${restaurant.name}</h3>
                    <p class="restaurant-location">📍 ${restaurant.location}</p>
                </div>
                <div class="restaurant-rating">⭐ ${restaurant.rating}</div>
            </div>
            
            <div class="restaurant-details">
                <div class="detail-row">
                    <span class="detail-label">Cost for two:</span>
                    <span>$${restaurant.cost_for_two}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Distance:</span>
                    <span>${restaurant.distance} km</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Type:</span>
                    <span>${restaurant.veg ? '🥬 Vegetarian' : '🍖 Non-Vegetarian'}</span>
                </div>
            </div>
            
            <div class="cuisines-list">
                ${restaurant.cuisines.map(cuisine => 
                    `<span class="cuisine-tag">${cuisine}</span>`
                ).join('')}
            </div>
            
            <div class="similarity-score">
                <div class="score-label">Match Score: ${restaurant.similarity}%</div>
                <div class="score-bar">
                    <div class="score-fill" style="width: ${restaurant.similarity}%"></div>
                </div>
            </div>
            
            <div class="recommendation-reason">
                <div class="reason-title">💡 Why recommended?</div>
                <p class="reason-text">${reason}</p>
            </div>
            
            <div class="features-badges">
                ${restaurant.delivery ? '<span class="badge">🚚 Delivery</span>' : ''}
                ${restaurant.table_booking ? '<span class="badge">📅 Booking</span>' : ''}
            </div>
        </div>
    `;
    
    return card;
}

// Generate explanation for why restaurant was recommended
function generateRecommendationReason(restaurant) {
    const reasons = [];
    
    if (restaurant.rating >= 4.5) {
        reasons.push('highly rated');
    }
    
    const selectedCuisines = Array.from(document.getElementById('cuisineSelect').selectedOptions)
        .map(option => option.value);
    const matchingCuisines = restaurant.cuisines.filter(c => selectedCuisines.includes(c));
    if (matchingCuisines.length > 0) {
        reasons.push(`matches your preference for ${matchingCuisines.join(', ')} cuisine`);
    }
    
    if (restaurant.cost_for_two <= 35) {
        reasons.push('budget-friendly');
    }
    
    if (restaurant.distance <= 2) {
        reasons.push('nearby location');
    }
    
    if (reasons.length === 0) {
        return 'This restaurant fits your overall preferences and criteria.';
    }
    
    return `This restaurant is ${reasons.join(', ')}.`;
}

// Display analytics charts
function displayAnalytics() {
    displayCuisineDistribution();
    displayCostDistribution();
    displayTopRatedCuisines();
    displayRatingDistribution();
}

// Chart: Cuisine Distribution
function displayCuisineDistribution() {
    const cuisineCount = {};
    recommendedRestaurants.forEach(restaurant => {
        restaurant.cuisines.forEach(cuisine => {
            cuisineCount[cuisine] = (cuisineCount[cuisine] || 0) + 1;
        });
    });
    
    const sortedCuisines = Object.entries(cuisineCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    const ctx = document.getElementById('cuisineChart');
    if (ctx.chart) ctx.chart.destroy();
    
    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedCuisines.map(([cuisine]) => cuisine),
            datasets: [{
                label: 'Number of Restaurants',
                data: sortedCuisines.map(([, count]) => count),
                backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// Chart: Cost Distribution
function displayCostDistribution() {
    const costRanges = {
        '$0-$25': 0,
        '$26-$40': 0,
        '$41-$60': 0,
        '$61+': 0
    };
    
    recommendedRestaurants.forEach(restaurant => {
        if (restaurant.cost_for_two <= 25) costRanges['$0-$25']++;
        else if (restaurant.cost_for_two <= 40) costRanges['$26-$40']++;
        else if (restaurant.cost_for_two <= 60) costRanges['$41-$60']++;
        else costRanges['$61+']++;
    });
    
    const ctx = document.getElementById('costChart');
    if (ctx.chart) ctx.chart.destroy();
    
    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(costRanges),
            datasets: [{
                label: 'Number of Restaurants',
                data: Object.values(costRanges),
                backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// Chart: Top Rated Cuisines
function displayTopRatedCuisines() {
    const cuisineRatings = {};
    const cuisineCounts = {};
    
    recommendedRestaurants.forEach(restaurant => {
        restaurant.cuisines.forEach(cuisine => {
            if (!cuisineRatings[cuisine]) {
                cuisineRatings[cuisine] = 0;
                cuisineCounts[cuisine] = 0;
            }
            cuisineRatings[cuisine] += restaurant.rating;
            cuisineCounts[cuisine]++;
        });
    });
    
    const avgRatings = Object.keys(cuisineRatings).map(cuisine => ({
        cuisine,
        rating: cuisineRatings[cuisine] / cuisineCounts[cuisine]
    })).sort((a, b) => b.rating - a.rating).slice(0, 6);
    
    const ctx = document.getElementById('ratingChart');
    if (ctx.chart) ctx.chart.destroy();
    
    ctx.chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: avgRatings.map(item => `${item.cuisine} (${item.rating.toFixed(1)})`),
            datasets: [{
                data: avgRatings.map(item => item.rating),
                backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Chart: Rating Distribution
function displayRatingDistribution() {
    const ratingRanges = {
        '0-2': 0,
        '2-3': 0,
        '3-4': 0,
        '4-4.5': 0,
        '4.5-5': 0
    };
    
    recommendedRestaurants.forEach(restaurant => {
        if (restaurant.rating < 2) ratingRanges['0-2']++;
        else if (restaurant.rating < 3) ratingRanges['2-3']++;
        else if (restaurant.rating < 4) ratingRanges['3-4']++;
        else if (restaurant.rating < 4.5) ratingRanges['4-4.5']++;
        else ratingRanges['4.5-5']++;
    });
    
    const ctx = document.getElementById('avgRatingChart');
    if (ctx.chart) ctx.chart.destroy();
    
    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(ratingRanges).map(range => `${range} ⭐`),
            datasets: [{
                label: 'Number of Restaurants',
                data: Object.values(ratingRanges),
                backgroundColor: ['#B4413C', '#FFC185', '#D2BA4C', '#5D878F', '#1FB8CD']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}