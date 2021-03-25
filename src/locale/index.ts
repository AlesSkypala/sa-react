import i18next from 'i18next';
import EN_LANG from './en';

export type Translation = typeof EN_LANG;

export const t = i18next.t.bind(i18next);

export function loadTranslations() {
    i18next
        .init({
            lng: 'en',

            resources: {
                en: {
                    translation: EN_LANG
                }
            }
        });
}