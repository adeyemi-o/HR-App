export type AITask =
    | "summary"
    | "ranking"
    | "offer_letter"
    | "onboarding_logic"
    | "wp_validation"
    | "embedding"
    | "general_chat"
    | "setup_helper";

export const AI_MODELS = {
    DEFAULT_CHAT: "@cf/meta/llama-4-scout-17b-16e-instruct",
    REASONING: "@cf/deepseek/deepseek-r1-distill-qwen-32b",
    EMBEDDING: "@cf/baai/bge-large-en-v1.5",
};

export function getModelForTask(task: AITask): string {
    switch (task) {
        case "ranking":
        case "onboarding_logic":
        case "wp_validation":
            return AI_MODELS.REASONING;
        case "embedding":
            return AI_MODELS.EMBEDDING;
        case "summary":
        case "offer_letter":
        case "general_chat":
        case "setup_helper":
        default:
            return AI_MODELS.DEFAULT_CHAT;
    }
}
