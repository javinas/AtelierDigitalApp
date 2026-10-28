import { Platform } from 'react-native';

export const typography = {
    serif: Platform.select({
        web: "Georgia, 'Didot', 'Bodoni MT', 'Times New Roman', serif",
        ios: 'Georgia',
        android: 'serif',
        default: 'serif',
    }),
    sans: Platform.select({
        web: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        ios: 'System',
        android: 'sans-serif',
        default: 'sans-serif',
    }),
};
