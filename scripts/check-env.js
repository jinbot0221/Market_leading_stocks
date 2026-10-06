const path = require('node:path');
const { loadEnv } = require('../lib/load-env');

const PLACEHOLDER_PATTERN = /여기에|실제_|발급받은|your[_-]?/i;

function validateConfig(env) {
  const issues = [];
  const clientId = env.TOSS_CLIENT_ID?.trim();
  const clientSecret = env.TOSS_CLIENT_SECRET?.trim();

  if (!clientId) issues.push('TOSS_CLIENT_ID가 없습니다.');
  else if (PLACEHOLDER_PATTERN.test(clientId)) issues.push('TOSS_CLIENT_ID가 예제 문구입니다. 실제 발급값으로 바꿔주세요.');
  if (!clientSecret) issues.push('TOSS_CLIENT_SECRET이 없습니다.');
  else if (PLACEHOLDER_PATTERN.test(clientSecret)) issues.push('TOSS_CLIENT_SECRET이 예제 문구입니다. 실제 발급값으로 바꿔주세요.');

  return { valid: issues.length === 0, issues };
}

function run() {
  const envPath = path.join(__dirname, '..', '.env');
  const loaded = loadEnv(envPath);
  if (!loaded) {
    console.error('❌ 프로젝트 최상위 폴더에 .env 파일이 없습니다.');
    process.exitCode = 1;
    return;
  }

  const result = validateConfig(process.env);
  if (!result.valid) {
    result.issues.forEach((issue) => console.error(`❌ ${issue}`));
    process.exitCode = 1;
    return;
  }

  console.log('✅ .env 파일과 토스증권 인증 변수 형식이 정상입니다.');
  console.log('   실제 값은 보안을 위해 출력하지 않았습니다.');
}

if (require.main === module) run();

module.exports = { validateConfig };
