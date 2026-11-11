export interface ErrorEntry {
  fa: string;
  en: string;
  category: string;
  retryable: boolean;
  hint?: string;
}

export interface Doc {
  id: string;
  title: string;
  tags: string[];
  body: string;
}

export interface Corpus {
  docs: Map<string, Doc>;
  errors: Record<string, ErrorEntry>;
  sections: Section[];
}

export interface Section {
  docId: string;
  docTitle: string;
  heading: string;
  text: string;
  head: string; // normalized title + heading + tags (weighted higher)
  body: string; // normalized text
}

export interface SearchHit {
  docId: string;
  title: string;
  heading: string;
  snippet: string;
  score: number;
}
