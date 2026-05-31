module.exports = {
    testEnvironment: 'jsdom',
    testMatch: ['**/tests/**/*.test.js'],
    verbose: true,
    collectCoverageFrom: [
        'client/**/*.js',
        '!client/index.html'
    ],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/client/$1'
    }
};
