"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast, errorToast } from "@/hooks/use-toast";
import { gapAnalysisMutations } from "@/services/gap-analysis/handler/gap-analysis.queries";
import type {
  GapAnalysisRequest,
  ReusableAnalysis,
  SetupDraft,
  SetupSuggestion,
  TableMapping,
} from "@/services/gap-analysis/type/gap-analysis.type";
import {
  approvedRequirements,
  documentsInFolders,
  initiallyOn,
  searchedFolderIds,
  suggestedFolderKeys,
} from "../lib/setup";

/** Where the drawer is: writing the goal, choosing the rule file and folders, or reading the list. */
export type SetupStage = "goal" | "scope" | "review";

/** What a run is started with, plus what the drawer shows while it runs. */
export interface SetupRun {
  body: GapAnalysisRequest;
  frameworkName: string;
  documentIds: string[];
}

/**
 * Starting an analysis from one sentence (MS-1114). The user's four decisions, in order: the goal
 * (the AI then suggests the rule file and folders), the folders, reading the drafted requirement
 * list, and starting. Reusing a rule set an earlier analysis holds skips the draft: its list is
 * already approved.
 */
export function useAnalysisSetup() {
  const { toast } = useToast();
  const suggestMutation = useMutation(gapAnalysisMutations.suggestSetup());
  const draftMutation = useMutation(gapAnalysisMutations.draftRequirements());

  const [goal, setGoal] = useState("");
  const [suggestion, setSuggestion] = useState<SetupSuggestion | null>(null);
  const [ruleFileId, setRuleFileId] = useState<string | null>(null);
  const [folders, setFolders] = useState<string[]>([]);
  const [draft, setDraft] = useState<SetupDraft | null>(null);
  const [on, setOn] = useState<ReadonlySet<string>>(new Set());
  const [reused, setReused] = useState<ReusableAnalysis | null>(null);

  const stage: SetupStage = !suggestion ? "goal" : draft && !reused ? "review" : "scope";
  const ruleFile = suggestion?.rule_files.find((f) => f.collection_id === ruleFileId) ?? null;
  const referenceId = reused ? reused.reference_collection_ids[0] ?? null : ruleFileId;
  const documentIds = suggestion ? documentsInFolders(suggestion.folders, folders, referenceId) : [];

  const reset = () => {
    setGoal("");
    setSuggestion(null);
    setRuleFileId(null);
    setFolders([]);
    setDraft(null);
    setOn(new Set());
    setReused(null);
  };

  /** Decision 1: the goal. The AI answers with a rule file and folders, all of which can be changed. */
  const suggest = (text: string, reuse: ReusableAnalysis | null = null) =>
    suggestMutation.mutateAsync(text).then(
      (result) => {
        setGoal(text);
        setSuggestion(result);
        setReused(reuse);
        setRuleFileId(result.rule_file?.collection_id ?? null);
        // A reused rule set starts from its own folders; a new goal from the AI's.
        const own = reuse?.target_folder_ids.filter((id) => result.folders.some((f) => f.folder_id === id));
        setFolders(own?.length ? own : suggestedFolderKeys(result.folders));
        setDraft(null);
      },
      (err: unknown) => toast(errorToast("Couldn't look for your rule file and documents", err)),
    );

  /** Decision 3 starts here: the requirement list, from the rule file (or with the user's columns). */
  const loadDraft = (mapping?: TableMapping) => {
    if (!ruleFile) return Promise.resolve();
    return draftMutation
      .mutateAsync({ goal, collection_id: ruleFile.collection_id, file_name: ruleFile.file_name, mapping: mapping ?? null })
      .then(
        (result) => {
          setDraft(result);
          setOn(initiallyOn(result.requirements));
        },
        (err: unknown) => toast(errorToast("Couldn't read the requirements", err)),
      );
  };

  const toggleFolder = (key: string) =>
    setFolders((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));

  const toggleRequirement = (key: string) =>
    setOn((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const chooseRuleFile = (id: string) => {
    setRuleFileId(id);
    setDraft(null);
  };

  /** Decision 4: start. Null when something the run needs is not chosen yet. */
  const runRequest = (): SetupRun | null => {
    if (!referenceId || documentIds.length === 0) return null;
    const base = {
      skill_id: "compliance_gap_check" as const,
      reference_collection_ids: [referenceId],
      target_collection_ids: documentIds,
      target_folder_ids: searchedFolderIds(folders),
      goal,
    };
    if (reused) {
      return {
        body: { ...base, framework_name: reused.framework_name, analysis_id: reused.analysis_id },
        frameworkName: reused.framework_name,
        documentIds,
      };
    }
    if (!draft) return null;
    const requirements = approvedRequirements(draft.requirements, on);
    if (requirements.length === 0) return null;
    return {
      body: { ...base, framework_name: draft.framework_name, requirements },
      frameworkName: draft.framework_name,
      documentIds,
    };
  };

  return {
    stage,
    goal,
    suggestion,
    ruleFile,
    folders,
    documentIds,
    draft,
    on,
    reused,
    suggesting: suggestMutation.isPending,
    drafting: draftMutation.isPending,
    suggest,
    loadDraft,
    toggleFolder,
    toggleRequirement,
    setAllRequirements: (all: boolean) => setOn(new Set(all && draft ? draft.requirements.map((r) => r.key) : [])),
    chooseRuleFile,
    backToGoal: () => setSuggestion(null),
    backToScope: () => setDraft(null),
    runRequest,
    reset,
  };
}

export type AnalysisSetup = ReturnType<typeof useAnalysisSetup>;
