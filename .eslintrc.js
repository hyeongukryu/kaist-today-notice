module.exports = {
    env: {
        browser: true,
        es2022: true,
    },
    extends: [
        'airbnb-base',
        'eslint:recommended',
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:import/typescript',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
    },
    plugins: [
        '@typescript-eslint',
    ],
    rules: {
        indent: ['error', 4],
        'import/extensions': [
            'error',
            'ignorePackages',
            {
                ts: 'never',
            },
        ],
    },
};
