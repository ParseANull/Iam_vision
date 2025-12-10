module.exports = {
  default: {
    requireModule: [],
    require: [
      'tests/support/world.js',
      'tests/steps/**/*.js'
    ],
    paths: ['tests/features/**/*.feature'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json'
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    parallel: 1,
    publishQuiet: true,
    tags: 'not @skip'
  }
};
