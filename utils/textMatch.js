const fs = require("fs");
const path = require("path");

/**
 * Calculate Levenshtein distance between two strings
 *
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} The edit distance between the strings
 */
function levenshteinDistance(a, b) {
  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate word frequency similarity between two texts
 *
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} Similarity score (0-1)
 */
function wordFrequencySimilarity(text1, text2) {
  // Tokenize and count word frequencies
  const getWordFreq = (text) => {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 0);

    const freq = {};
    words.forEach((word) => {
      freq[word] = (freq[word] || 0) + 1;
    });

    return freq;
  };

  const freq1 = getWordFreq(text1);
  const freq2 = getWordFreq(text2);

  // Get all unique words
  const allWords = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);

  // Calculate cosine similarity
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  allWords.forEach((word) => {
    const count1 = freq1[word] || 0;
    const count2 = freq2[word] || 0;

    dotProduct += count1 * count2;
    mag1 += count1 * count1;
    mag2 += count2 * count2;
  });

  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);

  if (mag1 === 0 || mag2 === 0) return 0;

  return dotProduct / (mag1 * mag2);
}

/**
 * Find similar documents to the given text
 *
 * @param {string} text - The text to compare
 * @returns {Array} Array of matching documents with similarity scores
 */
function findSimilarDocuments(text) {
  const docsDir = path.join(__dirname, "..", "stored_documents");
  const matches = [];

  // Ensure directory exists
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
    return matches; // Return empty if no docs yet
  }

  // Get all documents
  const files = fs.readdirSync(docsDir);

  files.forEach((file) => {
    try {
      const filePath = path.join(docsDir, file);
      const docContent = fs.readFileSync(filePath, "utf8");

      // Calculate similarity score (weighted combination)
      const levDistance = levenshteinDistance(
        text.slice(0, 1000),
        docContent.slice(0, 1000)
      );
      const levSimilarity =
        1 - levDistance / Math.max(text.length, docContent.length);

      const freqSimilarity = wordFrequencySimilarity(text, docContent);

      // Combined score (70% word frequency, 30% Levenshtein)
      const similarityScore = freqSimilarity * 0.7 + levSimilarity * 0.3;

      // Only include if similarity is significant
      if (similarityScore > 0.3) {
        matches.push({
          filename: file,
          path: filePath,
          similarity: similarityScore.toFixed(2),
          excerpt: docContent.slice(0, 200) + "...",
        });
      }
    } catch (err) {
      console.error(`Error processing file ${file}:`, err);
    }
  });

  // Sort by similarity (highest first)
  return matches.sort((a, b) => b.similarity - a.similarity);
}

module.exports = {
  findSimilarDocuments,
  levenshteinDistance,
  wordFrequencySimilarity,
};
