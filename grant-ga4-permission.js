/**
 * Google Analytics Admin API를 사용하여 Service Account에 Property 접근 권한 부여
 * 
 * 필요 사항:
 * 1. Google Analytics Admin API 활성화
 * 2. OAuth 2.0 클라이언트 또는 본인의 Google 계정 인증
 * 3. Service Account 이메일
 * 4. GA4 Property ID
 */

const { google } = require('googleapis');
const readline = require('readline');

// 설정
const CONFIG = {
  serviceAccountEmail: 'hokex-analytics@hokex-498415.iam.gserviceaccount.com',
  propertyId: '538348093', // GA4 Property ID (숫자만)
  role: 'predefinedRoles/read', // 읽기 전용 권한
};

// OAuth2 스코프
const SCOPES = ['https://www.googleapis.com/auth/analytics.edit'];

/**
 * OAuth2 클라이언트 인증
 * 
 * 이 함수는 브라우저를 통해 Google 계정으로 로그인하고 권한을 부여받습니다.
 */
async function authorize() {
  const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ OAuth 클라이언트 정보가 없습니다.');
    console.log(`
OAuth 2.0 클라이언트 생성 방법:

1. Google Cloud Console 접속:
   https://console.cloud.google.com/apis/credentials?project=hokex-498415

2. "사용자 인증 정보 만들기" → "OAuth 클라이언트 ID" 클릭

3. 애플리케이션 유형: "데스크톱 앱" 선택
   이름: "GA4 권한 부여 스크립트"

4. "만들기" 클릭 후 JSON 다운로드

5. JSON 파일에서 다음 값 복사:
   - client_id
   - client_secret

6. 환경 변수 설정:
   Windows CMD:
     set CLIENT_ID=your_client_id
     set CLIENT_SECRET=your_client_secret
     node grant-ga4-permission.js

   Windows PowerShell:
     $env:CLIENT_ID="your_client_id"
     $env:CLIENT_SECRET="your_client_secret"
     node grant-ga4-permission.js
`);
    process.exit(1);
  }

  const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob'
  );

  // 인증 URL 생성
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n🔐 다음 URL을 브라우저에서 열어 권한을 부여하세요:');
  console.log(authUrl);
  console.log('\n인증 후 표시되는 코드를 아래에 입력하세요:');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('코드 입력: ', async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        console.log('✅ 인증 성공!\n');
        resolve(oAuth2Client);
      } catch (error) {
        console.error('❌ 인증 실패:', error.message);
        reject(error);
      }
    });
  });
}

/**
 * Service Account에 GA4 Property 접근 권한 부여
 */
async function grantPermission(auth) {
  const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth });

  try {
    console.log('📊 GA4 Property 정보 확인 중...\n');

    // Property 정보 확인
    const property = await analyticsAdmin.properties.get({
      name: `properties/${CONFIG.propertyId}`,
    });

    console.log('✅ Property 정보:');
    console.log(`  - 이름: ${property.data.displayName}`);
    console.log(`  - ID: ${CONFIG.propertyId}`);
    console.log(`  - 시간대: ${property.data.timeZone}\n`);

    console.log('👤 Service Account 권한 부여 중...\n');

    // UserLink 생성 (Property에 사용자 추가)
    const userLink = await analyticsAdmin.properties.userLinks.create({
      parent: `properties/${CONFIG.propertyId}`,
      requestBody: {
        emailAddress: CONFIG.serviceAccountEmail,
        directRoles: [CONFIG.role],
      },
    });

    console.log('✅ 권한 부여 성공!');
    console.log(`  - Email: ${CONFIG.serviceAccountEmail}`);
    console.log(`  - Role: ${CONFIG.role}`);
    console.log(`  - User Link: ${userLink.data.name}\n`);

    console.log('🎉 완료! 이제 Edge Function을 테스트하세요.\n');

  } catch (error) {
    console.error('\n❌ 권한 부여 실패:', error.message);

    if (error.code === 403) {
      console.log(`
💡 해결 방법:

1. Google Analytics 계정에 "관리자" 권한이 있는지 확인
   - https://analytics.google.com/
   - 관리 → 속성 액세스 관리
   - 본인 계정에 "관리자" 역할이 있어야 함

2. Google Analytics Admin API가 활성화되었는지 확인:
   https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com?project=hokex-498415

3. OAuth 클라이언트가 올바른 프로젝트에서 생성되었는지 확인
`);
    } else if (error.code === 404) {
      console.log(`
💡 Property ID를 확인하세요:

현재 설정: ${CONFIG.propertyId}

올바른 Property ID 확인:
1. https://analytics.google.com/ 접속
2. 관리 → 속성 설정
3. "속성 ID" 확인 (숫자만)
`);
    } else if (error.message.includes('already exists')) {
      console.log(`
✅ Service Account가 이미 추가되어 있습니다!

권한 확인:
1. https://analytics.google.com/ 접속
2. 관리 → 속성 액세스 관리
3. ${CONFIG.serviceAccountEmail} 검색
4. 역할: "뷰어" 이상이어야 함
`);
    } else {
      console.log(`
전체 에러:
${JSON.stringify(error, null, 2)}
`);
    }

    process.exit(1);
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Google Analytics Service Account 권한 부여 스크립트      ║
╚════════════════════════════════════════════════════════════╝

설정:
  - Service Account: ${CONFIG.serviceAccountEmail}
  - GA4 Property ID: ${CONFIG.propertyId}
  - 권한: ${CONFIG.role}

`);

  try {
    const auth = await authorize();
    await grantPermission(auth);
  } catch (error) {
    console.error('\n❌ 실행 실패:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
main();
