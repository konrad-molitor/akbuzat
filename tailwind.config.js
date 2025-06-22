import {heroui} from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
            },
            spacing: {
                '84': '21rem',
            },
            colors: {
                background: 'var(--background-color)',
                text: 'var(--text-color)',
                'button-bg': 'var(--button-background-color)',
                'button-hover-border': 'var(--button-hover-border-color)',
                'link': 'var(--link-color)',
                'link-hover': 'var(--link-hover-color)',
                'star-link': 'var(--star-link-color)',
                'star-hover': 'var(--star-hover-color)',
                'panel-bg': 'var(--panel-background-color)',
                'panel-text': 'var(--panel-text-color)',
                'panel-button-bg': 'var(--panel-button-background-color)',
                'panel-button-hover-border': 'var(--panel-button-hover-border-color)',
                'panel-progress': 'var(--panel-progress-color)',
                'error-border': 'var(--error-border-color)',
                'user-message-bg': 'var(--user-message-background-color)',
                'user-message-text': 'var(--user-message-text-color)',
                'actions-block-bg': 'var(--actions-block-background-color)',
                'actions-block-border': 'var(--actions-block-border-color)',
                'code-block-bg': 'var(--code-block-background-color)',
                'update-badge-bg': 'var(--update-badge-background-color)',
                'update-badge-border': 'var(--update-badge-border-color)',
                'message-table-outline': 'var(--message-table-outline-color)',
                'message-table-bg': 'var(--message-table-background-color)',
                'message-table-even-bg': 'var(--message-table-even-background-color)',
                'message-hr': 'var(--message-hr-color)',
                'message-blockquote-border': 'var(--message-blockquote-border-color)',
            },
            boxShadow: {
                'panel': 'var(--panel-box-shadow)',
                'actions-block': 'var(--actions-block-box-shadow)',
                'update-badge': 'var(--update-badge-box-shadow)',
            },
            transitionTimingFunction: {
                'easing': 'var(--transition-easing)',
            },
            keyframes: {
                messageMarkdownActiveDot: {
                    '0%': { transform: 'scale(1)', opacity: '0.64' },
                    '50%': { transform: 'scale(1.4)', opacity: '0.32' },
                    '100%': { transform: 'scale(1)', opacity: '0.64' }
                }
            }
        }
    },
    darkMode: "class",
    plugins: [heroui()]
};

