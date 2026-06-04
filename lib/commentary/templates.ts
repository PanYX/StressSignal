import type { CommentaryBranch, CommentaryDecision } from "./rules";
import {
  getDictionary,
  type Dictionary,
} from "../i18n/dictionary";
import { DEFAULT_LOCALE } from "../i18n/locales";

type CommentarySection = {
  title: string;
  body: string;
};

const getBranchTexts = (dictionary: Dictionary): Record<CommentaryBranch, CommentarySection> => ({
  equity_only_warming: {
    title: dictionary.commentary.branches.equity_only_warming.title,
    body: dictionary.commentary.branches.equity_only_warming.body,
  },
  broad_equity_warming: {
    title: dictionary.commentary.branches.broad_equity_warming.title,
    body: dictionary.commentary.branches.broad_equity_warming.body,
  },
  system_pressure_warming: {
    title: dictionary.commentary.branches.system_pressure_warming.title,
    body: dictionary.commentary.branches.system_pressure_warming.body,
  },
  term_structure_inversion: {
    title: dictionary.commentary.branches.term_structure_inversion.title,
    body: dictionary.commentary.branches.term_structure_inversion.body,
  },
});

export interface RenderedCommentary {
  headline: string;
  summary: string;
  details: string[];
  branches: CommentaryBranch[];
  missing: string[];
}

const formatMissing = (missing: string[], dictionary: Dictionary): string | null => {
  if (missing.length === 0) {
    return null;
  }

  return dictionary.commentary.missingSentence.replace("{missing}", missing.join(", "));
};

export function renderCommentary(
  decision: CommentaryDecision,
  dictionary: Dictionary = getDictionary(DEFAULT_LOCALE),
): RenderedCommentary {
  if (decision.branches.length === 0) {
    const missingSentence = formatMissing(decision.missing, dictionary);
    const summary =
      missingSentence === null
        ? dictionary.commentary.noPatternSummary
        : `${dictionary.commentary.noPatternSummary} ${missingSentence}`;

    return {
      headline: dictionary.commentary.noPatternHeadline,
      summary,
      details: [],
      branches: [],
      missing: decision.missing,
    };
  }

  const branchTexts = getBranchTexts(dictionary);
  const sections = decision.branches.map((branch) => branchTexts[branch]);
  const headline = sections[0]!.title;
  const missingSentence = formatMissing(decision.missing, dictionary);
  const details = sections.map((section) => section.body);
  const summary = missingSentence === null
    ? details.join(" ")
    : `${details.join(" ")} ${missingSentence}`;

  return {
    headline,
    summary,
    details: missingSentence === null ? details : [...details, missingSentence],
    branches: decision.branches,
    missing: decision.missing,
  };
}
