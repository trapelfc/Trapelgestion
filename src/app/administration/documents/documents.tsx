export const getReferencedDocuments = (): ReferencedDocument[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('TRAPEL_FC_REFERENCED_DOCUMENTS_DATA');
  return stored ? JSON.parse(stored) : [];
};
