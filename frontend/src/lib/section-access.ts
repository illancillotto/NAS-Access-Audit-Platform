export function hasSectionAccess(grantedSectionKeys: string[], sectionKey: string): boolean {
  return grantedSectionKeys.includes(sectionKey);
}
