const path = require('path');

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ko'],
  },
  defaultNS: 'common',
  ns: ['common'],
  load: 'currentOnly',
  localePath: path.resolve('./public/locales'),
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};
