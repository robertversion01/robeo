export type PrivacyDetailBlock = {
  id?: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  why?: string;
  dataCategories?: string[];
  legalBasis?: string;
  retention?: string;
};

export type PrivacySection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  subsections?: PrivacyDetailBlock[];
};
