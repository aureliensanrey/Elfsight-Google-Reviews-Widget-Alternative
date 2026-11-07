import fs from 'fs';
import path from 'path';
import https from 'https';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACE_ID = process.env.PLACE_ID;

if (!API_KEY || !PLACE_ID) {
    console.error("Error: GOOGLE_PLACES_API_KEY and PLACE_ID environment variables are required.");
    process.exit(1);
}

const OUTPUT_DIR = path.resolve('public');
const OUTPUT_FILE = path.resolve(OUTPUT_DIR, 'reviews.json');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function fetchReviews() {
    // L'URL officielle et correcte pour récupérer les détails d'un lieu avec l'API Places (New)
    const url = `https://googleapis.com{PLACE_ID}`;

    const options = {
        method: 'GET',
        headers: {
            'X-Goog-Api-Key': API_KEY,
            // Requis par la nouvelle API : spécifie précisément les champs à renvoyer pour éviter les surcoûts
            'X-Goog-FieldMask': 'name,rating,userRatingCount,googleMapsUri,formattedAddress,reviews'
        }
    };

    const req = https.request(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const json = JSON.parse(data);

                if (json.error) {
                    console.error(`API Error: ${json.error.status} - ${json.error.message}`);
                    process.exit(1);
                }

                // Restructuration des clés selon le format de la nouvelle API (New)
                const result = {
                    name: json.name || '',
                    rating: json.rating || 0,
                    user_ratings_total: json.userRatingCount || 0,
                    url: json.googleMapsUri || '',
                    address: json.formattedAddress || '',
                    reviews: (json.reviews || []).map((review) => ({
                        author_name: review.authorAttribution?.displayName || 'Anonymous',
                        author_url: review.authorAttribution?.uri || '',
                        profile_photo_url: review.authorAttribution?.photoUri || '',
                        rating: review.rating || 0,
                        relative_time_description: review.relativePublishTimeDescription || '',
                        text: review.text?.text || '',
                        time: Math.floor(new Date(review.publishTime).getTime() / 1000),
                    })),
                    last_updated: new Date().toISOString(),
                };

                fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
                console.log(`Successfully saved reviews to ${OUTPUT_FILE}`);

            } catch (error) {
                console.error("Error parsing response:", error);
                process.exit(1);
            }
        });
    });

    req.on('error', (err) => {
        console.error("Network Error:", err);
        process.exit(1);
    });

    req.end();
}

fetchReviews();
