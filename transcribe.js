const path = require('path');
const { nodewhisper } = require('nodejs-whisper');

(async () => {
  await nodewhisper(path.resolve(__dirname, 'yourAudio.wav'), {
    modelName: 'base.en',
    autoDownloadModelName: 'base.en',
    wordTimestamps: true
  });
})();
