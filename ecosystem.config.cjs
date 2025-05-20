//для установления времени Братислава на AWS
module.exports = {
  apps: [
    {
      name: "callCenterServer",
      script: "./app.js",
      env: {
        NODE_ENV: "production",
        TZ: "Europe/Bratislava",
      },
    },
  ],
};
