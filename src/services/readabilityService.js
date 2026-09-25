/**
 * Readability Service - Computes Flesch-Kincaid Grade Level & Flesch Reading Ease
 * Demonstrates quantifiably how AI simplifies complex legal prose into plain English.
 */

// Count approximate syllables in an English word
export function countSyllables(word) {
  if (!word) return 0;
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length <= 3) return 1;

  // Common suffix adjustments
  const trimmed = cleaned
    .replace(/(?:[^laeiouy]|ed|es|e)$/, '')
    .replace(/^y/, '');

  const matches = trimmed.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

export function analyzeReadability(text) {
  if (!text || text.trim().length === 0) {
    return {
      wordCount: 0,
      sentenceCount: 0,
      syllableCount: 0,
      fleschReadingEase: 0,
      fleschKincaidGrade: 0,
      gradeLabel: 'N/A',
      estimatedReadTimeMinutes: 0,
    };
  }

  // Tokenize sentences
  const sentences = text
    .split(/[.!?]+[\s\r\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  // Tokenize words
  const words = text
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(w => w.length > 0);
  const wordCount = Math.max(1, words.length);

  // Count syllables
  let syllableCount = 0;
  for (const word of words) {
    syllableCount += countSyllables(word);
  }

  // Flesch Reading Ease: 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
  const wordsPerSentence = wordCount / sentenceCount;
  const syllablesPerWord = syllableCount / wordCount;

  let fleschReadingEase = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  fleschReadingEase = Math.round(Math.max(0, Math.min(100, fleschReadingEase)));

  // Flesch-Kincaid Grade Level: 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
  let fleschKincaidGrade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
  fleschKincaidGrade = Math.max(1, Math.round(fleschKincaidGrade * 10) / 10);

  let gradeLabel = 'Plain English (Middle School)';
  if (fleschKincaidGrade > 16) {
    gradeLabel = 'Post-Graduate / Dense Legalese';
  } else if (fleschKincaidGrade > 12) {
    gradeLabel = 'College Level / Formal Legal';
  } else if (fleschKincaidGrade > 9) {
    gradeLabel = 'High School Level';
  } else if (fleschKincaidGrade > 6) {
    gradeLabel = 'Conversational / Easy to Read';
  } else {
    gradeLabel = 'Elementary / Very Accessible';
  }

  const estimatedReadTimeMinutes = Math.max(1, Math.round((wordCount / 200) * 10) / 10);

  return {
    wordCount,
    sentenceCount,
    syllableCount,
    fleschReadingEase,
    fleschKincaidGrade,
    gradeLabel,
    estimatedReadTimeMinutes,
  };
}

export function compareReadability(originalStats, simplifiedStats) {
  const gradeReduction = Math.max(0, Math.round((originalStats.fleschKincaidGrade - simplifiedStats.fleschKincaidGrade) * 10) / 10);
  const easeImprovement = Math.max(0, simplifiedStats.fleschReadingEase - originalStats.fleschReadingEase);
  const percentageSimpler = originalStats.fleschKincaidGrade > 0
    ? Math.round((gradeReduction / originalStats.fleschKincaidGrade) * 100)
    : 0;

  return {
    gradeReduction,
    easeImprovement,
    percentageSimpler,
  };
}
