import type { EffectivePermission } from "@/types/api";

export type SourceToken = {
  type: "user" | "group";
  name: string;
  level: string;
  effect: "allow" | "deny";
};

const TOKEN_PATTERN = /^(user|group):([^:]+):([^:]+):(allow|deny)$/;

function splitSourceSummary(sourceSummary: string): string[] {
  return sourceSummary
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function getLevelRank(level: string): number {
  const normalized = level.trim().toLowerCase();

  if (normalized.includes("write")) {
    return 2;
  }

  if (normalized.includes("read")) {
    return 1;
  }

  return 0;
}

export function parseSourceTokens(sourceSummary: string): SourceToken[] {
  const normalizedSource = sourceSummary.trim();

  if (!normalizedSource || normalizedSource === "no-match") {
    return [];
  }

  return splitSourceSummary(normalizedSource).flatMap((token) => {
    const match = TOKEN_PATTERN.exec(token);

    if (!match) {
      return [];
    }

    return [
      {
        type: match[1] as SourceToken["type"],
        name: match[2],
        level: match[3],
        effect: match[4] as SourceToken["effect"],
      },
    ];
  });
}

export function extractGroups(sourceSummary: string): string[] {
  return Array.from(
    new Set(
      parseSourceTokens(sourceSummary)
        .filter((token) => token.type === "group")
        .map((token) => token.name),
    ),
  );
}

export function isMultiSourceAnomaly(sourceSummary: string): boolean {
  const tokens = parseSourceTokens(sourceSummary);

  if (tokens.length === 0) {
    return false;
  }

  const distinctGroups = new Set(
    tokens.filter((token) => token.type === "group").map((token) => token.name),
  );

  if (distinctGroups.size >= 2) {
    return true;
  }

  const userTokens = tokens.filter((token) => token.type === "user");
  const groupTokens = tokens.filter((token) => token.type === "group");

  if (userTokens.length > 0 && groupTokens.length > 0) {
    const distinctLevels = new Set(tokens.map((token) => `${token.level}:${token.effect}`));
    return distinctLevels.size >= 2;
  }

  return false;
}

export function hasMultiGroupPermissions(permissions: EffectivePermission[]): boolean {
  return new Set(permissions.flatMap((permission) => extractGroups(permission.source_summary))).size >= 2;
}

export function getAnomalousPermissions(
  permissions: EffectivePermission[],
): EffectivePermission[] {
  return permissions.filter((permission) => {
    if (isMultiSourceAnomaly(permission.source_summary)) {
      return true;
    }

    if (!permission.can_write) {
      return false;
    }

    const currentGroups = extractGroups(permission.source_summary);

    if (currentGroups.length !== 1) {
      return false;
    }

    return permissions.some((candidate) => {
      if (candidate.id === permission.id) {
        return false;
      }

      if (candidate.share_id !== permission.share_id || candidate.can_write || candidate.is_denied) {
        return false;
      }

      const candidateGroups = extractGroups(candidate.source_summary);
      return candidateGroups.length === 1 && candidateGroups[0] !== currentGroups[0];
    });
  });
}

export function getHighestPrioritySourceIndexes(sourceSummary: string): number[] {
  const tokens = parseSourceTokens(sourceSummary);

  if (tokens.length === 0) {
    return [];
  }

  const groupIndexes = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.type === "group");

  const candidates = groupIndexes.length > 0 ? groupIndexes : tokens.map((token, index) => ({ token, index }));
  const highestRank = Math.max(...candidates.map(({ token }) => getLevelRank(token.level)));

  return candidates
    .filter(({ token }) => getLevelRank(token.level) === highestRank)
    .map(({ index }) => index);
}
