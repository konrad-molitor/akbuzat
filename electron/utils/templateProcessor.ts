import os from "node:os";

/**
 * Processes template variables in a string and replaces them with actual values
 */
export function processTemplateVariables(text: string): string {
    const now = new Date();
    
    // Template variable replacements
    const replacements: Record<string, string> = {
        '{{DATE}}': now.toLocaleDateString(),
        '{{TIME}}': now.toLocaleTimeString(),
        '{{DATETIME}}': now.toLocaleString(),
        '{{USERNAME}}': getUsername(),
        '{{FILENAME}}': 'untitled' // Default filename, can be customized later
    };
    
    let processedText = text;
    
    // Replace all template variables
    Object.entries(replacements).forEach(([template, value]) => {
        const regex = new RegExp(template.replace(/[{}]/g, '\\$&'), 'g');
        processedText = processedText.replace(regex, value);
    });
    
    return processedText;
}

/**
 * Gets the current username from the system
 */
function getUsername(): string {
    try {
        const userInfo = os.userInfo();
        return userInfo.username || 'User';
    } catch (error) {
        console.warn('Failed to get username:', error);
        return 'User';
    }
}

/**
 * Validates if a template variable exists in the text
 */
export function hasTemplateVariables(text: string): boolean {
    const templatePattern = /\{\{[A-Z_]+\}\}/g;
    return templatePattern.test(text);
}

/**
 * Gets all template variables found in the text
 */
export function getTemplateVariables(text: string): string[] {
    const templatePattern = /\{\{[A-Z_]+\}\}/g;
    const matches = text.match(templatePattern);
    return matches ? [...new Set(matches)] : [];
} 