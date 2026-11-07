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
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=reviews,user_ratings_total,rating,name,url,formatted_address&key=${API_KEY}&reviews_sort=newest`;

    https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const json = JSON.parse(data);

                if (json.status !== 'OK') {
                    console.error(`API Error: ${json.status} - ${json.error_message || 'No error message'}`);
                    process.exit(1);
                }

                // Minify and save only necessary data
                const result = {
                    name: json.result.name,
                    rating: json.result.rating,
                    user_ratings_total: json.result.user_ratings_total,
                    url: json.result.url,
                    address: json.result.formatted_address,
                    reviews: json.result.reviews.map((review) => ({
                        author_name: review.author_name,
                        author_url: review.author_url,
                        profile_photo_url: review.profile_photo_url,
                        rating: review.rating,
                        relative_time_description: review.relative_time_description,
                        text: review.text,
                        time: review.time,
                    })),
                    last_updated: new Date().toISOString(),
                };

                fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result));
                console.log(`Successfully saved reviews to ${OUTPUT_FILE}`);

            } catch (error) {
                console.error("Error parsing response:", error);
                process.exit(1);
            }
        });

    }).on('error', (err) => {
        console.error("Network Error:", err);
        process.exit(1);
    });
}

fetchReviews();
