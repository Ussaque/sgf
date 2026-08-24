module.exports = {
    apps: [
        {
            name: 'moz-billing-api',
            script: 'dist/index.js',
            cwd: __dirname,
            instances: 1,
            autorestart: true,
            watch: false,
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
