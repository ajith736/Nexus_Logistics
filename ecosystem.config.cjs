module.exports = {
  apps: [
    {
      name: 'nexus-api',
      script: 'src/server.js',
      cwd: '.',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '400M',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
