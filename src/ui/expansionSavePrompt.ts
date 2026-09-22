// Keep browser prompt construction in the UI layer. The account adapter accepts
// this interface so its ownership/transport behavior stays DOM-independent.
export { createDomPromptHost as createExpansionSavePrompt } from "@gridwatch/account-kit";
