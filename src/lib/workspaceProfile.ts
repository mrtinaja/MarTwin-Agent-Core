import { Activity, Binary, Database, FileText, LucideIcon } from "lucide-react";

export type WorkspaceSectionKey =
  | "requirements"
  | "workItems"
  | "qa"
  | "knowledge"
  | "prompts";

export type WorkspaceSection = {
  key: WorkspaceSectionKey;
  legacyKeys: string[];
  title: string;
  shortTitle: string;
  folder: string;
  extensions: string[];
  icon: LucideIcon;
};

export const workspaceProfile = {
  productName: "MarTwin",
  workspaceName: "IT Development Agent",
  domain: "Desarrollo IT general",
  assistantName: "AI Assistant",
  tagline: "Centro operativo para desarrollo, QA, documentación y automatización",
  sections: {
    requirements: {
      key: "requirements",
      legacyKeys: ["cotizaciones", "quotations"],
      title: "Requerimientos / Inputs",
      shortTitle: "Requerimientos",
      folder: "requirements",
      extensions: [".md", ".json", ".txt"],
      icon: Binary,
    },
    workItems: {
      key: "workItems",
      legacyKeys: ["migraciones", "migrations"],
      title: "Desarrollo / Artefactos",
      shortTitle: "Desarrollo",
      folder: "work",
      extensions: [".md", ".json", ".js", ".ts", ".tsx"],
      icon: Database,
    },
    qa: {
      key: "qa",
      legacyKeys: ["tests"],
      title: "Validación / QA",
      shortTitle: "QA",
      folder: "qa",
      extensions: [".md", ".json", ".txt"],
      icon: Activity,
    },
    knowledge: {
      key: "knowledge",
      legacyKeys: ["knowledge"],
      title: "Base de Conocimiento",
      shortTitle: "Conocimiento",
      folder: "knowledge",
      extensions: [".md", ".json", ".txt"],
      icon: FileText,
    },
    prompts: {
      key: "prompts",
      legacyKeys: ["prompts"],
      title: "Prompts / Instrucciones",
      shortTitle: "Prompts",
      folder: "prompts",
      extensions: [".md", ".txt"],
      icon: FileText,
    },
  } satisfies Record<WorkspaceSectionKey, WorkspaceSection>,
};

export const workspaceSectionList = Object.values(workspaceProfile.sections);

